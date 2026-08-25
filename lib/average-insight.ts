import type { CelsiusScoutAnalysis, ScoutedLocation } from "./types";

export interface AverageMaskingSummary {
  representativeMeanC: number;
  coolestMeanC: number;
  hottestMeanC: number;
  spatialMeanRangeC: number;
  tileHoursAboveThresholdPercent: number;
  hotterThanRepresentativeCount: number;
  coolerThanRepresentativeCount: number;
  hottestLocation: ScoutedLocation;
  coolestLocation: ScoutedLocation;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * A deterministic cohort summary that makes a single broad mean comparable
 * with the full set of time-weighted local profiles.
 */
export function summarizeAverageMasking(
  analysis: CelsiusScoutAnalysis,
): AverageMaskingSummary {
  if (!analysis.locations.length) throw new Error("Average masking requires at least one location");

  const byMean = [...analysis.locations].sort(
    (a, b) =>
      a.features.meanTemperatureC - b.features.meanTemperatureC ||
      a.id.localeCompare(b.id),
  );
  const coolestLocation = byMean[0];
  const hottestLocation = byMean.at(-1) as ScoutedLocation;
  const representativeMeanC =
    analysis.locations.reduce(
      (sum, location) => sum + location.features.meanTemperatureC,
      0,
    ) / analysis.locations.length;
  const totalObservedHours = analysis.locations.reduce(
    (sum, location) => sum + location.features.observedDurationHours,
    0,
  );
  const totalExceedanceHours = analysis.locations.reduce(
    (sum, location) => sum + location.features.totalExceedanceHours,
    0,
  );

  return {
    representativeMeanC: round(representativeMeanC),
    coolestMeanC: round(coolestLocation.features.meanTemperatureC),
    hottestMeanC: round(hottestLocation.features.meanTemperatureC),
    spatialMeanRangeC: round(
      hottestLocation.features.meanTemperatureC -
        coolestLocation.features.meanTemperatureC,
    ),
    tileHoursAboveThresholdPercent: round(
      totalObservedHours === 0 ? 0 : (totalExceedanceHours / totalObservedHours) * 100,
    ),
    hotterThanRepresentativeCount: analysis.locations.filter(
      (location) => location.features.meanTemperatureC > representativeMeanC,
    ).length,
    coolerThanRepresentativeCount: analysis.locations.filter(
      (location) => location.features.meanTemperatureC < representativeMeanC,
    ).length,
    hottestLocation,
    coolestLocation,
  };
}
