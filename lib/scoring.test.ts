import { describe, expect, it } from "vitest";
import { percentileRanks } from "./scoring";

describe("cohort percentile scoring", () => {
  it("maps endpoints, shares average ranks across ties, and preserves unavailable values", () => {
    expect(percentileRanks([1, 2, 2, 4, null])).toEqual([0, 50, 50, 100, null]);
    expect(percentileRanks([1, 2, 2, 4, null], "lower-is-higher")).toEqual([100, 50, 50, 0, null]);
  });

  it("assigns a neutral score when every available value ties", () => {
    expect(percentileRanks([7, 7, 7])).toEqual([50, 50, 50]);
    expect(percentileRanks([null, 7, null])).toEqual([null, 50, null]);
  });

  it("is deterministic for repeated calls", () => {
    const values = [3, 1, 4, 1, 5, 9, null];
    expect(percentileRanks(values)).toEqual(percentileRanks(values));
  });
});
