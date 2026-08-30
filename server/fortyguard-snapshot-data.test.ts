import { describe, expect, it } from "vitest";
import capture10 from "../data/fortyguard/raw/phoenix-2026-08-18/10-00.json";
import capture11 from "../data/fortyguard/raw/phoenix-2026-08-18/11-00.json";
import capture12 from "../data/fortyguard/raw/phoenix-2026-08-18/12-00.json";
import capture13 from "../data/fortyguard/raw/phoenix-2026-08-18/13-00.json";
import capture14 from "../data/fortyguard/raw/phoenix-2026-08-18/14-00.json";
import capture15 from "../data/fortyguard/raw/phoenix-2026-08-18/15-00.json";
import capture16 from "../data/fortyguard/raw/phoenix-2026-08-18/16-00.json";
import capture17 from "../data/fortyguard/raw/phoenix-2026-08-18/17-00.json";
import capture18 from "../data/fortyguard/raw/phoenix-2026-08-18/18-00.json";
import capture19 from "../data/fortyguard/raw/phoenix-2026-08-18/19-00.json";
import capture20 from "../data/fortyguard/raw/phoenix-2026-08-18/20-00.json";
import { analyzeCohort } from "../lib/analysis";
import { mapFortyGuardHourlyCaptures } from "./fortyguard-mapper";

const rawCaptures = [capture10, capture11, capture12, capture13, capture14, capture15, capture16, capture17, capture18, capture19, capture20];

describe("captured FortyGuard Phoenix snapshot", () => {
  it("maps eleven stable observed layers into the production scouting cohort", () => {
    const cohort = mapFortyGuardHourlyCaptures(rawCaptures, {
      id: "phoenix-fortyguard-2026-08-18",
      name: "Central Phoenix observed combine",
      timezone: "America/Phoenix",
      utcOffset: "-07:00",
      thresholdC: 38,
      granularityM: 100,
      snapshotId: "phoenix-2026-08-18-100m-hourly-v1",
      capturedAt: capture20.capturedAt,
      locationCount: 10,
    });
    const analysis = analyzeCohort(cohort);

    expect(cohort.source.kind).toBe("fortyguard");
    expect(cohort.locations).toHaveLength(10);
    expect(cohort.locations.every((location) => location.samples.length === 11)).toBe(true);
    expect(cohort.locations.every((location) => location.footprint?.length === 4)).toBe(true);
    expect(analysis.cohort).toMatchObject({
      locationCount: 10,
      startTimestamp: "2026-08-18T10:00:00-07:00",
      endTimestamp: "2026-08-18T20:00:00-07:00",
    });
    expect(analysis.locations.every((location) => Number.isFinite(location.features.peakTemperatureC))).toBe(true);
  });
});
