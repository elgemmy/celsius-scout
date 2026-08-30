import { describe, expect, it } from "vitest";
import { mapFortyGuardHourlyCaptures } from "./fortyguard-mapper";

function feature(id: number, west: number, south: number, temperatureC: number) {
  return {
    id: String(id),
    type: "Feature",
    properties: {
      tile_id: id,
      average_temperature: temperatureC,
      min_temperature: temperatureC,
      max_temperature: temperatureC,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [west, south],
        [west + 0.001, south],
        [west + 0.001, south + 0.001],
        [west, south + 0.001],
        [west, south],
      ]],
    },
  };
}

function capture(time: string, temperatures = [30, 31, 32, 33]) {
  return {
    schemaVersion: 1,
    capturedAt: "2026-08-30T00:00:00.000Z",
    activityId: `activity-${time.replace(":", "-")}`,
    request: { date: "2026-08-18", time, granularityM: 100, analyticType: "tcm" },
    result: {
      map_data: {
        type: "FeatureCollection",
        features: [
          feature(0, -112.08, 33.44, temperatures[0]),
          feature(1, -112.079, 33.44, temperatures[1]),
          feature(2, -112.08, 33.441, temperatures[2]),
          feature(3, -112.079, 33.441, temperatures[3]),
        ],
      },
    },
  };
}

const options = {
  id: "observed-test",
  name: "Observed test cohort",
  timezone: "America/Phoenix",
  utcOffset: "-07:00",
  thresholdC: 38,
  granularityM: 100,
  snapshotId: "snapshot-test",
  capturedAt: "2026-08-30T00:00:00.000Z",
  locationCount: 4,
};

describe("FortyGuard hourly response mapper", () => {
  it("joins stable tiles into ordered, provenance-rich thermal series", () => {
    const cohort = mapFortyGuardHourlyCaptures([
      capture("12:00", [34, 35, 36, 37]),
      capture("10:00"),
      capture("11:00", [32, 33, 34, 35]),
    ], options);

    expect(cohort.source).toMatchObject({ kind: "fortyguard", snapshotId: "snapshot-test", granularityM: 100 });
    expect(cohort.locations).toHaveLength(4);
    expect(cohort.locations[0]).toMatchObject({
      id: "fg-tile-000",
      latitude: 33.4405,
      longitude: -112.0795,
    });
    expect(cohort.locations[0].footprint).toHaveLength(4);
    expect(cohort.locations[0].samples).toEqual([
      { timestamp: "2026-08-18T10:00:00-07:00", temperatureC: 30 },
      { timestamp: "2026-08-18T11:00:00-07:00", temperatureC: 32 },
      { timestamp: "2026-08-18T12:00:00-07:00", temperatureC: 34 },
    ]);
  });

  it("rejects tile drift instead of joining mismatched cells", () => {
    const changed = capture("11:00");
    changed.result.map_data.features[0].geometry.coordinates[0][0][0] = -111;
    expect(() => mapFortyGuardHourlyCaptures([capture("10:00"), changed], options)).toThrow("changed tile 0");
  });

  it("rejects malformed provider temperatures", () => {
    const malformed = capture("11:00") as unknown as Record<string, unknown>;
    const result = malformed.result as { map_data: { features: Array<{ properties: { average_temperature: unknown } }> } };
    result.map_data.features[0].properties.average_temperature = "hot";
    expect(() => mapFortyGuardHourlyCaptures([capture("10:00"), malformed], options)).toThrow("average_temperature must be finite");
  });
});
