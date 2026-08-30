/** A provider-neutral observation at one location and instant. */
export interface ThermalSample {
  /** ISO-8601 timestamp. An explicit UTC offset is required. */
  timestamp: string;
  temperatureC: number;
  /** Use this when the provider already exposes an apparent temperature. */
  apparentTemperatureC?: number;
  /** Used with wind speed to derive the BOM apparent-temperature proxy. */
  relativeHumidityPercent?: number;
  windSpeedMps?: number;
}

/** A location and its chronological thermal series, independent of any API shape. */
export interface ThermalLocation {
  id: string;
  name: string;
  areaLabel: string;
  latitude: number;
  longitude: number;
  /** Optional provider-neutral polygon footprint in latitude/longitude order. */
  footprint?: Array<{ latitude: number; longitude: number }>;
  samples: ThermalSample[];
  /** Optional domain-known adjacency. The engine falls back to nearest locations. */
  neighborIds?: string[];
  tags?: string[];
}

export interface ThermalCohort {
  id: string;
  name: string;
  timezone: string;
  source: {
    label: string;
    kind: "synthetic" | "fortyguard" | "other";
    snapshotId?: string;
    granularityM?: number;
    capturedAt?: string;
  };
  /** The comparison threshold used for persistence and excess degree-hours. */
  thresholdC: number;
  locations: ThermalLocation[];
}

export type ApparentTemperatureMethod =
  | "provided"
  | "bom-derived"
  | "mixed"
  | "unavailable";

export interface ThermalFeatures {
  observedDurationHours: number;
  peakTemperatureC: number;
  peakTimestamp: string;
  peakOffsetHours: number;
  meanTemperatureC: number;
  totalExceedanceHours: number;
  longestPersistenceHours: number;
  degreeHoursAboveThresholdC: number;
  recoveryRateCPerHour: number | null;
  recoveryWindowHours: number | null;
  temporalVariabilityIqrCPerHour: number;
  meanApparentTemperatureC: number | null;
  apparentTemperatureMethod: ApparentTemperatureMethod;
  /** How much the observed peak exceeds the time-weighted mean. */
  peakToMeanGapC: number;
  /** Signed: positive is hotter than neighbors, negative is cooler. */
  localDeviationC: number | null;
  neighborCount: number;
}

export interface ThermalScores {
  /** Higher means a more severe peak relative to this cohort. */
  peak: number;
  /** Higher means more time above the cohort threshold. */
  stamina: number;
  /** Higher means faster post-peak cooling. */
  recovery: number | null;
  /** Higher means a lower (more comfortable) apparent temperature. */
  comfort: number | null;
  /** Higher means more irregular changes in the interval temperature-change rate. */
  chaos: number;
  /** Higher means a larger absolute signed departure from same-hour neighbor medians. */
  surprise: number | null;
  /** Higher means the peak arrives later in the shared observation window. */
  latePeak: number;
  /** Heat Pressure = 50% Peak + 50% Stamina. Not a quality, safety, or health score. */
  heatPressure: number;
}

export type ArchetypeId =
  | "furnace"
  | "oasis"
  | "night-owl"
  | "marathoner"
  | "comeback-kid"
  | "chaos-merchant"
  | "balanced-operator";

export interface MetricEvidence {
  metric:
    | keyof ThermalFeatures
    | keyof ThermalScores
    | "archetype"
    | "rank"
    | "behaviorDistance"
    | "meanDifferenceC";
  label: string;
  value: number | string;
  unit?: string;
  interpretation: string;
}

export interface ThermalArchetype {
  id: ArchetypeId;
  name: string;
  summary: string;
  reasons: MetricEvidence[];
}

export interface ScoutedLocation extends ThermalLocation {
  features: ThermalFeatures;
  scores: ThermalScores;
  archetype: ThermalArchetype;
}

export interface CelsiusScoutAnalysis {
  cohort: Omit<ThermalCohort, "locations"> & {
    locationCount: number;
    startTimestamp: string;
    endTimestamp: string;
  };
  locations: ScoutedLocation[];
  methodology: string[];
}

export interface ScoutToolContext {
  cohortId: string;
  cohortName: string;
  cohortSize: number;
  thresholdC: number;
  sourceLabel: string;
  isSynthetic: boolean;
}

export interface ScoutToolResult<T> {
  tool: string;
  question: string;
  answer: string;
  data: T;
  evidence: MetricEvidence[];
  context: ScoutToolContext;
  methodology: string[];
}
