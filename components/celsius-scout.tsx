"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
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
import { HeatGrid, type MapLocation } from "./heat-grid";

type MetricKey = "peak" | "stamina" | "recovery" | "comfort" | "chaos" | "surprise";
type EvidenceFact = { label: string; value: string };

interface ScoutLocation extends MapLocation {
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
}

interface Mission {
  id: string;
  kicker: string;
  title: string;
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
  furnace: "#ff713b",
  oasis: "#52d5be",
  "night-owl": "#9e87ff",
  marathoner: "#ffb13b",
  "comeback-kid": "#68d8ff",
  "chaos-merchant": "#d9ff5a",
  "balanced-operator": "#a9b7b4",
};

function decimal(value: number): string {
  return value.toFixed(1);
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
    dataBadge: analysis.cohort.source.kind === "fortyguard" ? "OBSERVED" : "SYNTHETIC",
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
  for (const entry of report?.trace ?? []) {
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
  const recovery = findFastestRecovery(analysis);
  return [
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
  },
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

function metricsFor(thresholdC: number): Array<{ key: MetricKey; label: string; hint: string }> {
  return [
  { key: "peak", label: "Peak", hint: "maximum temperature" },
  { key: "stamina", label: "Stamina", hint: `longest continuous run above ${thresholdC}°C` },
  { key: "recovery", label: "Recovery", hint: "post-peak cooling speed" },
  { key: "comfort", label: "Comfort", hint: "apparent temperature; higher is more favorable" },
  { key: "chaos", label: "Chaos", hint: "robust variability of temperature-change rates" },
  { key: "surprise", label: "Surprise", hint: "absolute local deviation from neighbors" },
  ];
}

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const step = 288 / Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${index * step},${64 - ((value - minimum) / range) * 52}`).join(" ");
  const area = `0,70 ${points} ${(values.length - 1) * step},70`;
  const gradientId = `spark-fill-${accent.slice(1)}`;
  return (
    <svg className="sparkline" viewBox="0 0 288 72" role="img" aria-label={`Temperature series with a ${maximum.toFixed(1)} degree Celsius peak`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".46" /><stop offset="1" stopColor={accent} stopOpacity="0" /></linearGradient></defs>
      <path d="M0 52H288M0 26H288" className="spark-grid" />
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={values.indexOf(maximum) * step} cy="12" r="4.5" fill={accent} stroke="#102126" strokeWidth="3" />
    </svg>
  );
}

function ScoutCard({ location, thresholdC }: { location: ScoutLocation; thresholdC: number }) {
  return (
    <article className="scout-card" style={{ "--card-accent": location.accent } as CSSProperties} aria-label={`${location.name} thermal player card`}>
      <div className="card-holo" aria-hidden="true" />
      <header className="card-topline"><div><span className="card-overall">{location.heatPressure}</span><span className="card-overall-label">HP</span></div><div className="card-edition"><span>{location.dataBadge}</span><strong>SCOUT / {location.number}</strong></div></header>
      <div className="card-pressure-label">HEAT PRESSURE · RELATIVE TO COHORT</div>
      <div className="card-portrait" aria-hidden="true"><span className="sun-disc" /><svg viewBox="0 0 320 155" preserveAspectRatio="none"><path d="M0 138 42 84l39 31 41-73 42 76 47-55 37 41 40-72 32 50v73H0Z" fill="currentColor" opacity=".18" /><path d="M-10 138c62-29 103-19 161 2s113 10 179-23v48H-10Z" fill="currentColor" opacity=".32" /></svg><span className="card-location-code">{location.code}</span></div>
      <div className="card-identity"><p>{location.label}</p><h2>{location.name}</h2><span>{location.archetype}</span></div>
      <div className="card-spark"><div className="spark-meta"><span>{location.startTime}</span><strong>{location.temperatureC.toFixed(1)}° peak · {location.peakTime}</strong><span>{location.endTime}</span></div><Sparkline values={location.sparkline} accent={location.accent} /></div>
      <div className="card-stats">{metricsFor(thresholdC).map((metric) => { const value = location.metrics[metric.key]; return <div key={metric.key} aria-label={`${metric.label}: ${value.percentile === null ? "unavailable" : `percentile ${value.percentile}`}; ${value.raw}. ${metric.hint}`}><strong>{value.percentile === null ? "—" : value.percentile}</strong><span>{metric.label}</span><small>{value.raw}</small></div>; })}</div>
      <footer className="card-footer"><span>Ratings = cohort percentiles</span><strong>FORTYGUARD × CELSIUS SCOUT</strong></footer>
    </article>
  );
}

function RatingsGuide({ analysis }: { analysis: CelsiusScoutAnalysis }) {
  const comfortInput = analysis.cohort.source.kind === "fortyguard"
    ? "This temperature-only snapshot has no humidity, wind, or supplied apparent temperature, so Comfort is unavailable."
    : "This demo includes humidity and wind inputs for the documented apparent-temperature proxy.";
  return (
    <section className="ratings-guide" id="how-it-works" aria-labelledby="ratings-guide-title">
      <header className="ratings-guide-intro">
        <div><p className="eyebrow">FIELD GUIDE / METRIC DEFINITIONS</p><h2 id="ratings-guide-title">What every stat represents</h2></div>
        <p>Cards pair a raw measurement with a 0–100 rating. The rating is an average-rank percentile inside <strong>{analysis.cohort.name}</strong> only; it is not a universal city score.</p>
      </header>
      <div className="ratings-guide-grid">
        <article><span className="guide-code">HP</span><h3>Heat Pressure</h3><p><strong>50% Peak percentile + 50% Stamina percentile.</strong> A compact description of relative thermal intensity—not comfort, danger, health risk, or overall quality.</p></article>
        <article><span className="guide-code">PEAK</span><h3>Peak</h3><p>The highest observed air temperature in the active time series. The raw value is °C; a higher rating means a higher maximum relative to this cohort.</p></article>
        <article><span className="guide-code">STA</span><h3>Stamina</h3><p>The longest uninterrupted, linearly interpolated run above <strong>{analysis.cohort.thresholdC}°C</strong>. It is duration, not temperature, and stays separate from total exceedance.</p></article>
        <article><span className="guide-code">REC</span><h3>Recovery</h3><p>The supported post-peak cooling trend from ordinary least squares, shown in °C/hour. A faster cooling trend earns a higher rating; insufficient post-peak samples produce “Unavailable.”</p></article>
        <article><span className="guide-code">COM</span><h3>Comfort</h3><p>A lower time-weighted apparent temperature earns a higher rating. It requires supplied apparent temperature or complete humidity-and-wind inputs. {comfortInput}</p></article>
        <article><span className="guide-code">CHA</span><h3>Chaos</h3><p>The interquartile range of successive changes in temperature-change rates. A higher rating means a more irregular profile, not randomness or measurement error.</p></article>
        <article><span className="guide-code">SUR</span><h3>Surprise</h3><p>The size of a location’s median same-hour deviation from nearby tiles. The rating uses absolute size; the raw sign preserves direction: positive is hotter, negative is cooler.</p></article>
        <article><span className="guide-code">RAW</span><h3>Supporting evidence</h3><p>Exceedance is total interpolated time above the threshold. Peak time is the earliest observed maximum. The time-weighted mean integrates the full series instead of averaging sample rows.</p></article>
      </div>
      <footer className="ratings-guide-notes">
        <div><strong>How percentiles behave</strong><p>The cohort minimum maps to 0 and maximum to 100. Ties share their average rank; if every value ties, each receives 50. Missing inputs remain unavailable and do not enter the ranking.</p></div>
        <div><strong>Active data provenance</strong><p>{analysis.cohort.source.label}. Ratings change when the cohort, window, threshold, or available inputs change, so compare cards only within the active board.</p></div>
        <div><strong>Claim boundary</strong><p>These are descriptive scouting comparisons. They do not establish medical risk, safety, statistical significance, causes, forecasts, or intervention effects.</p></div>
      </footer>
    </section>
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
  const activeMission = missions.find((mission) => mission.id === activeMissionId) ?? missions[1];
  const selectedLocation = locationById.get(selectedId) ?? locationById.get(activeMission.selectedIds[0]) ?? locations[0];
  const reportLocationIds = agentLocationIds(agentReport, locationById);
  const selectedIds = agentReport
    ? (reportLocationIds.length ? reportLocationIds : [selectedId])
    : manualSelection ? [selectedId] : activeMission.selectedIds;
  const selectedNames = selectedIds.map((id) => locationById.get(id)?.name).filter(Boolean) as string[];
  const isObserved = analysis.cohort.source.kind === "fortyguard";
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
      { label: "Peak", value: `${selectedLocation.temperatureC.toFixed(1)}°C · P${selectedLocation.metrics.peak.percentile}` },
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

  const inspection = manualSelection && !agentReport ? inspectLocation(analysis, selectedLocation.id) : null;
  return (
    <main className="app-shell">
      <header className="site-header"><a className="wordmark" href="#top" aria-label="Celsius Scout home"><span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span><span>CELSIUS<strong>SCOUT</strong></span></a><div className="header-status"><span className="status-dot" aria-hidden="true" />Deterministic core · LLM-ready</div><a href="#how-it-works" className="text-link"><span className="text-link-label">How ratings work</span> <span aria-hidden="true">↗</span></a></header>
      <section className="intro" id="top"><div><p className="eyebrow">THERMAL INTELLIGENCE, SCOUTED</p><h1>Every block has a <em>thermal character.</em></h1></div><p className="intro-copy">Draft cool spots, expose deceptive averages, and inspect the evidence behind every pick. City heat, reimagined as a scouting board.</p></section>
      <section className="cohort-bar" aria-label="Active comparison cohort"><div className="cohort-title"><span className={`demo-badge${isObserved ? " is-observed" : ""}`}>{isObserved ? "OBSERVED SNAPSHOT" : "SYNTHETIC PREVIEW"}</span><div><strong>{analysis.cohort.name}</strong><small>{analysis.cohort.source.label}</small></div></div><div className="cohort-controls" aria-label="Data mode">{cohorts.map((cohort) => <button key={cohort.id} type="button" className={cohort.id === analysis.cohort.id ? "is-active" : ""} onClick={() => switchCohort(cohort.id)} aria-pressed={cohort.id === analysis.cohort.id}>{cohort.source.kind === "fortyguard" ? "Observed" : "Demo"}</button>)}</div><div className="cohort-facts"><span><small>LOCATIONS</small><strong>{analysis.cohort.locationCount} local profiles</strong></span><span><small>WINDOW</small><strong>{windowDate} · {localTime(analysis.cohort.startTimestamp, analysis.cohort.timezone)}–{localTime(analysis.cohort.endTimestamp, analysis.cohort.timezone)}</strong></span><span><small>THRESHOLD</small><strong>Above {analysis.cohort.thresholdC}°C</strong></span><span><small>{isObserved ? "RESOLUTION" : "RATINGS"}</small><strong>{isObserved ? `${analysis.cohort.source.granularityM} m grid` : "Percentile in this cohort"}</strong></span></div></section>

      <section className="scout-workspace" aria-label="Celsius Scout workspace">
        <aside className="mission-rail">
          <div className="section-heading"><p className="eyebrow">01 / PICK A BRIEF</p><h2>Scouting missions</h2><p>Preset investigations backed by real structured tool results.</p></div>
          <div className="mission-list">{missions.map((mission, index) => <button key={mission.id} type="button" className={`mission-button${!agentReport && !manualSelection && activeMission.id === mission.id ? " is-active" : ""}`} onClick={() => runMission(mission)} aria-pressed={!agentReport && !manualSelection && activeMission.id === mission.id}><span className="mission-number">0{index + 1}</span><span><small>{mission.kicker}</small><strong>{mission.title}</strong></span><span aria-hidden="true">↗</span></button>)}</div>
          <form className="ask-scout" onSubmit={askScout}>
            <label htmlFor="scout-question">Ask the scout</label>
            <textarea id="scout-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={3} />
            <button type="submit" disabled={agentLoading || !question.trim()}>{agentLoading ? "Scouting…" : "Run agent brief"}</button>
            {agentError && <p role="alert">{agentError}</p>}
          </form>
          <div className="mission-note"><span aria-hidden="true">✦</span><p><strong>LLM-compatible, evidence-bound.</strong> A model may investigate and explain; code remains the source of every displayed number.</p></div>
        </aside>
        <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">02 / SCAN THE COHORT</p><h2>Phoenix board</h2></div><div className="map-key"><i /><span>Mission picks</span></div></div><HeatGrid locations={locations} selectedIds={selectedIds} onSelect={inspect} /><div className="map-caption"><span>Select a tile to inspect its evidence</span><span>{isObserved ? "Returned FortyGuard 100 m polygon footprints" : "Synthetic point fixture shown as discrete footprints"}</span></div></section>
        <section className="card-panel"><div className="panel-heading card-panel-heading"><div><p className="eyebrow">03 / INSPECT THE PICK</p><h2>Thermal card</h2></div><span className="cohort-rank">{selectedLocation.archetype.replace("The ", "")}</span></div><ScoutCard location={selectedLocation} thresholdC={analysis.cohort.thresholdC} /><div className="card-explanation"><span className="explanation-mark" aria-hidden="true">✦</span><div><strong>Evidence-backed read</strong><p>{selectedLocation.evidence}</p></div></div></section>
      </section>

      <section className="evidence-panel" aria-live="polite">
        <div className="mission-result">
          <p className="eyebrow">SCOUT REPORT / {agentReport ? `${agentReport.mode.toUpperCase()} AGENT` : manualSelection ? "FREE INSPECTION" : activeMission.title.toUpperCase()}</p>
          <h2>{agentReport?.question ?? inspection?.question ?? activeMission.prompt}</h2>
          <p>{agentReport?.explanation ?? (manualSelection ? selectedLocation.evidence : activeMission.result)}</p>
          {agentReport?.fallbackReason && <small className="agent-fallback">Fallback: {agentReport.fallbackReason}</small>}
          {selectedNames.length > 1 && <div className="selection-strip" aria-label="Selected locations">{selectedNames.map((name) => <span key={name}>{name}</span>)}</div>}
        </div>
        <div className="evidence-facts">{visibleEvidence.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
        <div className="tool-trace"><div className="trace-heading"><span className="trace-pulse" aria-hidden="true" /><strong>Executed tool{agentReport && agentReport.trace.length > 1 ? "s" : ""}</strong><small>structured result</small></div><ol>{(agentReport?.trace.map((entry) => entry.tool) ?? [inspection?.tool ?? activeMission.tool]).map((tool, index) => <li key={`${tool}-${index}`}><span>{index + 1}</span><code>{tool}()</code></li>)}</ol></div>
      </section>

      <section className="average-panel" aria-labelledby="average-title"><div className="average-intro"><p className="eyebrow">DERIVED EXPERIENCE / THE AVERAGE IS LYING</p><h2 id="average-title">One number hides the local spread.</h2><p>The broad cohort mean is {averageMasking.representativeMeanC.toFixed(1)}°C, but the local time-weighted means span {averageMasking.spatialMeanRangeC.toFixed(1)}°C. The scout keeps the distribution visible.</p></div><div className="average-stat"><span>Broad mean</span><strong>{averageMasking.representativeMeanC.toFixed(1)}°C</strong><small>mean of local time-weighted means</small></div><div className="average-stat"><span>Local range</span><strong>{averageMasking.coolestMeanC.toFixed(1)}–{averageMasking.hottestMeanC.toFixed(1)}°C</strong><small>{averageMasking.coolestLocation.name} → {averageMasking.hottestLocation.name}</small></div><div className="average-stat"><span>Exposure share</span><strong>{averageMasking.tileHoursAboveThresholdPercent.toFixed(1)}%</strong><small>of observed tile-hours above {analysis.cohort.thresholdC}°C</small></div></section>
      <RatingsGuide analysis={analysis} />
      <section className="method-strip"><p><strong>Data honesty:</strong> {isObserved ? `this view uses a captured FortyGuard historical snapshot (${analysis.cohort.source.snapshotId}); switch to Demo for the labeled synthetic fallback.` : "this view uses the labeled synthetic Phoenix fallback; switch to Observed for the captured FortyGuard snapshot."} Ratings are recomputed from the active cohort.</p><p><strong>Interpretation:</strong> Heat Pressure is 50% Peak plus 50% Stamina. Surprise is local deviation, not statistical significance. These are comparison tools—not health, safety, or causal claims.</p></section>
    </main>
  );
}
