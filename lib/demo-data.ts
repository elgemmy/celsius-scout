import type { ThermalCohort, ThermalLocation, ThermalSample } from "./types";

const observationHours = Array.from({ length: 11 }, (_, index) => 10 + index);

function samples(
  temperatures: number[],
  relativeHumidityPercent: number,
  windSpeedMps: number,
): ThermalSample[] {
  if (temperatures.length !== observationHours.length) {
    throw new Error("Demo profiles must cover the complete observation window");
  }
  return temperatures.map((temperatureC, index) => ({
    timestamp: `2026-08-18T${String(observationHours[index]).padStart(2, "0")}:00:00-07:00`,
    temperatureC,
    relativeHumidityPercent,
    windSpeedMps,
  }));
}

function location(
  input: Omit<ThermalLocation, "areaLabel" | "samples"> & {
    temperatures: number[];
    humidity: number;
    wind: number;
  },
): ThermalLocation {
  const { temperatures, humidity, wind, ...locationFields } = input;
  return {
    ...locationFields,
    areaLabel: "Central Phoenix demo grid",
    samples: samples(temperatures, humidity, wind),
  };
}

/**
 * Deliberately shaped, deterministic profiles for an offline demo. Names and
 * values are fictional; coordinates only place the cards coherently in Phoenix.
 */
export const demoCohort: ThermalCohort = {
  id: "phoenix-celsius-scout-demo",
  name: "Central Phoenix scouting combine",
  timezone: "America/Phoenix",
  source: {
    label: "Synthetic Phoenix fixture for product demonstration — not observed FortyGuard data",
    kind: "synthetic",
  },
  thresholdC: 38,
  locations: [
    location({
      id: "glassworks",
      name: "Glassworks Plaza",
      latitude: 33.4518,
      longitude: -112.0746,
      temperatures: [35, 37, 39, 41, 43, 44, 43, 41, 39, 37, 35],
      humidity: 45,
      wind: 0.5,
      neighborIds: ["marathon-apron", "shade-pavilion", "warehouse-roof"],
      tags: ["high-peak", "hardscape"],
    }),
    location({
      id: "canal-steps",
      name: "Canal Steps",
      latitude: 33.4518,
      longitude: -112.0718,
      temperatures: [30, 31, 32, 33, 34, 34.5, 34, 33, 32, 31, 30],
      humidity: 25,
      wind: 3,
      neighborIds: ["steady-court", "shade-pavilion", "night-market"],
      tags: ["mild-profile", "breezy"],
    }),
    location({
      id: "night-market",
      name: "Night Market Roof",
      latitude: 33.4518,
      longitude: -112.069,
      temperatures: [31, 31.5, 32, 33, 34, 35, 36, 38, 41, 40, 39],
      humidity: 30,
      wind: 1.5,
      neighborIds: ["canal-steps", "steady-court", "balanced-arcade"],
      tags: ["late-peak"],
    }),
    location({
      id: "marathon-apron",
      name: "Transit Apron",
      latitude: 33.4494,
      longitude: -112.0746,
      temperatures: [37, 38.5, 39.5, 40, 40.2, 40.4, 40.3, 40.1, 39.8, 39.2, 38.5],
      humidity: 38,
      wind: 0.8,
      neighborIds: ["glassworks", "shade-pavilion", "comeback-park"],
      tags: ["persistent"],
    }),
    location({
      id: "comeback-park",
      name: "Comeback Park",
      latitude: 33.4494,
      longitude: -112.0718,
      temperatures: [32, 34, 37, 41, 43, 37, 33, 31, 30, 29.5, 29],
      humidity: 28,
      wind: 2,
      neighborIds: ["marathon-apron", "shade-pavilion", "chaos-courtyard"],
      tags: ["fast-recovery"],
    }),
    location({
      id: "chaos-courtyard",
      name: "Patchwork Courtyard",
      latitude: 33.4494,
      longitude: -112.069,
      temperatures: [33, 39, 32, 41, 34, 42, 33, 40, 32, 38, 31],
      humidity: 30,
      wind: 1,
      neighborIds: ["night-market", "comeback-park", "balanced-arcade"],
      tags: ["volatile"],
    }),
    location({
      id: "balanced-arcade",
      name: "Library Arcade",
      latitude: 33.447,
      longitude: -112.069,
      temperatures: [32, 34, 36, 38, 39, 39.5, 38.5, 36, 34, 33, 32],
      humidity: 32,
      wind: 2,
      neighborIds: ["chaos-courtyard", "steady-court", "warehouse-roof"],
      tags: ["balanced"],
    }),
    location({
      id: "shade-pavilion",
      name: "Shade Pavilion",
      latitude: 33.447,
      longitude: -112.0746,
      temperatures: [31, 32, 34, 35, 36, 36.5, 35, 34, 33, 32, 31],
      humidity: 22,
      wind: 2.5,
      neighborIds: ["glassworks", "marathon-apron", "warehouse-roof"],
      tags: ["cool-relative-to-neighbors"],
    }),
    location({
      id: "warehouse-roof",
      name: "Warehouse Roof",
      latitude: 33.447,
      longitude: -112.0718,
      temperatures: [34, 36, 38, 40, 41, 41.5, 41, 40, 38, 36, 34],
      humidity: 42,
      wind: 0.7,
      neighborIds: ["glassworks", "shade-pavilion", "balanced-arcade"],
      tags: ["hot-relative-to-neighbors"],
    }),
    location({
      id: "steady-court",
      name: "Steady Court",
      latitude: 33.447,
      longitude: -112.068,
      temperatures: [33, 34, 35, 36, 37, 38, 38.5, 38, 37, 36, 34.5],
      humidity: 30,
      wind: 1.5,
      neighborIds: ["canal-steps", "night-market", "balanced-arcade"],
      tags: ["steady"],
    }),
  ],
};
