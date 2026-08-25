import { classifyArchetype } from "./archetypes";
import { calculateBaseThermalFeatures, withLocalDeviation } from "./metrics";
import { scoreThermalFeatures } from "./scoring";
import { normalizeThermalCohort, toEpochMs } from "./thermal-model";
import type {
  CelsiusScoutAnalysis,
  ThermalCohort,
  ThermalLocation,
} from "./types";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function distanceSquared(a: ThermalLocation, b: ThermalLocation): number {
  // Sufficient only for ordering nearby points; no distance value is exposed.
  const latitudeScale = Math.cos((a.latitude * Math.PI) / 180);
  return (a.latitude - b.latitude) ** 2 + ((a.longitude - b.longitude) * latitudeScale) ** 2;
}

function resolveNeighbors(location: ThermalLocation, locations: ThermalLocation[]): ThermalLocation[] {
  if (location.neighborIds?.length) {
    const byId = new Map(locations.map((candidate) => [candidate.id, candidate]));
    return location.neighborIds.map((id) => byId.get(id) as ThermalLocation);
  }
  return locations
    .filter((candidate) => candidate.id !== location.id)
    .sort((a, b) => distanceSquared(location, a) - distanceSquared(location, b) || a.id.localeCompare(b.id))
    .slice(0, 3);
}

function sameHourNeighborDeviations(
  location: ThermalLocation,
  neighbors: ThermalLocation[],
): number[] {
  const neighborSeries = neighbors.map(
    (neighbor) => new Map(neighbor.samples.map((sample) => [toEpochMs(sample.timestamp), sample.temperatureC])),
  );
  return location.samples.flatMap((sample) => {
    const timestamp = toEpochMs(sample.timestamp);
    const values = neighborSeries
      .map((series) => series.get(timestamp))
      .filter((value): value is number => value !== undefined);
    return values.length >= 2 ? [sample.temperatureC - median(values)] : [];
  });
}

export interface AnalysisOptions {
  thresholdC?: number;
}

export function analyzeCohort(
  input: ThermalCohort,
  options: AnalysisOptions = {},
): CelsiusScoutAnalysis {
  const normalized = normalizeThermalCohort({
    ...input,
    thresholdC: options.thresholdC ?? input.thresholdC,
  });
  const bases = normalized.locations.map((location) =>
    calculateBaseThermalFeatures(location, normalized.thresholdC),
  );
  const features = normalized.locations.map((location, index) => {
    const neighbors = resolveNeighbors(location, normalized.locations);
    return withLocalDeviation(
      bases[index],
      sameHourNeighborDeviations(location, neighbors),
      neighbors.length,
    );
  });
  const scores = scoreThermalFeatures(features);
  const timestamps = normalized.locations.flatMap((location) =>
    location.samples.map((sample) => sample.timestamp),
  );
  const startTimestamp = timestamps.reduce((earliest, timestamp) =>
    toEpochMs(timestamp) < toEpochMs(earliest) ? timestamp : earliest,
  );
  const endTimestamp = timestamps.reduce((latest, timestamp) =>
    toEpochMs(timestamp) > toEpochMs(latest) ? timestamp : latest,
  );

  return {
    cohort: {
      id: normalized.id,
      name: normalized.name,
      timezone: normalized.timezone,
      source: normalized.source,
      thresholdC: normalized.thresholdC,
      locationCount: normalized.locations.length,
      startTimestamp,
      endTimestamp,
    },
    locations: normalized.locations.map((location, index) => ({
      ...location,
      features: features[index],
      scores: scores[index],
      archetype: classifyArchetype(features[index], scores[index]),
    })),
    methodology: [
      "All raw metrics are deterministic and derived from timestamped input samples.",
      `Stamina uses the longest continuous linearly interpolated run above ${normalized.thresholdC}°C; total exceedance is reported separately.`,
      "Scores are average-rank percentiles inside this active cohort only; ties share a score.",
      "Comfort is scored only when every sample has provided apparent temperature or enough humidity and wind data for the BOM shade formula.",
      "Recovery is a post-peak linear-regression cooling slope and is unavailable without two observations after the peak.",
      "Chaos is the IQR of successive changes in interval temperature-change rates, reducing sensitivity to isolated extremes while distinguishing irregular swings from a smooth daily arc.",
      "Local deviation is the median signed difference from same-timestamp neighbor medians; explicit neighbors are preferred, otherwise the three nearest locations are used.",
      "Heat Pressure is 50% cohort-relative Peak plus 50% cohort-relative Stamina; it is not a health or safety score.",
    ],
  };
}
