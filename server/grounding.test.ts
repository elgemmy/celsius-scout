import { describe, expect, it } from "vitest";
import { collectEvidenceNumbers, extractNumbers, validateNumericGrounding } from "./grounding";

describe("numeric grounding", () => {
  const evidence = {
    location: "cell-a3",
    features: { peakC: 38.2, recoveryCPerHour: 1.4, rank: 4 },
    cohort: { validLocations: 62, peakPercentile: 91 },
    methodology: "100 m tiles above a 36°C threshold",
  };

  it("extracts signed and decimal claims without treating identifiers as decimals", () => {
    expect(extractNumbers("Deviation -1.5°C, 82% percentile, cell-a3.")).toEqual(["-1.5", "82"]);
  });

  it("collects nested numerical evidence including documented method values", () => {
    expect(collectEvidenceNumbers(evidence)).toEqual(expect.arrayContaining(["1.4", "4", "36", "38.2", "62", "91", "100"]));
  });

  it("accepts explanations whose numerical claims occur in the evidence bundle", () => {
    const result = validateNumericGrounding(
      "It peaks at 38.2°C in the 91st percentile, then recovers at 1.4°C/hour.",
      evidence,
    );
    expect(result.grounded).toBe(true);
    expect(result.unsupportedNumbers).toEqual([]);
  });

  it("rejects an unsupported number instead of allowing plausible fabrication", () => {
    const result = validateNumericGrounding("It stays hot for 7 hours.", evidence);
    expect(result.grounded).toBe(false);
    expect(result.unsupportedNumbers).toEqual(["7"]);
  });
});
