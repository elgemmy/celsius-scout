import { describe, expect, it } from "vitest";
import { analyzeCohort } from "./analysis";
import { summarizeAverageMasking } from "./average-insight";
import { demoCohort } from "./demo-data";

describe("summarizeAverageMasking", () => {
  it("summarizes variation from the analyzed cohort without new estimates", () => {
    const analysis = analyzeCohort(demoCohort);
    const summary = summarizeAverageMasking(analysis);

    expect(summary.hottestLocation.id).toBe("glassworks");
    expect(summary.coolestLocation.id).toBe("canal-steps");
    expect(summary.spatialMeanRangeC).toBeGreaterThan(0);
    expect(summary.tileHoursAboveThresholdPercent).toBeGreaterThan(0);
    expect(
      summary.hotterThanRepresentativeCount + summary.coolerThanRepresentativeCount,
    ).toBeLessThanOrEqual(analysis.cohort.locationCount);
  });

  it("is stable for the same deterministic input", () => {
    const first = summarizeAverageMasking(analyzeCohort(demoCohort));
    const second = summarizeAverageMasking(analyzeCohort(demoCohort));

    expect(second).toEqual(first);
  });
});
