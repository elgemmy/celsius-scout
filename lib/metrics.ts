import { elapsedHours } from "./thermal-model";
import type {
  ApparentTemperatureMethod,
  ThermalFeatures,
  ThermalLocation,
  ThermalSample,
} from "./types";

interface ResolvedApparentTemperature {
  value: number | null;
  method: Exclude<ApparentTemperatureMethod, "mixed">;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function intervalHours(samples: ThermalSample[], index: number): number {
  return elapsedHours(samples[index].timestamp, samples[index + 1].timestamp);
}

function integrateTrapezoids(samples: ThermalSample[], value: (sample: ThermalSample) => number): number {
  let area = 0;
  for (let index = 0; index < samples.length - 1; index += 1) {
    const duration = intervalHours(samples, index);
    area += duration * (value(samples[index]) + value(samples[index + 1])) / 2;
  }
  return area;
}

/**
 * Australian Bureau of Meteorology apparent-temperature formula (shade):
 * AT = Ta + 0.33e - 0.70ws - 4.00, where e is water-vapour pressure.
 */
export function deriveBomApparentTemperatureC(
  temperatureC: number,
  relativeHumidityPercent: number,
  windSpeedMps: number,
): number {
  const vaporPressure =
    (relativeHumidityPercent / 100) *
    6.105 *
    Math.exp((17.27 * temperatureC) / (237.7 + temperatureC));
  return round(temperatureC + 0.33 * vaporPressure - 0.7 * windSpeedMps - 4, 3);
}

export function resolveApparentTemperature(sample: ThermalSample): ResolvedApparentTemperature {
  if (sample.apparentTemperatureC !== undefined) {
    return { value: sample.apparentTemperatureC, method: "provided" };
  }
  if (sample.relativeHumidityPercent !== undefined && sample.windSpeedMps !== undefined) {
    return {
      value: deriveBomApparentTemperatureC(
        sample.temperatureC,
        sample.relativeHumidityPercent,
        sample.windSpeedMps,
      ),
      method: "bom-derived",
    };
  }
  return { value: null, method: "unavailable" };
}

/** Duration during which a linearly interpolated interval is strictly above threshold. */
export function durationAboveThresholdHours(
  startValue: number,
  endValue: number,
  durationHours: number,
  threshold: number,
): number {
  if (durationHours <= 0) throw new Error("Interval duration must be positive");
  if (startValue > threshold && endValue > threshold) return durationHours;
  if (startValue <= threshold && endValue <= threshold) return 0;

  const crossingFraction = (threshold - startValue) / (endValue - startValue);
  return startValue > threshold
    ? durationHours * crossingFraction
    : durationHours * (1 - crossingFraction);
}

/** Integral of degrees above threshold, assuming linear change inside the interval. */
export function degreeHoursAboveThreshold(
  startValue: number,
  endValue: number,
  durationHours: number,
  threshold: number,
): number {
  const startExcess = startValue - threshold;
  const endExcess = endValue - threshold;
  if (startExcess <= 0 && endExcess <= 0) return 0;
  if (startExcess >= 0 && endExcess >= 0) {
    return durationHours * (startExcess + endExcess) / 2;
  }
  const aboveDuration = durationAboveThresholdHours(
    startValue,
    endValue,
    durationHours,
    threshold,
  );
  const positiveEndpoint = Math.max(startExcess, endExcess);
  return aboveDuration * positiveEndpoint / 2;
}

function recoverySlopeCPerHour(samples: ThermalSample[], peakIndex: number): number | null {
  const afterPeak = samples.slice(peakIndex);
  // A peak plus at least two later samples prevents a one-step drop from
  // masquerading as a stable recovery trend.
  if (afterPeak.length < 3) return null;

  const points = afterPeak.map((sample) => ({
    x: elapsedHours(afterPeak[0].timestamp, sample.timestamp),
    y: sample.temperatureC,
  }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator === 0) return null;
  return Math.max(0, -(numerator / denominator));
}

function combineApparentMethods(methods: ApparentTemperatureMethod[]): ApparentTemperatureMethod {
  return new Set(methods).size === 1 ? methods[0] : "mixed";
}

function quantile(values: number[], probability: number): number {
  if (!values.length) throw new Error("Quantile requires at least one value");
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower + 1] === undefined
    ? sorted[lower]
    : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

/** Pure, interval-aware feature calculation for one normalized location. */
export function calculateBaseThermalFeatures(
  location: ThermalLocation,
  thresholdC: number,
): Omit<ThermalFeatures, "localDeviationC" | "neighborCount"> {
  const { samples } = location;
  if (samples.length < 2) throw new Error("At least two samples are required");
  const observedDurationHours = elapsedHours(
    samples[0].timestamp,
    samples[samples.length - 1].timestamp,
  );
  if (observedDurationHours <= 0) throw new Error("Samples must be in ascending timestamp order");

  let peakIndex = 0;
  for (let index = 1; index < samples.length; index += 1) {
    // Keep the earliest observation when a peak ties.
    if (samples[index].temperatureC > samples[peakIndex].temperatureC) peakIndex = index;
  }

  let totalExceedanceHours = 0;
  let currentPersistenceHours = 0;
  let longestPersistenceHours = 0;
  let excessDegreeHours = 0;
  const changeRates: number[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const duration = intervalHours(samples, index);
    const aboveDuration = durationAboveThresholdHours(
      samples[index].temperatureC,
      samples[index + 1].temperatureC,
      duration,
      thresholdC,
    );
    totalExceedanceHours += aboveDuration;
    const startsAbove = samples[index].temperatureC > thresholdC;
    const endsAbove = samples[index + 1].temperatureC > thresholdC;
    if (startsAbove && endsAbove) {
      currentPersistenceHours += duration;
    } else if (!startsAbove && endsAbove) {
      currentPersistenceHours = aboveDuration;
    } else if (startsAbove && !endsAbove) {
      currentPersistenceHours += aboveDuration;
      longestPersistenceHours = Math.max(longestPersistenceHours, currentPersistenceHours);
      currentPersistenceHours = 0;
    } else {
      longestPersistenceHours = Math.max(longestPersistenceHours, currentPersistenceHours);
      currentPersistenceHours = 0;
    }
    excessDegreeHours += degreeHoursAboveThreshold(
      samples[index].temperatureC,
      samples[index + 1].temperatureC,
      duration,
      thresholdC,
    );
    changeRates.push((samples[index + 1].temperatureC - samples[index].temperatureC) / duration);
  }
  longestPersistenceHours = Math.max(longestPersistenceHours, currentPersistenceHours);

  const apparent = samples.map(resolveApparentTemperature);
  const meanTemperatureC =
    integrateTrapezoids(samples, (sample) => sample.temperatureC) / observedDurationHours;
  const hasCompleteApparentSeries = apparent.every((item) => item.value !== null);
  const apparentSamples = hasCompleteApparentSeries
    ? samples.map((sample, index) => ({ ...sample, apparentTemperatureC: apparent[index].value as number }))
    : null;
  const meanApparentTemperatureC = apparentSamples
    ? integrateTrapezoids(apparentSamples, (sample) => sample.apparentTemperatureC as number) /
      observedDurationHours
    : null;
  const peak = samples[peakIndex];
  const recoveryRate = recoverySlopeCPerHour(samples, peakIndex);
  const recoveryWindowHours = recoveryRate === null
    ? null
    : elapsedHours(peak.timestamp, samples[samples.length - 1].timestamp);

  return {
    observedDurationHours: round(observedDurationHours),
    peakTemperatureC: round(peak.temperatureC),
    peakTimestamp: peak.timestamp,
    peakOffsetHours: round(elapsedHours(samples[0].timestamp, peak.timestamp)),
    meanTemperatureC: round(meanTemperatureC),
    totalExceedanceHours: round(totalExceedanceHours),
    longestPersistenceHours: round(longestPersistenceHours),
    degreeHoursAboveThresholdC: round(excessDegreeHours),
    recoveryRateCPerHour: recoveryRate === null ? null : round(recoveryRate),
    recoveryWindowHours: recoveryWindowHours === null ? null : round(recoveryWindowHours),
    temporalVariabilityIqrCPerHour: (() => {
      const rateChanges = changeRates.slice(1).map((rate, index) => rate - changeRates[index]);
      return rateChanges.length < 2
        ? 0
        : round(quantile(rateChanges, 0.75) - quantile(rateChanges, 0.25));
    })(),
    meanApparentTemperatureC:
      meanApparentTemperatureC === null ? null : round(meanApparentTemperatureC),
    apparentTemperatureMethod: hasCompleteApparentSeries
      ? combineApparentMethods(apparent.map((item) => item.method))
      : "unavailable",
    peakToMeanGapC: round(peak.temperatureC - meanTemperatureC),
  };
}

export function withLocalDeviation(
  base: Omit<ThermalFeatures, "localDeviationC" | "neighborCount">,
  sameHourDeviations: number[],
  neighborCount: number,
): ThermalFeatures {
  return {
    ...base,
    // Two neighbors are the minimum for a meaningful local median comparison.
    localDeviationC:
      neighborCount < 2 || !sameHourDeviations.length
        ? null
        : round(quantile(sameHourDeviations, 0.5)),
    neighborCount,
  };
}
