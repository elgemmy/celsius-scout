import { describe, expect, it } from "vitest";
import { analyzeCohort } from "./analysis";
import { demoCohort } from "./demo-data";
import { findCoolestLineup } from "./scouting";
import type { ThermalCohort, ThermalLocation } from "./types";

const tinyLocation = (id: string, temperatures: [number, number], neighborIds: string[]): ThermalLocation => ({
  id,
  name: id,
  areaLabel: "Test",
  latitude: id.charCodeAt(0) - 97,
  longitude: 0,
  neighborIds,
  samples: temperatures.map((temperatureC, index) => ({
    timestamp: `2026-08-18T1${index}:00:00Z`,
    temperatureC,
    apparentTemperatureC: temperatureC,
  })),
});

const tinyCohort = (locations: ThermalLocation[]): ThermalCohort => ({
  id: "tiny",
  name: "Tiny cohort",
  timezone: "UTC",
  source: { label: "Test", kind: "synthetic" },
  thresholdC: 15,
  locations,
});

describe("deterministic demo cohort", () => {
  it("contains ten distinct profiles with complete evidence", () => {
    const analysis = analyzeCohort(demoCohort);
    expect(analysis.locations).toHaveLength(10);
    expect(analysis.locations.every((location) => location.samples.length === 11)).toBe(true);
    expect(analysis.locations.every((location) => location.features.meanApparentTemperatureC !== null)).toBe(true);
    expect(analysis.locations.every((location) => location.features.localDeviationC !== null)).toBe(true);
    expect(
      analysis.locations.every(
        (location) =>
          location.scores.heatPressure ===
          Math.round((location.scores.peak + location.scores.stamina) / 2),
      ),
    ).toBe(true);
  });

  it("produces identical analysis on repeat", () => {
    expect(analyzeCohort(demoCohort)).toEqual(analyzeCohort(demoCohort));
  });

  it("keeps signature scouting useful with temperature-only heatmap data", () => {
    const temperatureOnly = {
      ...demoCohort,
      locations: demoCohort.locations.map((location) => ({
        ...location,
        samples: location.samples.map(({ timestamp, temperatureC }) => ({
          timestamp,
          temperatureC,
        })),
      })),
    };
    const analysis = analyzeCohort(temperatureOnly);
    const archetypes = Object.fromEntries(
      analysis.locations.map((location) => [location.id, location.archetype.id]),
    );

    expect(archetypes.glassworks).toBe("furnace");
    expect(archetypes["canal-steps"]).toBe("oasis");
    expect(() => findCoolestLineup(analysis, 5)).not.toThrow();
  });

  it("covers every named specialist archetype with intentional fixtures", () => {
    const archetypes = Object.fromEntries(
      analyzeCohort(demoCohort).locations.map((location) => [location.id, location.archetype.id]),
    );
    expect(archetypes).toMatchObject({
      glassworks: "furnace",
      "canal-steps": "oasis",
      "night-market": "night-owl",
      "marathon-apron": "marathoner",
      "comeback-park": "comeback-kid",
      "chaos-courtyard": "chaos-merchant",
      "balanced-arcade": "balanced-operator",
    });
  });

  it("uses signed same-hour neighbor medians and marks insufficient neighborhoods unavailable", () => {
    const threeLocations = analyzeCohort(tinyCohort([
      tinyLocation("a", [10, 20], ["b", "c"]),
      tinyLocation("b", [8, 18], ["a", "c"]),
      tinyLocation("c", [12, 16], ["a", "b"]),
    ]));
    expect(threeLocations.locations.find((location) => location.id === "a")?.features.localDeviationC).toBe(1.5);

    const twoLocations = analyzeCohort(tinyCohort([
      tinyLocation("a", [10, 20], ["b"]),
      tinyLocation("b", [8, 18], ["a"]),
    ]));
    expect(twoLocations.locations[0].features.localDeviationC).toBeNull();
    expect(twoLocations.locations[0].scores.surprise).toBeNull();
  });

  it("does not score Surprise from partial timestamp coverage", () => {
    const locationWithThreeSamples = (id: string, temperatures: [number, number, number], neighborIds: string[]): ThermalLocation => ({
      id,
      name: id,
      areaLabel: "Test",
      latitude: id.charCodeAt(0) - 97,
      longitude: 0,
      neighborIds,
      samples: temperatures.map((temperatureC, index) => ({
        timestamp: `2026-08-18T1${index}:00:00Z`,
        temperatureC,
      })),
    });
    const sparseNeighbor = tinyLocation("c", [12, 16], ["a", "b"]);
    sparseNeighbor.samples[1] = {
      ...sparseNeighbor.samples[1],
      timestamp: "2026-08-18T12:00:00Z",
    };
    const analysis = analyzeCohort(tinyCohort([
      locationWithThreeSamples("a", [10, 15, 20], ["b", "c"]),
      locationWithThreeSamples("b", [8, 13, 18], ["a", "c"]),
      sparseNeighbor,
    ]));
    const target = analysis.locations.find((location) => location.id === "a");

    expect(target?.features.neighborCount).toBe(1);
    expect(target?.features.localDeviationC).toBeNull();
    expect(target?.scores.surprise).toBeNull();
  });
});
