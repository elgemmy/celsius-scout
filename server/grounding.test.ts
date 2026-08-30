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

  it("does not treat clock hours as numerical claims", () => {
    expect(extractNumbers("Peak 41.9°C at 15:00, gap 0.78.")).toEqual(["41.9", "0.78"]);
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

  it("accepts rounded or truncated claims at the claimed precision", () => {
    const result = validateNumericGrounding(
      "The 41.9°C peak at 15:00 hides a 41.1°C mean; the gap is 0.78°C.",
      { peakC: 41.901, meanC: 41.119, gapC: 0.782, peakTimestamp: "2026-08-18T15:00:00Z" },
    );
    expect(result.grounded).toBe(true);
    expect(result.claimedNumbers).toEqual(["41.9", "41.1", "0.78"]);
    expect(result.unsupportedNumbers).toEqual([]);
  });

  it("rejects an unsupported number instead of allowing plausible fabrication", () => {
    const result = validateNumericGrounding("It stays hot for 7 hours.", evidence);
    expect(result.grounded).toBe(false);
    expect(result.unsupportedNumbers).toEqual(["7"]);
  });

  it("rejects invented values even when nearby evidence exists", () => {
    const result = validateNumericGrounding("It stays hot for 777 hours.", { peakC: 41.901, gapC: 0.782 });
    expect(result.grounded).toBe(false);
    expect(result.unsupportedNumbers).toEqual(["777"]);
  });

  it("rejects a bare integer that only appears inside an evidence timestamp", () => {
    const result = validateNumericGrounding(
      "The spike lasts 15 hours.",
      { peakTimestamp: "2026-08-18T15:00:00Z", peakC: 41.901 },
    );
    expect(result.grounded).toBe(false);
    expect(result.unsupportedNumbers).toEqual(["15"]);
  });
});
