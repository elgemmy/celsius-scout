import {
  analyzeCohort,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  summarizeAverageMasking,
  type CelsiusScoutAnalysis,
  type ScoutedLocation,
  type ThermalCohort,
} from "../lib";
import type { MapLocation } from "./heat-grid";

export type MetricKey = "peak" | "stamina" | "recovery" | "comfort" | "chaos" | "surprise";
export type EvidenceFact = { label: string; value: string };

export interface ScoutLocation extends MapLocation {
  label: string;
  archetype: string;
  number: string;
  accent: string;
  heatPressure: number;
  exceedance: string;
  stamina: string;
  recoveryRate: number | null;
  peakTime: string;
  startTime: string;
  endTime: string;
  metrics: Record<MetricKey, { percentile: number | null; raw: string }>;
  sparkline: number[];
  evidence: string;
  dataBadge: string;
  temperatureLabel: string;
}

export interface Mission {
  id: string;
  kicker: string;
  title: string;
  prompt: string;
  result: string;
  selectedIds: string[];
  tool: string;
  evidence: EvidenceFact[];
}

export interface AgentReport {
  mode: "deterministic" | "llm";
  question: string;
  explanation: string;
  fallbackReason?: string;
  trace: Array<{
    tool: string;
    result: {
      data: unknown;
      evidence: Array<{ label: string; value: string | number; unit?: string }>;
    };
  }>;
}

export const ARCHETYPE_ACCENTS: Record<string, string> = {
  furnace: "#ff713b",
  oasis: "#52d5be",
  "night-owl": "#9e87ff",
  marathoner: "#ffb13b",
  "comeback-kid": "#68d8ff",
  "chaos-merchant": "#d9ff5a",
  "balanced-operator": "#a9b7b4",
};

export function decimal(value: number): string {
  const places = Math.abs(value) > 0 && Math.abs(value) < 0.1 ? 3 : 1;
  return Number(value.toFixed(places)).toFixed(places);
}

export function duration(value: number | null): string {
  if (value === null) return "Unavailable";
  const minutes = Math.round(value * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function localTime(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(timestamp));
}

export function codeFor(location: ScoutedLocation): string {
  if (location.id.startsWith("fg-tile-")) return location.id.slice(-3);
  return location.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

export function mapTone(percentile: number): MapLocation["tone"] {
  if (percentile >= 85) return "extreme";
  if (percentile >= 65) return "hot";
  if (percentile >= 45) return "warm";
  if (percentile >= 25) return "mild";
  return "cool";
}

interface GeographicBounds {
  latitudeMin: number;
  latitudeMax: number;
  longitudeMin: number;
  longitudeMax: number;
}

export function analysisBounds(analysis: CelsiusScoutAnalysis): GeographicBounds {
  const positions = analysis.locations.flatMap((location) =>
    location.footprint?.length ? location.footprint : [{ latitude: location.latitude, longitude: location.longitude }],
  );
  return {
    latitudeMin: Math.min(...positions.map((position) => position.latitude)),
    latitudeMax: Math.max(...positions.map((position) => position.latitude)),
    longitudeMin: Math.min(...positions.map((position) => position.longitude)),
    longitudeMax: Math.max(...positions.map((position) => position.longitude)),
  };
}

export function mapGeometry(location: ScoutedLocation, bounds: GeographicBounds) {
  const longitudeRange = bounds.longitudeMax - bounds.longitudeMin || 1;
  const latitudeRange = bounds.latitudeMax - bounds.latitudeMin || 1;
  if (!location.footprint?.length) {
    return {
      x: 5 + ((location.longitude - bounds.longitudeMin) / longitudeRange) * 74,
      y: 7 + ((bounds.latitudeMax - location.latitude) / latitudeRange) * 69,
      width: 15,
      height: 18,
    };
  }
  const west = Math.min(...location.footprint.map((position) => position.longitude));
  const east = Math.max(...location.footprint.map((position) => position.longitude));
  const south = Math.min(...location.footprint.map((position) => position.latitude));
  const north = Math.max(...location.footprint.map((position) => position.latitude));
  const width = ((east - west) / longitudeRange) * 90;
  const height = ((north - south) / latitudeRange) * 86;
  const clipPath = `polygon(${location.footprint.map((position) => {
    const x = ((position.longitude - west) / (east - west || 1)) * 100;
    const y = ((north - position.latitude) / (north - south || 1)) * 100;
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  }).join(", ")})`;
  return {
    x: 5 + ((west - bounds.longitudeMin) / longitudeRange) * 90,
    y: 5 + ((bounds.latitudeMax - north) / latitudeRange) * 86,
    width,
    height,
    clipPath,
  };
}

export function toViewLocation(
  location: ScoutedLocation,
  index: number,
  analysis: CelsiusScoutAnalysis,
  bounds: GeographicBounds,
): ScoutLocation {
  const { features, scores } = location;
  const geometry = mapGeometry(location, bounds);
  const peakValues = analysis.locations.map((candidate) => candidate.features.peakTemperatureC);
  const peakPrecision = Math.max(...peakValues) - Math.min(...peakValues) < 0.1 ? 2 : 1;
  const signedDeviation = features.localDeviationC === null
    ? "Unavailable"
    : `${features.localDeviationC >= 0 ? "+" : ""}${decimal(features.localDeviationC)}°C`;

  return {
    id: location.id,
    code: codeFor(location),
    name: location.name,
    label: location.tags?.[0]?.replaceAll("-", " ") ?? location.areaLabel,
    archetype: location.archetype.name,
    number: String(index + 1).padStart(2, "0"),
    accent: ARCHETYPE_ACCENTS[location.archetype.id],
    heatPressure: scores.heatPressure,
    temperatureC: features.peakTemperatureC,
    exceedance: duration(features.totalExceedanceHours),
    stamina: duration(features.longestPersistenceHours),
    recoveryRate: features.recoveryRateCPerHour,
    peakTime: localTime(features.peakTimestamp, analysis.cohort.timezone),
    startTime: localTime(location.samples[0].timestamp, analysis.cohort.timezone),
    endTime: localTime(location.samples.at(-1)?.timestamp ?? location.samples[0].timestamp, analysis.cohort.timezone),
    metrics: {
      peak: { percentile: scores.peak, raw: `${decimal(features.peakTemperatureC)}°C` },
      stamina: { percentile: scores.stamina, raw: duration(features.longestPersistenceHours) },
      recovery: { percentile: scores.recovery, raw: features.recoveryRateCPerHour === null ? "Unavailable" : `${decimal(features.recoveryRateCPerHour)}°C/h` },
      comfort: { percentile: scores.comfort, raw: features.meanApparentTemperatureC === null ? "Unavailable" : `${decimal(features.meanApparentTemperatureC)}°C` },
      chaos: { percentile: scores.chaos, raw: `${decimal(features.temporalVariabilityIqrCPerHour)}°C/h` },
      surprise: { percentile: scores.surprise, raw: signedDeviation },
    },
    sparkline: location.samples.map((sample) => sample.temperatureC),
    evidence: `${location.archetype.summary} ${location.archetype.reasons.map((reason) => `${reason.label}: ${reason.value}${reason.unit ? ` ${reason.unit}` : ""}`).join(" · ")}.`,
    dataBadge: analysis.cohort.source.kind === "fortyguard" ? "SNAPSHOT" : "SYNTHETIC",
    temperatureLabel: features.peakTemperatureC.toFixed(peakPrecision),
    ...geometry,
    tone: mapTone(scores.peak),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function agentLocationIds(report: AgentReport | null, locationById: Map<string, ScoutLocation>): string[] {
  const ids = new Set<string>();
  const addLocation = (value: unknown) => {
    if (isRecord(value) && typeof value.id === "string" && locationById.has(value.id)) ids.add(value.id);
  };
  const finalEntry = report?.trace.at(-1);
  for (const entry of finalEntry ? [finalEntry] : []) {
    const data = entry.result.data;
    if (Array.isArray(data)) data.forEach((item) => isRecord(item) && addLocation(item.location));
    if (isRecord(data)) {
      addLocation(data.location);
      addLocation(data.first);
      addLocation(data.second);
    }
  }
  return [...ids];
}

export function missionsFor(analysis: CelsiusScoutAnalysis): Mission[] {
  const coolest = findCoolestLineup(analysis, 5);
  const fraud = findBiggestThermalFraud(analysis);
  const twins = findSimilarAverageDifferentBehaviorPair(analysis);
  const recovery = analysis.locations.some((location) => location.features.recoveryRateCPerHour !== null)
    ? findFastestRecovery(analysis)
    : null;
  return [
    {
      id: "thermal-fraud",
      kicker: "Expose",
      title: "Thermal fraud",
      prompt: fraud.question,
      result: `${fraud.answer} “Fraud” means average masking—not deception.`,
      selectedIds: [fraud.data.location.id],
      tool: fraud.tool,
      evidence: [
        { label: "Time-weighted mean", value: `${decimal(fraud.data.location.features.meanTemperatureC)}°C` },
        { label: "Observed peak", value: `${decimal(fraud.data.location.features.peakTemperatureC)}°C` },
        { label: "Peak − mean", value: `${decimal(fraud.data.location.features.peakToMeanGapC)}°C` },
      ],
    },
    {
      id: "different-twins",
      kicker: "Compare",
      title: "Different twins",
      prompt: twins.question,
      result: `${twins.answer} Their thermal profiles diverge despite similar means.`,
      selectedIds: [twins.data.first.id, twins.data.second.id],
      tool: twins.tool,
      evidence: [
        { label: "Pair", value: `${twins.data.first.name} / ${twins.data.second.name}` },
        { label: "Mean gap", value: `${decimal(twins.data.meanDifferenceC)}°C` },
        { label: "Behavior gap", value: `${decimal(twins.data.behaviorDistance)} percentile pts` },
      ],
    },
    {
      id: "coolest-five",
      kicker: "Draft",
      title: "Coolest five",
      prompt: coolest.question,
      result: `${coolest.data[0].location.name} captains: ${coolest.data.map((pick) => pick.location.name).join(", ")}.`,
      selectedIds: coolest.data.map((pick) => pick.location.id),
      tool: coolest.tool,
      evidence: [
        { label: "Captain", value: coolest.data[0].location.name },
        { label: "Selection score", value: `${coolest.data[0].selectionScore} / 100` },
        { label: "Picks", value: `${coolest.data.length} / ${analysis.cohort.locationCount}` },
      ],
    },
    ...(recovery ? [{
      id: "fastest-recovery",
      kicker: "Find",
      title: "Fastest recovery",
      prompt: recovery.question,
      result: recovery.answer,
      selectedIds: [recovery.data.location.id],
      tool: recovery.tool,
      evidence: [
        { label: "Location", value: recovery.data.location.name },
        { label: "Recovery", value: `${decimal(recovery.data.location.features.recoveryRateCPerHour as number)}°C / h` },
        { label: "Measured window", value: duration(recovery.data.location.features.recoveryWindowHours) },
      ],
    }] : []),
  ];
}

export interface Experience {
  analysis: CelsiusScoutAnalysis;
  averageMasking: ReturnType<typeof summarizeAverageMasking>;
  locations: ScoutLocation[];
  locationById: Map<string, ScoutLocation>;
  missions: Mission[];
}

export function buildExperience(cohort: ThermalCohort): Experience {
  const analysis = analyzeCohort(cohort);
  const bounds = analysisBounds(analysis);
  const locations = analysis.locations.map((location, index) => toViewLocation(location, index, analysis, bounds));
  return {
    analysis,
    averageMasking: summarizeAverageMasking(analysis),
    locations,
    locationById: new Map(locations.map((location) => [location.id, location])),
    missions: missionsFor(analysis),
  };
}

export function metricsFor(thresholdC: number): Array<{ key: MetricKey; label: string; hint: string }> {
  return [
    { key: "peak", label: "Peak", hint: "maximum temperature" },
    { key: "stamina", label: "Stamina", hint: `longest continuous run above ${thresholdC}°C` },
    { key: "recovery", label: "Recovery", hint: "post-peak cooling speed" },
    { key: "comfort", label: "Comfort", hint: "apparent temperature; higher is more favorable" },
    { key: "chaos", label: "Chaos", hint: "robust variability of temperature-change rates" },
    { key: "surprise", label: "Surprise", hint: "absolute local deviation from neighbors" },
  ];
}
