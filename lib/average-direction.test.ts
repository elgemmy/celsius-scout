import { describe, expect, it } from "vitest";
import {
  analyzeCohort,
  demoCohort,
  findSimilarAverageDifferentBehaviorPair,
  summarizeAverageMasking,
} from "./index";

describe("The Average Is Lying composition", () => {
  const analysis = analyzeCohort(demoCohort);
  const summary = summarizeAverageMasking(analysis);
  const pair = findSimilarAverageDifferentBehaviorPair(analysis);

  it("keeps every headline value grounded in the active analysis", () => {
    expect(analysis.cohort.source.kind).toBe("synthetic");
    expect(summary.hottestLocation.features.meanTemperatureC).toBeGreaterThan(
      summary.coolestLocation.features.meanTemperatureC,
    );
    expect(summary.spatialMeanRangeC).toBeCloseTo(
      summary.hottestMeanC - summary.coolestMeanC,
      1,
    );
    expect(summary.tileHoursAboveThresholdPercent).toBeGreaterThanOrEqual(0);
    expect(summary.tileHoursAboveThresholdPercent).toBeLessThanOrEqual(100);
  });

  it("uses the real scout tool for the similar-average contrast", () => {
    expect(pair.tool).toBe("find_similar_average_different_behavior_pair");
    expect(pair.data.first.id).not.toBe(pair.data.second.id);
    expect(pair.data.meanDifferenceC).toBeLessThanOrEqual(1);
    expect(pair.data.behaviorDistance).toBeGreaterThan(0);
    expect(pair.evidence.map((item) => item.value)).toEqual(
      expect.arrayContaining([
        pair.data.meanDifferenceC,
        pair.data.behaviorDistance,
      ]),
    );
  });
});
