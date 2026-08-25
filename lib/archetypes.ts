import type {
  MetricEvidence,
  ThermalArchetype,
  ThermalFeatures,
  ThermalScores,
} from "./types";

function scoreEvidence(
  metric: keyof ThermalScores,
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

/** Explicit, ordered rules make archetype assignment reproducible and inspectable. */
export function classifyArchetype(
  features: ThermalFeatures,
  scores: ThermalScores,
): ThermalArchetype {
  if (scores.chaos >= 85) {
    return {
      id: "chaos-merchant",
      name: "The Chaos Merchant",
      summary: "Its rate of temperature change is unusually inconsistent within this cohort.",
      reasons: [
        scoreEvidence("chaos", "Chaos", scores.chaos, "top-end robust variability in this cohort"),
        featureEvidence(
          "temporalVariabilityIqrCPerHour",
          "Change-rate IQR",
          features.temporalVariabilityIqrCPerHour,
          "°C/hour",
          "interquartile range of successive changes in interval temperature-change rates",
        ),
      ],
    };
  }

  if (scores.latePeak >= 95) {
    return {
      id: "night-owl",
      name: "The Night Owl",
      summary: "Its hottest observation arrives unusually late in the shared window.",
      reasons: [
        scoreEvidence("latePeak", "Late peak", scores.latePeak, "one of the cohort's latest peaks"),
        featureEvidence(
          "peakOffsetHours",
          "Peak offset",
          features.peakOffsetHours,
          "hours from start",
          `peak observed at ${features.peakTimestamp}`,
        ),
      ],
    };
  }

  if (scores.recovery !== null && scores.recovery >= 85 && scores.peak >= 65 && scores.stamina < 80) {
    return {
      id: "comeback-kid",
      name: "The Comeback Kid",
      summary: "It sheds heat quickly after the measured peak.",
      reasons: [
        scoreEvidence("recovery", "Recovery", scores.recovery, "top-end post-peak cooling in this cohort"),
        featureEvidence(
          "recoveryRateCPerHour",
          "Recovery rate",
          features.recoveryRateCPerHour as number,
          "°C/hour",
          "negative post-peak regression slope, reported as positive cooling speed",
        ),
      ],
    };
  }

  if (scores.peak >= 75 && scores.stamina >= 65) {
    return {
      id: "furnace",
      name: "The Furnace",
      summary: "A severe peak combines with sustained time above the cohort threshold.",
      reasons: [
        scoreEvidence("peak", "Peak", scores.peak, "high peak relative to this cohort"),
        scoreEvidence("stamina", "Stamina", scores.stamina, "high persistence relative to this cohort"),
        featureEvidence(
          "peakTemperatureC",
          "Observed peak",
          features.peakTemperatureC,
          "°C",
          `earliest tied peak at ${features.peakTimestamp}`,
        ),
      ],
    };
  }

  if (scores.stamina >= 85) {
    return {
      id: "marathoner",
      name: "The Marathoner",
      summary: "Once above the comparison threshold, it stays there for a long uninterrupted run.",
      reasons: [
        scoreEvidence("stamina", "Stamina", scores.stamina, "top-end persistence in this cohort"),
        featureEvidence(
          "longestPersistenceHours",
          "Longest persistence",
          features.longestPersistenceHours,
          "hours",
          "longest continuous interpolated run above the cohort threshold",
        ),
      ],
    };
  }

  if (scores.peak <= 35 && scores.stamina <= 35) {
    return {
      id: "oasis",
      name: "The Oasis",
      summary: "A comparatively mild peak and short hot spell make it a cool-side profile.",
      reasons: [
        scoreEvidence("peak", "Peak", scores.peak, "low peak relative to this cohort"),
        scoreEvidence("stamina", "Stamina", scores.stamina, "short persistence relative to this cohort"),
        ...(scores.comfort === null
          ? []
          : [scoreEvidence("comfort", "Comfort", scores.comfort, "optional apparent-temperature support")]),
      ],
    };
  }

  return {
    id: "balanced-operator",
    name: "The Balanced Operator",
    summary: "No single thermal trait dominates strongly enough to trigger a specialist archetype.",
    reasons: [
      scoreEvidence(
        "heatPressure",
        "Heat Pressure",
        scores.heatPressure,
        "balanced between relative Peak and Stamina",
      ),
    ],
  };
}
