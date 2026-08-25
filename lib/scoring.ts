import type { ThermalFeatures, ThermalScores } from "./types";

export type ScoreDirection = "higher-is-higher" | "lower-is-higher";

function roundScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Returns 0–100 cohort percentiles using average ranks for ties. The minimum
 * maps to 0 and maximum to 100; an all-tied or single-item cohort maps to 50.
 * Null inputs remain null and do not affect the available comparison cohort.
 */
export function percentileRanks(
  values: Array<number | null>,
  direction: ScoreDirection = "higher-is-higher",
): Array<number | null> {
  const available = values
    .map((value, index) => ({ value, index }))
    .filter((item): item is { value: number; index: number } => item.value !== null)
    .sort((a, b) => a.value - b.value || a.index - b.index);
  const result: Array<number | null> = values.map(() => null);
  if (!available.length) return result;
  if (available.length === 1) {
    result[available[0].index] = 50;
    return result;
  }

  let cursor = 0;
  while (cursor < available.length) {
    let end = cursor;
    while (end + 1 < available.length && available[end + 1].value === available[cursor].value) {
      end += 1;
    }
    const averageZeroBasedRank = (cursor + end) / 2;
    const ascendingScore = averageZeroBasedRank / (available.length - 1) * 100;
    const score = direction === "higher-is-higher" ? ascendingScore : 100 - ascendingScore;
    for (let index = cursor; index <= end; index += 1) {
      result[available[index].index] = roundScore(score);
    }
    cursor = end + 1;
  }
  return result;
}

/** Scores every feature only against the active cohort. */
export function scoreThermalFeatures(features: ThermalFeatures[]): ThermalScores[] {
  if (!features.length) return [];
  const peak = percentileRanks(features.map((item) => item.peakTemperatureC));
  const stamina = percentileRanks(features.map((item) => item.longestPersistenceHours));
  const recovery = percentileRanks(features.map((item) => item.recoveryRateCPerHour));
  const comfort = percentileRanks(
    features.map((item) => item.meanApparentTemperatureC),
    "lower-is-higher",
  );
  const chaos = percentileRanks(features.map((item) => item.temporalVariabilityIqrCPerHour));
  const surprise = percentileRanks(
    features.map((item) => item.localDeviationC === null ? null : Math.abs(item.localDeviationC)),
  );
  const latePeak = percentileRanks(features.map((item) => item.peakOffsetHours));

  return features.map((_, index) => {
    const peakScore = peak[index] as number;
    const staminaScore = stamina[index] as number;
    return {
      peak: peakScore,
      stamina: staminaScore,
      recovery: recovery[index],
      comfort: comfort[index],
      chaos: chaos[index] as number,
      surprise: surprise[index],
      latePeak: latePeak[index] as number,
      heatPressure: roundScore((peakScore + staminaScore) / 2),
    };
  });
}
