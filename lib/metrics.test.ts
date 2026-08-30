import { describe, expect, it } from "vitest";
import {
  calculateBaseThermalFeatures,
  degreeHoursAboveThreshold,
  deriveBomApparentTemperatureC,
  durationAboveThresholdHours,
  resolveApparentTemperature,
} from "./metrics";
import { normalizeThermalCohort } from "./thermal-model";
import type { ThermalCohort, ThermalLocation } from "./types";

const irregularLocation: ThermalLocation = {
  id: "irregular",
  name: "Irregular series",
  areaLabel: "Test",
  latitude: 0,
  longitude: 0,
  samples: [
    { timestamp: "2026-08-18T10:00:00Z", temperatureC: 30, apparentTemperatureC: 31 },
    { timestamp: "2026-08-18T10:30:00Z", temperatureC: 40, apparentTemperatureC: 42 },
    { timestamp: "2026-08-18T11:00:00Z", temperatureC: 36, apparentTemperatureC: 38 },
    { timestamp: "2026-08-18T12:00:00Z", temperatureC: 30, apparentTemperatureC: 31 },
  ],
};

describe("interval-aware thermal metrics", () => {
  it("interpolates threshold crossings and excess degree-hours", () => {
    expect(durationAboveThresholdHours(30, 40, 0.5, 35)).toBeCloseTo(0.25);
    expect(durationAboveThresholdHours(40, 30, 1.5, 35)).toBeCloseTo(0.75);
    expect(degreeHoursAboveThreshold(30, 40, 0.5, 35)).toBeCloseTo(0.625);
    expect(degreeHoursAboveThreshold(40, 30, 1.5, 35)).toBeCloseTo(1.875);
  });

  it("uses real intervals for mean, total exceedance, and longest persistence", () => {
    const features = calculateBaseThermalFeatures(irregularLocation, 35);
    expect(features.observedDurationHours).toBe(2);
    expect(features.meanTemperatureC).toBeCloseTo(34.75);
    expect(features.totalExceedanceHours).toBeCloseTo(0.917, 3);
    expect(features.longestPersistenceHours).toBeCloseTo(0.917, 3);
    expect(features.degreeHoursAboveThresholdC).toBeCloseTo(2.208, 3);
    expect(features.peakTimestamp).toBe("2026-08-18T10:30:00Z");
    expect(features.peakOffsetHours).toBe(0.5);
    expect(features.recoveryRateCPerHour).toBeGreaterThan(6);
  });

  it("keeps separate exceedance runs separate", () => {
    const features = calculateBaseThermalFeatures(
      {
        ...irregularLocation,
        samples: [
          { timestamp: "2026-08-18T10:00:00Z", temperatureC: 34, apparentTemperatureC: 34 },
          { timestamp: "2026-08-18T11:00:00Z", temperatureC: 36, apparentTemperatureC: 36 },
          { timestamp: "2026-08-18T12:00:00Z", temperatureC: 34, apparentTemperatureC: 34 },
          { timestamp: "2026-08-18T13:00:00Z", temperatureC: 37, apparentTemperatureC: 37 },
          { timestamp: "2026-08-18T14:00:00Z", temperatureC: 34, apparentTemperatureC: 34 },
        ],
      },
      35,
    );
    expect(features.totalExceedanceHours).toBeCloseTo(2.333, 3);
    expect(features.longestPersistenceHours).toBeCloseTo(1.333, 3);
  });

  it("reports unavailable comfort and recovery rather than inventing proxies", () => {
    const noApparent = calculateBaseThermalFeatures(
      {
        ...irregularLocation,
        samples: [
          { timestamp: "2026-08-18T10:00:00Z", temperatureC: 30 },
          { timestamp: "2026-08-18T11:00:00Z", temperatureC: 35 },
          { timestamp: "2026-08-18T12:00:00Z", temperatureC: 40 },
        ],
      },
      35,
    );
    expect(noApparent.meanApparentTemperatureC).toBeNull();
    expect(noApparent.apparentTemperatureMethod).toBe("unavailable");
    expect(noApparent.recoveryRateCPerHour).toBeNull();
    expect(resolveApparentTemperature({ timestamp: "2026-08-18T10:00:00Z", temperatureC: 30 }).value).toBeNull();
  });

  it("derives BOM apparent temperature only with humidity and wind", () => {
    expect(deriveBomApparentTemperatureC(35, 40, 1)).toBeCloseTo(37.694, 3);
    expect(
      resolveApparentTemperature({
        timestamp: "2026-08-18T10:00:00Z",
        temperatureC: 35,
        relativeHumidityPercent: 40,
        windSpeedMps: 1,
      }).method,
    ).toBe("bom-derived");
  });
});

describe("provider-neutral cohort normalization", () => {
  const cohort = (candidate: ThermalLocation): ThermalCohort => ({
    id: "test",
    name: "Test cohort",
    timezone: "UTC",
    source: { label: "Fixture", kind: "synthetic" },
    thresholdC: 35,
    locations: [
      candidate,
      { ...candidate, id: "other", name: "Other", longitude: 1, neighborIds: [candidate.id] },
    ],
  });

  it("sorts samples without mutating the provider-neutral input", () => {
    const reversed = { ...irregularLocation, samples: [...irregularLocation.samples].reverse(), neighborIds: ["other"] };
    const normalized = normalizeThermalCohort(cohort(reversed));
    expect(normalized.locations[0].samples[0].timestamp).toBe("2026-08-18T10:00:00Z");
    expect(reversed.samples[0].timestamp).toBe("2026-08-18T12:00:00Z");
  });

  it("rejects timestamps without offsets and duplicate instants", () => {
    const noOffset = {
      ...irregularLocation,
      samples: irregularLocation.samples.map((sample, index) =>
        index === 0 ? { ...sample, timestamp: "2026-08-18T10:00:00" } : sample,
      ),
    };
    expect(() => normalizeThermalCohort(cohort(noOffset))).toThrow("UTC offset");

    const duplicate = {
      ...irregularLocation,
      samples: [irregularLocation.samples[0], { ...irregularLocation.samples[1], timestamp: irregularLocation.samples[0].timestamp }],
    };
    expect(() => normalizeThermalCohort(cohort(duplicate))).toThrow("duplicate timestamps");
  });

  it("rejects invalid cohort metadata before scores can be produced", () => {
    expect(() => normalizeThermalCohort({ ...cohort(irregularLocation), timezone: "Mars/Olympus" }))
      .toThrow("Invalid IANA timezone");
    expect(() => normalizeThermalCohort({ ...cohort(irregularLocation), thresholdC: 120 }))
      .toThrow("threshold is outside");
    expect(() => normalizeThermalCohort({
      ...cohort(irregularLocation),
      source: { label: "", kind: "other" },
    })).toThrow("source label");
  });

  it("requires a common observation window for fair cohort percentiles", () => {
    const input = cohort(irregularLocation);
    input.locations[1] = {
      ...input.locations[1],
      samples: input.locations[1].samples.map((sample, index) =>
        index === input.locations[1].samples.length - 1
          ? { ...sample, timestamp: "2026-08-18T13:00:00Z" }
          : sample,
      ),
    };

    expect(() => normalizeThermalCohort(input)).toThrow("observation window must match");
  });
});
