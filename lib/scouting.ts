import type {
  CelsiusScoutAnalysis,
  MetricEvidence,
  ScoutedLocation,
  ScoutToolContext,
  ScoutToolResult,
  ThermalFeatures,
} from "./types";

function context(analysis: CelsiusScoutAnalysis): ScoutToolContext {
  return {
    cohortId: analysis.cohort.id,
    cohortName: analysis.cohort.name,
    cohortSize: analysis.cohort.locationCount,
    thresholdC: analysis.cohort.thresholdC,
    sourceLabel: analysis.cohort.source.label,
    isSynthetic: analysis.cohort.source.kind === "synthetic",
  };
}

function result<T>(
  analysis: CelsiusScoutAnalysis,
  tool: string,
  question: string,
  answer: string,
  data: T,
  evidence: MetricEvidence[],
  toolMethodology: string,
): ScoutToolResult<T> {
  return {
    tool,
    question,
    answer,
    data,
    evidence,
    context: context(analysis),
    methodology: [...analysis.methodology, toolMethodology],
  };
}

function byId(analysis: CelsiusScoutAnalysis, id: string): ScoutedLocation {
  const location = analysis.locations.find((candidate) => candidate.id === id);
  if (!location) throw new Error(`Unknown location id: ${id}`);
  return location;
}

function rankEvidence(rank: number, name: string): MetricEvidence {
  return {
    metric: "rank",
    label: `${name} selection rank`,
    value: rank,
    interpretation: "deterministic rank for this tool's stated objective",
  };
}

function scoreEvidence(
  metric: "peak" | "stamina" | "recovery" | "comfort" | "chaos" | "surprise" | "latePeak" | "heatPressure",
  label: string,
  value: number,
  interpretation: string,
): MetricEvidence {
  return { metric, label, value, unit: "cohort percentile", interpretation };
}

function featureEvidence(
  metric: keyof ThermalFeatures,
  label: string,
  value: number,
  unit: string,
  interpretation: string,
): MetricEvidence {
  return { metric, label, value, unit, interpretation };
}

export function findCoolestLineup(
  analysis: CelsiusScoutAnalysis,
  count = 5,
): ScoutToolResult<Array<{ rank: number; selectionScore: number; location: ScoutedLocation }>> {
  if (!Number.isInteger(count) || count < 1) throw new Error("Lineup count must be a positive integer");
  const useComfort = analysis.locations.every((location) => location.scores.comfort !== null);
  const ranked = analysis.locations
    .map((location) => ({
      location,
      selectionScore: Math.round(
        useComfort
          ? (location.scores.comfort as number) * 0.45 +
              (100 - location.scores.peak) * 0.3 +
              (100 - location.scores.stamina) * 0.25
          : (100 - location.scores.peak) * 0.55 +
              (100 - location.scores.stamina) * 0.45,
      ),
    }))
    .sort(
      (a, b) =>
        b.selectionScore - a.selectionScore ||
        (useComfort
          ? (b.location.scores.comfort as number) - (a.location.scores.comfort as number)
          : a.location.scores.heatPressure - b.location.scores.heatPressure) ||
        a.location.id.localeCompare(b.location.id),
    )
    .slice(0, Math.min(count, analysis.locations.length))
    .map((item, index) => ({ rank: index + 1, ...item }));
  const evidence = ranked.flatMap(({ rank, location }) => [
    rankEvidence(rank, location.name),
    ...(useComfort
      ? [scoreEvidence("comfort", `${location.name} Comfort`, location.scores.comfort as number, "lower apparent temperature ranks higher")]
      : []),
    scoreEvidence("peak", `${location.name} Peak`, location.scores.peak, "relative peak severity"),
    scoreEvidence("stamina", `${location.name} Stamina`, location.scores.stamina, "relative longest persistence"),
  ]);
  return result(
    analysis,
    "find_coolest_lineup",
    `Build the coolest ${count}-location lineup.`,
    ranked.map((item) => item.location.name).join(", "),
    ranked,
    evidence,
    useComfort
      ? "Complete cohort Comfort is available: lineup score = 45% Comfort + 30% inverse Peak + 25% inverse Stamina; ties break by Comfort then stable location id."
      : "Comfort is not complete for this cohort: lineup score = 55% inverse Peak + 45% inverse Stamina; ties break by inverse Heat Pressure then stable location id.",
  );
}

export function findBiggestThermalFraud(
  analysis: CelsiusScoutAnalysis,
): ScoutToolResult<{ location: ScoutedLocation }> {
  const location = [...analysis.locations].sort(
    (a, b) =>
      b.features.peakToMeanGapC - a.features.peakToMeanGapC ||
      b.scores.heatPressure - a.scores.heatPressure ||
      a.id.localeCompare(b.id),
  )[0];
  return result(
    analysis,
    "find_biggest_thermal_fraud",
    "Find the location whose average hides the largest peak.",
    `${location.name} has the cohort's largest peak-to-mean gap.`,
    { location },
    [
      featureEvidence("peakToMeanGapC", "Peak-to-mean gap", location.features.peakToMeanGapC, "°C", "largest gap in the active cohort"),
      featureEvidence("peakTemperatureC", "Observed peak", location.features.peakTemperatureC, "°C", "measured maximum in this window"),
      featureEvidence("meanTemperatureC", "Time-weighted mean", location.features.meanTemperatureC, "°C", "trapezoidal time-weighted mean"),
    ],
    "Ranks descending peak-to-mean gap, then Heat Pressure, then stable location id. 'Fraud' is playful shorthand for average masking, not deception.",
  );
}

export function findUnderratedCoolLocation(
  analysis: CelsiusScoutAnalysis,
): ScoutToolResult<{ location: ScoutedLocation }> {
  const candidates = analysis.locations.filter(
    (location) => location.features.localDeviationC !== null && location.features.localDeviationC < 0,
  );
  if (!candidates.length) throw new Error("No location is cooler than its local same-hour neighbor median");
  const location = [...candidates].sort(
    (a, b) =>
      (a.features.localDeviationC as number) - (b.features.localDeviationC as number) ||
      (b.scores.comfort ?? -1) - (a.scores.comfort ?? -1) ||
      a.id.localeCompare(b.id),
  )[0];
  return result(
    analysis,
    "find_underrated_cool_location",
    "Find a location that runs unexpectedly cool relative to its neighbors.",
    `${location.name} has the strongest cool-side local deviation.`,
    { location },
    [
      featureEvidence("localDeviationC", "Local deviation", location.features.localDeviationC as number, "°C", "median signed difference from same-hour neighbor medians; negative is cooler"),
      ...(location.scores.comfort === null
        ? []
        : [scoreEvidence("comfort", "Comfort", location.scores.comfort, "lower apparent temperature ranks higher")]),
    ],
    "Selects the most negative valid local deviation; ties break by Comfort then stable location id.",
  );
}

export function findFastestRecovery(
  analysis: CelsiusScoutAnalysis,
): ScoutToolResult<{ location: ScoutedLocation }> {
  const candidates = analysis.locations.filter((location) => location.features.recoveryRateCPerHour !== null);
  if (!candidates.length) throw new Error("No location has enough post-peak observations for recovery");
  const location = [...candidates].sort(
    (a, b) =>
      (b.features.recoveryRateCPerHour as number) - (a.features.recoveryRateCPerHour as number) ||
      a.id.localeCompare(b.id),
  )[0];
  return result(
    analysis,
    "find_fastest_recovery",
    "Find the fastest post-peak recovery.",
    `${location.name} has the fastest supported post-peak cooling trend.`,
    { location },
    [
      featureEvidence("recoveryRateCPerHour", "Recovery rate", location.features.recoveryRateCPerHour as number, "°C/hour", "largest supported cooling slope in the cohort"),
      featureEvidence("recoveryWindowHours", "Recovery window", location.features.recoveryWindowHours as number, "hours", "window covered by the post-peak regression"),
    ],
    "Ranks available recovery rates descending; recovery requires the peak plus at least two later observations.",
  );
}

function comparableScorePairs(a: ScoutedLocation, b: ScoutedLocation): Array<[number, number]> {
  const pairs: Array<[number | null, number | null]> = [
    [a.scores.peak, b.scores.peak],
    [a.scores.stamina, b.scores.stamina],
    [a.scores.recovery, b.scores.recovery],
    [a.scores.chaos, b.scores.chaos],
    [a.scores.latePeak, b.scores.latePeak],
  ];
  return pairs.filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null);
}

export function findSimilarAverageDifferentBehaviorPair(
  analysis: CelsiusScoutAnalysis,
  maximumMeanDifferenceC = 1,
): ScoutToolResult<{
  first: ScoutedLocation;
  second: ScoutedLocation;
  meanDifferenceC: number;
  behaviorDistance: number;
  usedFallback: boolean;
}> {
  if (maximumMeanDifferenceC < 0) throw new Error("Maximum mean difference cannot be negative");
  const pairs = analysis.locations.flatMap((first, firstIndex) =>
    analysis.locations.slice(firstIndex + 1).map((second) => {
      const comparable = comparableScorePairs(first, second);
      const behaviorDistance = comparable.length
        ? comparable.reduce((sum, [a, b]) => sum + Math.abs(a - b), 0) / comparable.length
        : 0;
      return {
        first,
        second,
        meanDifferenceC: Math.round(Math.abs(first.features.meanTemperatureC - second.features.meanTemperatureC) * 1000) / 1000,
        behaviorDistance: Math.round(behaviorDistance * 10) / 10,
      };
    }),
  );
  const withinLimit = pairs.filter((pair) => pair.meanDifferenceC <= maximumMeanDifferenceC);
  const usedFallback = withinLimit.length === 0;
  const candidates = usedFallback
    ? [...pairs].sort((a, b) => a.meanDifferenceC - b.meanDifferenceC).slice(0, 1)
    : withinLimit;
  const selected = [...candidates].sort(
    (a, b) =>
      b.behaviorDistance - a.behaviorDistance ||
      a.meanDifferenceC - b.meanDifferenceC ||
      `${a.first.id}:${a.second.id}`.localeCompare(`${b.first.id}:${b.second.id}`),
  )[0];

  return result(
    analysis,
    "find_similar_average_different_behavior_pair",
    "Find two locations with similar averages but different thermal behavior.",
    `${selected.first.name} and ${selected.second.name} form the strongest qualifying contrast.`,
    { ...selected, usedFallback },
    [
      { metric: "meanDifferenceC", label: "Mean difference", value: selected.meanDifferenceC, unit: "°C", interpretation: "absolute difference between time-weighted means" },
      { metric: "behaviorDistance", label: "Behavior distance", value: selected.behaviorDistance, unit: "percentile points", interpretation: "mean absolute difference across available Peak, Stamina, Recovery, Chaos, and Late Peak scores" },
    ],
    usedFallback
      ? "No pair met the requested mean limit, so the closest-mean pair was returned and explicitly marked as fallback."
      : `Among pairs within ${maximumMeanDifferenceC}°C mean difference, maximize mean percentile distance across Peak, Stamina, Recovery, Chaos, and Late Peak.`,
  );
}

export function compareLocations(
  analysis: CelsiusScoutAnalysis,
  firstId: string,
  secondId: string,
): ScoutToolResult<{
  first: ScoutedLocation;
  second: ScoutedLocation;
  differences: {
    meanTemperatureC: number;
    peakTemperatureC: number;
    longestPersistenceHours: number;
    recoveryRateCPerHour: number | null;
    localDeviationC: number | null;
  };
}> {
  if (firstId === secondId) throw new Error("Comparison requires two different locations");
  const first = byId(analysis, firstId);
  const second = byId(analysis, secondId);
  const difference = (a: number, b: number) => Math.round((a - b) * 1000) / 1000;
  const differences = {
    meanTemperatureC: difference(first.features.meanTemperatureC, second.features.meanTemperatureC),
    peakTemperatureC: difference(first.features.peakTemperatureC, second.features.peakTemperatureC),
    longestPersistenceHours: difference(first.features.longestPersistenceHours, second.features.longestPersistenceHours),
    recoveryRateCPerHour:
      first.features.recoveryRateCPerHour === null || second.features.recoveryRateCPerHour === null
        ? null
        : difference(first.features.recoveryRateCPerHour, second.features.recoveryRateCPerHour),
    localDeviationC:
      first.features.localDeviationC === null || second.features.localDeviationC === null
        ? null
        : difference(first.features.localDeviationC, second.features.localDeviationC),
  };
  return result(
    analysis,
    "compare_locations",
    `Compare ${first.name} with ${second.name}.`,
    `${first.name} is the signed baseline; differences are first minus second.`,
    { first, second, differences },
    [
      featureEvidence("meanTemperatureC", `${first.name} mean`, first.features.meanTemperatureC, "°C", "time-weighted mean"),
      featureEvidence("meanTemperatureC", `${second.name} mean`, second.features.meanTemperatureC, "°C", "time-weighted mean"),
      featureEvidence("peakTemperatureC", `${first.name} peak`, first.features.peakTemperatureC, "°C", "observed maximum"),
      featureEvidence("peakTemperatureC", `${second.name} peak`, second.features.peakTemperatureC, "°C", "observed maximum"),
    ],
    "All differences are first location minus second; unavailable source metrics produce null differences.",
  );
}

export function inspectLocation(
  analysis: CelsiusScoutAnalysis,
  locationId: string,
): ScoutToolResult<{ location: ScoutedLocation }> {
  const location = byId(analysis, locationId);
  const evidence: MetricEvidence[] = [
    featureEvidence("peakTemperatureC", "Peak", location.features.peakTemperatureC, "°C", `observed at ${location.features.peakTimestamp}`),
    featureEvidence("meanTemperatureC", "Mean", location.features.meanTemperatureC, "°C", "trapezoidal time-weighted mean"),
    featureEvidence("longestPersistenceHours", "Longest persistence", location.features.longestPersistenceHours, "hours", `continuous time above ${analysis.cohort.thresholdC}°C`),
    scoreEvidence("heatPressure", "Heat Pressure", location.scores.heatPressure, "equal blend of cohort Peak and Stamina"),
    { metric: "archetype", label: "Archetype", value: location.archetype.name, interpretation: location.archetype.summary },
    ...location.archetype.reasons,
  ];
  return result(
    analysis,
    "inspect_location",
    `Inspect ${location.name}.`,
    `${location.name} is classified as ${location.archetype.name}.`,
    { location },
    evidence,
    "Returns the normalized input series, all raw features, cohort scores, archetype rule evidence, and cohort methodology in one payload.",
  );
}

/** A structured, number-free result for questions the active evidence cannot answer. */
export function unavailableScoutResult(
  analysis: CelsiusScoutAnalysis,
  question: string,
  reason: string,
): ScoutToolResult<null> {
  return result(
    analysis,
    "metric_unavailable",
    question,
    `The requested analysis is unavailable for this cohort: ${reason}.`,
    null,
    [],
    "No substitute metric or demo value was used. Collect the missing observations before making this comparison.",
  );
}
