import { describe, expect, it } from "vitest";
import { analyzeCohort } from "./analysis";
import { demoCohort } from "./demo-data";
import {
  compareLocations,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  findUnderratedCoolLocation,
  inspectLocation,
} from "./scouting";

const analysis = analyzeCohort(demoCohort);

describe("Celsius Scout deterministic tools", () => {
  it("builds a stable cool lineup with complete cohort context", () => {
    const first = findCoolestLineup(analysis, 5);
    const second = findCoolestLineup(analysis, 5);
    expect(first).toEqual(second);
    expect(first.data).toHaveLength(5);
    expect(first.data[0].location.id).toBe("canal-steps");
    expect(first.data.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(first.context).toMatchObject({ cohortSize: 10, isSynthetic: true, thresholdC: 38 });
    expect(first.evidence.length).toBeGreaterThanOrEqual(20);
  });

  it("finds average masking, cool-side deviation, and fastest recovery deterministically", () => {
    expect(findBiggestThermalFraud(analysis).data.location.id).toBe("comeback-park");
    expect(findUnderratedCoolLocation(analysis).data.location.id).toBe("shade-pavilion");
    expect(findFastestRecovery(analysis).data.location.id).toBe("comeback-park");
  });

  it("finds similar averages with meaningfully different behavior", () => {
    const result = findSimilarAverageDifferentBehaviorPair(analysis);
    expect(result).toEqual(findSimilarAverageDifferentBehaviorPair(analysis));
    expect(result.data.meanDifferenceC).toBeLessThanOrEqual(1);
    expect(result.data.behaviorDistance).toBeGreaterThan(20);
    expect(result.data.usedFallback).toBe(false);
    expect(result.evidence.map((item) => item.metric)).toEqual(["meanDifferenceC", "behaviorDistance"]);
  });

  it("returns full, inspectable profiles for compare and inspect tools", () => {
    const comparison = compareLocations(analysis, "glassworks", "canal-steps");
    expect(comparison.data.first.samples).toHaveLength(11);
    expect(comparison.data.differences.peakTemperatureC).toBe(9.5);
    expect(comparison.answer).toContain("first minus second");

    const inspection = inspectLocation(analysis, "glassworks");
    expect(inspection.data.location.archetype.id).toBe("furnace");
    expect(inspection.evidence.some((item) => item.metric === "heatPressure")).toBe(true);
    expect(inspection.methodology.some((item) => item.includes("50%"))).toBe(true);
  });

  it("rejects unknown or invalid tool inputs", () => {
    expect(() => inspectLocation(analysis, "missing")).toThrow("Unknown location");
    expect(() => compareLocations(analysis, "glassworks", "glassworks")).toThrow("different locations");
    expect(() => findCoolestLineup(analysis, 0)).toThrow("positive integer");
  });
});
