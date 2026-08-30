import { normalizeThermalCohort } from "../lib/thermal-model";
import type { ThermalCohort, ThermalLocation } from "../lib/types";

interface MapperOptions {
  id: string;
  name: string;
  timezone: string;
  utcOffset: string;
  thresholdC: number;
  granularityM: number;
  snapshotId: string;
  capturedAt: string;
  locationCount?: number;
}

interface ParsedTile {
  id: number;
  temperatureC: number;
  footprint: Array<{ latitude: number; longitude: number }>;
  latitude: number;
  longitude: number;
}

interface ParsedCapture {
  date: string;
  time: string;
  activityId: string;
  tiles: ParsedTile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return value;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} must be finite`);
  return value;
}

function parseTile(value: unknown, captureIndex: number, featureIndex: number): ParsedTile {
  const field = `captures[${captureIndex}].result.map_data.features[${featureIndex}]`;
  if (!isRecord(value) || value.type !== "Feature" || !isRecord(value.properties) || !isRecord(value.geometry)) {
    throw new Error(`${field} must be a GeoJSON Feature`);
  }
  const id = finiteNumber(value.properties.tile_id, `${field}.properties.tile_id`);
  if (!Number.isInteger(id) || id < 0) throw new Error(`${field}.properties.tile_id must be a non-negative integer`);
  const temperatureC = finiteNumber(
    value.properties.average_temperature,
    `${field}.properties.average_temperature`,
  );
  if (value.geometry.type !== "Polygon" || !Array.isArray(value.geometry.coordinates)) {
    throw new Error(`${field}.geometry must be a Polygon`);
  }
  const firstRing = value.geometry.coordinates[0];
  if (!Array.isArray(firstRing) || firstRing.length < 4) throw new Error(`${field}.geometry has no valid outer ring`);
  const positions = firstRing.map((position, positionIndex) => {
    if (!Array.isArray(position) || position.length < 2) {
      throw new Error(`${field}.geometry.coordinates[0][${positionIndex}] must be a position`);
    }
    const longitude = finiteNumber(position[0], `${field} longitude`);
    const latitude = finiteNumber(position[1], `${field} latitude`);
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new Error(`${field} contains an out-of-range position`);
    }
    return { latitude, longitude };
  });
  const openRing = positions.length > 1 &&
    positions[0].latitude === positions.at(-1)?.latitude &&
    positions[0].longitude === positions.at(-1)?.longitude
    ? positions.slice(0, -1)
    : positions;
  if (openRing.length < 3) throw new Error(`${field}.geometry outer ring must contain three unique positions`);
  return {
    id,
    temperatureC,
    footprint: openRing,
    latitude: openRing.reduce((sum, position) => sum + position.latitude, 0) / openRing.length,
    longitude: openRing.reduce((sum, position) => sum + position.longitude, 0) / openRing.length,
  };
}

function parseCapture(value: unknown, captureIndex: number): ParsedCapture {
  const field = `captures[${captureIndex}]`;
  if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.result)) {
    throw new Error(`${field} must contain request and result objects`);
  }
  if (value.schemaVersion !== 1) throw new Error(`${field}.schemaVersion must be 1`);
  if (value.request.granularityM !== 100 || value.request.analyticType !== "tcm") {
    throw new Error(`${field} must be a 100 m tcm capture`);
  }
  const mapData = value.result.map_data;
  if (!isRecord(mapData) || mapData.type !== "FeatureCollection" || !Array.isArray(mapData.features)) {
    throw new Error(`${field}.result.map_data must be a FeatureCollection`);
  }
  const tiles = mapData.features.map((feature, featureIndex) => parseTile(feature, captureIndex, featureIndex));
  if (tiles.length < 2) throw new Error(`${field} must contain at least two tiles`);
  const ids = new Set<number>();
  for (const tile of tiles) {
    if (ids.has(tile.id)) throw new Error(`${field} contains duplicate tile ${tile.id}`);
    ids.add(tile.id);
  }
  return {
    date: requiredString(value.request.date, `${field}.request.date`),
    time: requiredString(value.request.time, `${field}.request.time`),
    activityId: requiredString(value.activityId, `${field}.activityId`),
    tiles: tiles.sort((left, right) => left.id - right.id),
  };
}

function squaredDistance(left: ParsedTile, right: ParsedTile): number {
  const longitudeScale = Math.cos((left.latitude * Math.PI) / 180);
  return (left.latitude - right.latitude) ** 2 + ((left.longitude - right.longitude) * longitudeScale) ** 2;
}

function selectSpatiallyDistributedTiles(tiles: ParsedTile[], count: number): ParsedTile[] {
  if (count >= tiles.length) return [...tiles];
  const selected = [tiles[0]];
  const remaining = tiles.slice(1);
  while (selected.length < count) {
    remaining.sort((left, right) => {
      const leftDistance = Math.min(...selected.map((picked) => squaredDistance(left, picked)));
      const rightDistance = Math.min(...selected.map((picked) => squaredDistance(right, picked)));
      return rightDistance - leftDistance || left.id - right.id;
    });
    selected.push(remaining.shift() as ParsedTile);
  }
  return selected.sort((left, right) => left.id - right.id);
}

function sameFootprint(left: ParsedTile, right: ParsedTile): boolean {
  return left.footprint.length === right.footprint.length && left.footprint.every((position, index) =>
    position.latitude === right.footprint[index].latitude && position.longitude === right.footprint[index].longitude,
  );
}

export function mapFortyGuardHourlyCaptures(
  input: unknown[],
  options: MapperOptions,
): ThermalCohort {
  if (!Array.isArray(input) || input.length < 2) throw new Error("At least two hourly FortyGuard captures are required");
  if (!/^[-+]\d{2}:\d{2}$/.test(options.utcOffset)) throw new Error("utcOffset must use ±HH:MM format");
  const captures = input.map(parseCapture).sort((left, right) =>
    `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
  );
  const reference = captures[0].tiles;
  const referenceById = new Map(reference.map((tile) => [tile.id, tile]));
  for (const [captureIndex, capture] of captures.entries()) {
    if (capture.tiles.length !== reference.length) throw new Error(`Capture ${captureIndex} changed tile count`);
    for (const tile of capture.tiles) {
      const expected = referenceById.get(tile.id);
      if (!expected || !sameFootprint(expected, tile)) throw new Error(`Capture ${captureIndex} changed tile ${tile.id}`);
    }
  }
  const locationCount = options.locationCount ?? 10;
  if (!Number.isInteger(locationCount) || locationCount < 2 || locationCount > reference.length) {
    throw new Error(`locationCount must be an integer from 2 to ${reference.length}`);
  }
  const selected = selectSpatiallyDistributedTiles(reference, locationCount);
  const capturesByTile = captures.map((capture) => ({
    timestamp: `${capture.date}T${capture.time}:00${options.utcOffset}`,
    tiles: new Map(capture.tiles.map((tile) => [tile.id, tile])),
  }));
  const locations: ThermalLocation[] = selected.map((tile) => ({
    id: `fg-tile-${String(tile.id).padStart(3, "0")}`,
    name: `Phoenix 100m Tile ${String(tile.id).padStart(2, "0")}`,
    areaLabel: "Central Phoenix observed grid",
    latitude: tile.latitude,
    longitude: tile.longitude,
    footprint: tile.footprint,
    samples: capturesByTile.map((capture) => ({
      timestamp: capture.timestamp,
      temperatureC: (capture.tiles.get(tile.id) as ParsedTile).temperatureC,
    })),
    tags: ["fortyguard-observed", "100m-grid"],
  }));
  return normalizeThermalCohort({
    id: options.id,
    name: options.name,
    timezone: options.timezone,
    source: {
      label: "FortyGuard observed hourly ambient-air temperature · historical 100 m snapshot",
      kind: "fortyguard",
      snapshotId: options.snapshotId,
      granularityM: options.granularityM,
      capturedAt: options.capturedAt,
    },
    thresholdC: options.thresholdC,
    locations,
  });
}
