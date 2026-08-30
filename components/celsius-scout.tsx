"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import {
  analyzeCohort,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  inspectLocation,
  summarizeAverageMasking,
  type CelsiusScoutAnalysis,
  type ScoutedLocation,
  type ThermalCohort,
} from "../lib";
import { demoStory, personaFor, snapshotStory } from "../lib/scout-lore";
import { HeatGrid, type MapLocation } from "./heat-grid";

type MetricKey = "peak" | "stamina" | "recovery" | "comfort" | "chaos" | "surprise";
type EvidenceFact = { label: string; value: string };

interface ScoutLocation extends MapLocation {
  label: string;
  alias: string;
  epithet: string;
  pitch: string;
  portrait?: string;
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

interface Mission {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  prompt: string;
  result: string;
  selectedIds: string[];
  tool: string;
  evidence: EvidenceFact[];
}

interface AgentReport {
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

const ARCHETYPE_ACCENTS: Record<string, string> = {
  furnace: "#e25a2a",
  oasis: "#1f8a86",
  "night-owl": "#6b5cae",
  marathoner: "#d4892a",
  "comeback-kid": "#2a8eb8",
  "chaos-merchant": "#c5d84a",
  "balanced-operator": "#8a8176",
};

const SCOUT_PROMPTS = [
  "Find an underrated cool location.",
  "Find the biggest thermal fraud.",
  "Draft the coolest five.",
];

function decimal(value: number): string {
  const places = Math.abs(value) > 0 && Math.abs(value) < 0.1 ? 3 : 1;
  return Number(value.toFixed(places)).toFixed(places);
}

function duration(value: number | null): string {
  if (value === null) return "Unavailable";
  const minutes = Math.round(value * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function localTime(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function codeFor(location: ScoutedLocation): string {
  if (location.id.startsWith("fg-tile-")) return location.id.slice(-3);
  return location.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

function mapTone(percentile: number): MapLocation["tone"] {
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

function analysisBounds(analysis: CelsiusScoutAnalysis): GeographicBounds {
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

function mapGeometry(location: ScoutedLocation, bounds: GeographicBounds) {
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

function toViewLocation(
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
  const persona = personaFor(location.id);

  return {
    id: location.id,
    code: codeFor(location),
    name: location.name,
    alias: persona?.alias ?? location.name,
    epithet: persona?.epithet ?? location.archetype.name.replace(/^The /, ""),
    pitch: persona?.pitch ?? location.archetype.summary,
    portrait: persona?.portrait,
    label: location.tags?.[0]?.replaceAll("-", " ") ?? location.areaLabel,
    archetype: location.archetype.name,
    number: String(index + 1).padStart(2, "0"),
    accent: persona?.suit ?? ARCHETYPE_ACCENTS[location.archetype.id],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function agentLocationIds(report: AgentReport | null, locationById: Map<string, ScoutLocation>): string[] {
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

function missionsFor(analysis: CelsiusScoutAnalysis): Mission[] {
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
      blurb: "Find where a calm average hides a sharp peak.",
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
      blurb: "Two tiles with similar means and different thermal behavior.",
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
      blurb: "Build a lineup from the coolest tiles in this cohort.",
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
      blurb: "Who cools fastest after peak, when the trend is supported.",
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

interface Experience {
  analysis: CelsiusScoutAnalysis;
  averageMasking: ReturnType<typeof summarizeAverageMasking>;
  locations: ScoutLocation[];
  locationById: Map<string, ScoutLocation>;
  missions: Mission[];
}

function buildExperience(cohort: ThermalCohort): Experience {
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

function metricsFor(thresholdC: number): Array<{ key: MetricKey; code: string; label: string; hint: string }> {
  return [
    { key: "peak", code: "PEK", label: "Peak", hint: "maximum temperature" },
    { key: "stamina", code: "STA", label: "Stamina", hint: `longest continuous run above ${thresholdC}°C` },
    { key: "recovery", code: "REC", label: "Recovery", hint: "post-peak cooling speed" },
    { key: "comfort", code: "COM", label: "Comfort", hint: "apparent temperature; higher is more favorable" },
    { key: "chaos", code: "CHA", label: "Chaos", hint: "robust variability of temperature-change rates" },
    { key: "surprise", code: "SUR", label: "Surprise", hint: "absolute local deviation from neighbors" },
  ];
}

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const step = 320 / Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${index * step},${148 - ((value - minimum) / range) * 112}`).join(" ");
  const area = `0,168 ${points} ${(values.length - 1) * step},168`;
  const gradientId = `spark-fill-${accent.slice(1)}`;
  return (
    <svg className="sparkline" viewBox="0 0 320 168" preserveAspectRatio="none" role="img" aria-label={`Temperature series with a ${maximum.toFixed(1)} degree Celsius peak`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity=".55" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={values.indexOf(maximum) * step} cy="36" r="5.5" fill="#f7f1e4" stroke={accent} strokeWidth="3" />
    </svg>
  );
}

function ScoutCard({ location, thresholdC }: { location: ScoutLocation; thresholdC: number }) {
  const isSnapshot = location.dataBadge === "SNAPSHOT";
  const stats = metricsFor(thresholdC);
  return (
    <article
      className={`scout-card${isSnapshot ? " is-snapshot" : " is-synthetic"}`}
      style={{ "--card-accent": location.accent } as CSSProperties}
      aria-label={`${location.alias} thermal player card`}
    >
      <header className="card-top">
        <div className="card-overall">
          <strong>{location.heatPressure}</strong>
          <span>HP</span>
        </div>
        <div className="card-meta">
          <span className="card-edition">{location.dataBadge}</span>
          <span className="card-pos">{location.epithet}</span>
        </div>
      </header>
      <div className="card-portrait">
        {location.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={location.portrait} alt="" />
        ) : null}
        <Sparkline values={location.sparkline} accent={location.accent} />
        <span className="card-code">{location.code}</span>
      </div>
      <div className="card-identity">
        <p>{location.archetype}</p>
        <h2>{location.alias}</h2>
        <small>{location.name} · {location.startTime}–{location.endTime} · {location.temperatureLabel}° at {location.peakTime}</small>
      </div>
      <div className="fifa-stats">
        {stats.map((metric) => {
          const value = location.metrics[metric.key];
          const unavailable = value.percentile === null;
          return (
            <div
              key={metric.key}
              className={unavailable ? "is-void" : undefined}
              aria-label={`${metric.label}: ${unavailable ? "unavailable" : `percentile ${value.percentile}`}; ${value.raw}. ${metric.hint}`}
            >
              <strong>{unavailable ? "—" : value.percentile}</strong>
              <span>{metric.code}</span>
              <small>{unavailable ? "Unavailable" : value.raw}</small>
            </div>
          );
        })}
      </div>
      <p className="card-pitch">{location.pitch}</p>
    </article>
  );
}

function RatingsGuide({ analysis }: { analysis: CelsiusScoutAnalysis }) {
  const comfortInput = analysis.cohort.source.kind === "fortyguard"
    ? "This temperature-only snapshot has no humidity, wind, or supplied apparent temperature, so Comfort is unavailable."
    : "This demo includes humidity and wind inputs for the documented apparent-temperature proxy.";
  return (
    <div className="ratings-guide" aria-labelledby="ratings-guide-title">
      <header className="ratings-guide-intro">
        <h3 id="ratings-guide-title">What every stat represents</h3>
        <p>Cards pair a raw measurement with a 0–100 rating. The rating is an average-rank percentile inside <strong>{analysis.cohort.name}</strong> only; it is not a universal city score.</p>
      </header>
      <div className="ratings-guide-grid">
        <article><span className="guide-code">HP</span><h4>Heat Pressure</h4><p><strong>50% Peak percentile + 50% Stamina percentile.</strong> Relative thermal intensity—not comfort, danger, health risk, or overall quality.</p></article>
        <article><span className="guide-code">PEK</span><h4>Peak</h4><p>The highest captured temperature in the active series. A higher rating means a higher maximum relative to this cohort.</p></article>
        <article><span className="guide-code">STA</span><h4>Stamina</h4><p>The longest uninterrupted interpolated run above <strong>{analysis.cohort.thresholdC}°C</strong>. Duration, not temperature; separate from total exceedance.</p></article>
        <article><span className="guide-code">REC</span><h4>Recovery</h4><p>Supported post-peak cooling trend (°C/hour). Insufficient post-peak samples produce “Unavailable.”</p></article>
        <article><span className="guide-code">COM</span><h4>Comfort</h4><p>Lower time-weighted apparent temperature earns a higher rating. {comfortInput}</p></article>
        <article><span className="guide-code">CHA</span><h4>Chaos</h4><p>IQR of successive changes in temperature-change rates. Higher means a more irregular profile.</p></article>
        <article><span className="guide-code">SUR</span><h4>Surprise</h4><p>Size of median same-hour deviation from nearest sampled tiles. Rating uses absolute size; raw sign keeps direction.</p></article>
        <article><span className="guide-code">RAW</span><h4>Supporting evidence</h4><p>Exceedance is total interpolated time above threshold. Peak time is the earliest observed maximum.</p></article>
      </div>
    </div>
  );
}

export function CelsiusScout({ cohorts }: { cohorts: ThermalCohort[] }) {
  const [activeCohortId, setActiveCohortId] = useState(cohorts[0]?.id ?? "");
  const activeCohort = cohorts.find((cohort) => cohort.id === activeCohortId) ?? cohorts[0];
  if (!activeCohort) throw new Error("Celsius Scout requires at least one cohort");
  const experience = useMemo(() => buildExperience(activeCohort), [activeCohort]);
  const { analysis, averageMasking, locations, locationById, missions } = experience;
  const [activeMissionId, setActiveMissionId] = useState("thermal-fraud");
  const [selectedId, setSelectedId] = useState("");
  const [manualSelection, setManualSelection] = useState(false);
  const [question, setQuestion] = useState("Find an underrated cool location.");
  const [agentReport, setAgentReport] = useState<AgentReport | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const activeMission = missions.find((mission) => mission.id === activeMissionId) ?? missions[0];
  const selectedLocation = locationById.get(selectedId) ?? locationById.get(activeMission.selectedIds[0]) ?? locations[0];
  const reportLocationIds = agentLocationIds(agentReport, locationById);
  const selectedIds = agentReport
    ? (reportLocationIds.length ? reportLocationIds : [selectedId])
    : manualSelection ? [selectedId] : activeMission.selectedIds;
  const selectedNames = selectedIds.map((id) => locationById.get(id)?.name).filter(Boolean) as string[];
  const isObserved = analysis.cohort.source.kind === "fortyguard";
  const narrowSnapshotSpread = isObserved && averageMasking.spatialMeanRangeC < 0.1;
  const spatialPrecision = averageMasking.spatialMeanRangeC < 0.1 ? 3 : 1;
  const windowDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: analysis.cohort.timezone,
  }).format(new Date(analysis.cohort.startTimestamp));

  const agentEvidence = agentReport?.trace.at(-1)?.result.evidence.slice(0, 3).map((item) => ({
    label: item.label,
    value: `${item.value}${item.unit ? ` ${item.unit}` : ""}`,
  }));
  const visibleEvidence = agentEvidence ?? (manualSelection
    ? [
      { label: "Peak", value: `${selectedLocation.temperatureLabel}°C · P${selectedLocation.metrics.peak.percentile}` },
      { label: "Exceedance / longest", value: `${selectedLocation.exceedance} / ${selectedLocation.stamina}` },
      { label: "Recovery", value: selectedLocation.recoveryRate === null ? "Unavailable" : `${selectedLocation.recoveryRate.toFixed(1)}°C / h` },
    ]
    : activeMission.evidence);

  function runMission(mission: Mission) {
    setAgentReport(null);
    setAgentError(null);
    setActiveMissionId(mission.id);
    setSelectedId(mission.selectedIds[0]);
    setManualSelection(false);
  }

  function switchCohort(cohortId: string) {
    setActiveCohortId(cohortId);
    setActiveMissionId("thermal-fraud");
    setSelectedId("");
    setManualSelection(false);
    setAgentReport(null);
    setAgentError(null);
  }

  function inspect(id: string) {
    setAgentReport(null);
    setAgentError(null);
    setSelectedId(id);
    setManualSelection(true);
  }

  async function askScout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAgentLoading(true);
    setAgentError(null);
    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, cohortId: analysis.cohort.id }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRecord(payload) || !Array.isArray(payload.trace)) throw new Error("The scout could not complete that brief");
      const report = payload as unknown as AgentReport;
      setAgentReport(report);
      setManualSelection(false);
      const nextId = agentLocationIds(report, locationById)[0];
      if (nextId) setSelectedId(nextId);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "The scout could not complete that brief");
    } finally {
      setAgentLoading(false);
    }
  }

  function openGuide(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const panel = document.getElementById("how-it-works");
    if (panel instanceof HTMLDetailsElement) {
      panel.open = true;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const inspection = manualSelection && !agentReport ? inspectLocation(analysis, selectedLocation.id) : null;
  const reportTitle = agentReport
    ? `${agentReport.mode === "llm" ? "Scout agent" : "Deterministic scout"}`
    : manualSelection
      ? "Free inspection"
      : activeMission.title;

  return (
    <main className="desk" id="top">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Celsius Scout home">
          <span className="brand-mark" aria-hidden="true">CS</span>
          <span className="brand-copy">
            <strong>Celsius Scout</strong>
            <small>Thermal player cards for city heat</small>
          </span>
        </a>
        <div className="masthead-actions">
          <div className="mode-switch" role="group" aria-label="Data mode">
            {cohorts.map((cohort) => (
              <button
                key={cohort.id}
                type="button"
                className={cohort.id === analysis.cohort.id ? "is-active" : ""}
                onClick={() => switchCohort(cohort.id)}
                aria-pressed={cohort.id === analysis.cohort.id}
              >
                {cohort.source.kind === "fortyguard" ? "Historical Snapshot" : "Synthetic Demo"}
              </button>
            ))}
          </div>
          <a href="#how-it-works" className="ghost-link" onClick={openGuide}>How ratings work</a>
        </div>
      </header>

      <section className="combine-story">
        <p className="kicker">The Phoenix Combine</p>
        <p>{isObserved ? snapshotStory : demoStory}</p>
      </section>

      <section className="context-bar" aria-label="Active comparison cohort">
        <span className={`mode-pill${isObserved ? " is-snapshot" : " is-demo"}`}>
          {isObserved ? "Historical Snapshot" : "Synthetic Demo"}
        </span>
        <p>
          <strong>{analysis.cohort.name}.</strong>{" "}
          {isObserved
            ? "Pinned FortyGuard capture — not live conditions or a forecast."
            : "Labeled synthetic fixture for contrasting archetypes."}
        </p>
        <dl>
          <div><dt>Window</dt><dd>{windowDate} · {localTime(analysis.cohort.startTimestamp, analysis.cohort.timezone)}–{localTime(analysis.cohort.endTimestamp, analysis.cohort.timezone)}</dd></div>
          <div><dt>Tiles</dt><dd>{analysis.cohort.locationCount} profiles</dd></div>
          <div><dt>Threshold</dt><dd>Above {analysis.cohort.thresholdC}°C</dd></div>
          <div><dt>{isObserved ? "Grid" : "Ratings"}</dt><dd>{isObserved ? `${analysis.cohort.source.granularityM} m` : "Cohort percentiles"}</dd></div>
        </dl>
      </section>

      <section className="mission-bar" aria-label="Scouting missions">
        <div className="mission-tabs">
          {missions.map((mission) => {
            const active = !agentReport && !manualSelection && activeMission.id === mission.id;
            return (
              <button
                key={mission.id}
                type="button"
                className={`mission-tab${active ? " is-active" : ""}`}
                onClick={() => runMission(mission)}
                aria-pressed={active}
              >
                <small>{mission.kicker}</small>
                {mission.title}
              </button>
            );
          })}
        </div>
        <p className="mission-blurb">{activeMission.blurb}</p>
      </section>

      <section className="pitch" aria-label="Map and selected thermal card">
        <div className="pitch-map">
          <header className="pitch-heading">
            <div>
              <p className="kicker">Board</p>
              <h2>Phoenix combine</h2>
            </div>
            <p className="map-caption">{isObserved ? "Returned FortyGuard 100 m polygons. Click a tile to inspect its card." : "Synthetic footprints. Click a tile to inspect its card."}</p>
          </header>
          <HeatGrid locations={locations} selectedIds={selectedIds} inspectedId={selectedLocation.id} onSelect={inspect} />
        </div>
        <div className="pitch-card">
          <header className="pitch-heading">
            <div>
              <p className="kicker">Player card</p>
              <h2>Selected tile</h2>
            </div>
          </header>
          <ScoutCard key={selectedLocation.id} location={selectedLocation} thresholdC={analysis.cohort.thresholdC} />
          <p className="card-read">{selectedLocation.pitch} {selectedLocation.evidence}</p>
        </div>
      </section>

      <section className="report" aria-live="polite">
        <div className="report-copy">
          <p className="kicker">Scout report · {reportTitle}</p>
          <h2>{agentReport?.question ?? inspection?.question ?? activeMission.prompt}</h2>
          <p>{agentReport?.explanation ?? (manualSelection ? selectedLocation.evidence : activeMission.result)}</p>
          {agentReport?.fallbackReason ? <p className="report-fallback">Fallback: {agentReport.fallbackReason}</p> : null}
          {selectedNames.length > 1 ? (
            <div className="selection-strip" aria-label="Selected locations">
              {selectedNames.map((name) => <span key={name}>{name}</span>)}
            </div>
          ) : null}
        </div>
        <div className="report-facts">
          {visibleEvidence.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <p className="report-tool">
          Executed tool{" "}
          <code>{(agentReport?.trace.at(-1)?.tool ?? inspection?.tool ?? activeMission.tool) + "()"}</code>
        </p>
      </section>

      <section className="ask-panel" aria-labelledby="ask-title">
        <div className="ask-copy">
          <p className="kicker">Ask the scout</p>
          <h2 id="ask-title">A natural-language brief, same tools.</h2>
          <p>Code still owns every number. Without a model key, the deterministic scout runs the matching tool.</p>
        </div>
        <form className="ask-form" onSubmit={askScout}>
          <label htmlFor="scout-question">Scout question</label>
          <textarea
            id="scout-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={3}
          />
          <div className="ask-prompts">
            {SCOUT_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <button type="submit" className="ask-submit" disabled={agentLoading || !question.trim()}>
            {agentLoading ? "Scouting…" : "Run brief"}
          </button>
          {agentError ? <p role="alert">{agentError}</p> : null}
        </form>
      </section>

      <section className={`average-panel${narrowSnapshotSpread ? " is-uniform" : ""}`} aria-labelledby="average-title">
        <div>
          <p className="kicker">The Average Is Lying</p>
          <h2 id="average-title">{narrowSnapshotSpread ? "This snapshot is nearly spatially uniform." : "One number hides the local spread."}</h2>
          <p>
            {narrowSnapshotSpread
              ? `Selected tile means differ by only ${averageMasking.spatialMeanRangeC.toFixed(spatialPrecision)}°C. That proves the captured-data path; it is not strong evidence of heterogeneous local heat. Switch to Synthetic Demo to see a more varied cohort.`
              : `The broad cohort mean is ${averageMasking.representativeMeanC.toFixed(1)}°C, but local time-weighted means span ${averageMasking.spatialMeanRangeC.toFixed(spatialPrecision)}°C.`}
          </p>
        </div>
        <div className="average-stats">
          <div><span>Broad mean</span><strong>{averageMasking.representativeMeanC.toFixed(spatialPrecision)}°C</strong><small>mean of local time-weighted means</small></div>
          <div><span>Local range</span><strong>{averageMasking.coolestMeanC.toFixed(spatialPrecision)}–{averageMasking.hottestMeanC.toFixed(spatialPrecision)}°C</strong><small>{averageMasking.coolestLocation.name} → {averageMasking.hottestLocation.name}</small></div>
          <div><span>Exposure share</span><strong>{averageMasking.tileHoursAboveThresholdPercent.toFixed(1)}%</strong><small>of captured tile-hours above {analysis.cohort.thresholdC}°C</small></div>
        </div>
      </section>

      <details className="method" id="how-it-works">
        <summary>How ratings work, provenance, and claim boundaries</summary>
        <RatingsGuide analysis={analysis} />
        <div className="method-notes">
          <p><strong>Data honesty.</strong> {isObserved ? `This view uses a captured FortyGuard historical TCM snapshot (${analysis.cohort.source.snapshotId}); switch to Synthetic Demo for the labeled fallback.` : "This view uses the labeled synthetic Phoenix fallback; switch to Historical Snapshot for captured FortyGuard data."} Ratings are recomputed from the active cohort.</p>
          <p><strong>Interpretation.</strong> Heat Pressure is 50% Peak plus 50% Stamina. Surprise compares the nearest sampled cohort tiles; it is not statistical significance. These are comparison tools—not health, safety, or causal claims.</p>
          <p><strong>Percentiles.</strong> The cohort minimum maps to 0 and maximum to 100. Ties share their average rank. Missing inputs stay unavailable and do not enter the ranking.</p>
        </div>
      </details>
    </main>
  );
}
