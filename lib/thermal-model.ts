import type { ThermalCohort, ThermalLocation, ThermalSample } from "./types";

const MAX_REASONABLE_TEMPERATURE_C = 80;
const MIN_REASONABLE_TEMPERATURE_C = -60;

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function timestampMs(timestamp: string): number {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(timestamp)) {
    throw new Error(`Timestamp must include a UTC offset: ${timestamp}`);
  }
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) throw new Error(`Invalid timestamp: ${timestamp}`);
  return value;
}

function normalizeSample(sample: ThermalSample, locationId: string): ThermalSample {
  timestampMs(sample.timestamp);
  assertFinite(sample.temperatureC, `${locationId} temperature`);
  if (
    sample.temperatureC < MIN_REASONABLE_TEMPERATURE_C ||
    sample.temperatureC > MAX_REASONABLE_TEMPERATURE_C
  ) {
    throw new Error(`${locationId} temperature is outside the supported range`);
  }
  if (sample.apparentTemperatureC !== undefined) {
    assertFinite(sample.apparentTemperatureC, `${locationId} apparent temperature`);
  }
  if (sample.relativeHumidityPercent !== undefined) {
    assertFinite(sample.relativeHumidityPercent, `${locationId} humidity`);
    if (sample.relativeHumidityPercent < 0 || sample.relativeHumidityPercent > 100) {
      throw new Error(`${locationId} humidity must be between 0 and 100`);
    }
  }
  if (sample.windSpeedMps !== undefined) {
    assertFinite(sample.windSpeedMps, `${locationId} wind speed`);
    if (sample.windSpeedMps < 0) throw new Error(`${locationId} wind speed cannot be negative`);
  }
  return { ...sample };
}

function normalizeLocation(location: ThermalLocation): ThermalLocation {
  if (!location.id.trim()) throw new Error("Location id is required");
  if (!location.name.trim()) throw new Error(`${location.id} name is required`);
  assertFinite(location.latitude, `${location.id} latitude`);
  assertFinite(location.longitude, `${location.id} longitude`);
  if (location.latitude < -90 || location.latitude > 90) {
    throw new Error(`${location.id} latitude is outside [-90, 90]`);
  }
  if (location.longitude < -180 || location.longitude > 180) {
    throw new Error(`${location.id} longitude is outside [-180, 180]`);
  }
  if (location.samples.length < 2) {
    throw new Error(`${location.id} requires at least two thermal samples`);
  }

  const samples = location.samples
    .map((sample) => normalizeSample(sample, location.id))
    .sort((a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp));

  for (let index = 1; index < samples.length; index += 1) {
    if (timestampMs(samples[index].timestamp) === timestampMs(samples[index - 1].timestamp)) {
      throw new Error(`${location.id} contains duplicate timestamps`);
    }
  }

  return {
    ...location,
    footprint: location.footprint?.map((position) => ({ ...position })),
    samples,
    neighborIds: location.neighborIds ? [...new Set(location.neighborIds)].sort() : undefined,
    tags: location.tags ? [...new Set(location.tags)].sort() : undefined,
  };
}

/**
 * Validates and canonicalizes a provider-neutral cohort. Provider-specific
 * adapters should map into this contract once, before calling domain functions.
 */
export function normalizeThermalCohort(cohort: ThermalCohort): ThermalCohort {
  if (!cohort.id.trim()) throw new Error("Cohort id is required");
  if (!cohort.name.trim()) throw new Error("Cohort name is required");
  assertFinite(cohort.thresholdC, "Cohort threshold");
  if (cohort.locations.length < 2) throw new Error("A comparison cohort requires at least two locations");

  const ids = new Set<string>();
  const locations = cohort.locations.map((location) => {
    if (ids.has(location.id)) throw new Error(`Duplicate location id: ${location.id}`);
    ids.add(location.id);
    return normalizeLocation(location);
  });

  for (const location of locations) {
    for (const neighborId of location.neighborIds ?? []) {
      if (neighborId === location.id) throw new Error(`${location.id} cannot be its own neighbor`);
      if (!ids.has(neighborId)) throw new Error(`${location.id} references unknown neighbor ${neighborId}`);
    }
  }

  return {
    ...cohort,
    source: { ...cohort.source },
    locations,
  };
}

export function elapsedHours(startTimestamp: string, endTimestamp: string): number {
  return (timestampMs(endTimestamp) - timestampMs(startTimestamp)) / 3_600_000;
}

export function toEpochMs(timestamp: string): number {
  return timestampMs(timestamp);
}
