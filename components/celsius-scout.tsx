"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import {
  analyzeCohort,
  demoCohort,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  inspectLocation,
  summarizeAverageMasking,
  type ScoutedLocation,
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

const ANALYSIS = analyzeCohort(demoCohort);
const AVERAGE_MASKING = summarizeAverageMasking(ANALYSIS);
const COOLEST = findCoolestLineup(ANALYSIS, 5);
const FRAUD = findBiggestThermalFraud(ANALYSIS);
const TWINS = findSimilarAverageDifferentBehaviorPair(ANALYSIS);
const RECOVERY = findFastestRecovery(ANALYSIS);

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

function localTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ANALYSIS.cohort.timezone,
  }).format(new Date(timestamp));
}

function codeFor(location: ScoutedLocation): string {
  return location.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

function mapTone(percentile: number): MapLocation["tone"] {
  if (percentile >= 85) return "extreme";
  if (percentile >= 65) return "hot";
  if (percentile >= 45) return "warm";
  if (percentile >= 25) return "mild";
  return "cool";
}

const latitudes = ANALYSIS.locations.map((location) => location.latitude);
const longitudes = ANALYSIS.locations.map((location) => location.longitude);
const latitudeMin = Math.min(...latitudes);
const latitudeMax = Math.max(...latitudes);
const longitudeMin = Math.min(...longitudes);
const longitudeMax = Math.max(...longitudes);

function positionFor(location: ScoutedLocation) {
  return {
    x: 5 + ((location.longitude - longitudeMin) / (longitudeMax - longitudeMin || 1)) * 74,
    y: 7 + ((latitudeMax - location.latitude) / (latitudeMax - latitudeMin || 1)) * 69,
  };
}

function toViewLocation(location: ScoutedLocation, index: number): ScoutLocation {
  const { features, scores } = location;
  const position = positionFor(location);
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
    peakTime: localTime(features.peakTimestamp),
    startTime: localTime(location.samples[0].timestamp),
    endTime: localTime(location.samples.at(-1)?.timestamp ?? location.samples[0].timestamp),
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
    x: position.x,
    y: position.y,
    width: 15,
    height: 18,
    tone: mapTone(scores.peak),
  };
}

const LOCATIONS = ANALYSIS.locations.map(toViewLocation);
const LOCATION_BY_ID = new Map(LOCATIONS.map((location) => [location.id, location]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function agentLocationIds(report: AgentReport | null): string[] {
  const ids = new Set<string>();
  const addLocation = (value: unknown) => {
    if (isRecord(value) && typeof value.id === "string" && LOCATION_BY_ID.has(value.id)) ids.add(value.id);
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

const MISSIONS: Mission[] = [
  {
    id: "coolest-five",
    kicker: "Draft",
    title: "Coolest five",
    prompt: COOLEST.question,
    result: `${COOLEST.data[0].location.name} captains: ${COOLEST.data.map((pick) => pick.location.name).join(", ")}.`,
    selectedIds: COOLEST.data.map((pick) => pick.location.id),
    tool: COOLEST.tool,
    evidence: [
      { label: "Captain", value: COOLEST.data[0].location.name },
      { label: "Selection score", value: `${COOLEST.data[0].selectionScore} / 100` },
      { label: "Picks", value: `${COOLEST.data.length} / ${ANALYSIS.cohort.locationCount}` },
    ],
  },
  {
    id: "thermal-fraud",
    kicker: "Expose",
    title: "Thermal fraud",
    prompt: FRAUD.question,
    result: `${FRAUD.answer} “Fraud” means average masking—not deception.`,
    selectedIds: [FRAUD.data.location.id],
    tool: FRAUD.tool,
    evidence: [
      { label: "Time-weighted mean", value: `${decimal(FRAUD.data.location.features.meanTemperatureC)}°C` },
      { label: "Observed peak", value: `${decimal(FRAUD.data.location.features.peakTemperatureC)}°C` },
      { label: "Peak − mean", value: `${decimal(FRAUD.data.location.features.peakToMeanGapC)}°C` },
    ],
  },
  {
    id: "different-twins",
    kicker: "Compare",
    title: "Different twins",
    prompt: TWINS.question,
    result: `${TWINS.answer} Their thermal profiles diverge despite similar means.`,
    selectedIds: [TWINS.data.first.id, TWINS.data.second.id],
    tool: TWINS.tool,
    evidence: [
      { label: "Pair", value: `${TWINS.data.first.name} / ${TWINS.data.second.name}` },
      { label: "Mean gap", value: `${decimal(TWINS.data.meanDifferenceC)}°C` },
      { label: "Behavior gap", value: `${decimal(TWINS.data.behaviorDistance)} percentile pts` },
    ],
  },
  {
    id: "fastest-recovery",
    kicker: "Find",
    title: "Fastest recovery",
    prompt: RECOVERY.question,
    result: RECOVERY.answer,
    selectedIds: [RECOVERY.data.location.id],
    tool: RECOVERY.tool,
    evidence: [
      { label: "Location", value: RECOVERY.data.location.name },
      { label: "Recovery", value: `${decimal(RECOVERY.data.location.features.recoveryRateCPerHour as number)}°C / h` },
      { label: "Measured window", value: duration(RECOVERY.data.location.features.recoveryWindowHours) },
    ],
  },
];

const METRICS: Array<{ key: MetricKey; label: string; hint: string }> = [
  { key: "peak", label: "Peak", hint: "maximum temperature" },
  { key: "stamina", label: "Stamina", hint: `longest continuous run above ${ANALYSIS.cohort.thresholdC}°C` },
  { key: "recovery", label: "Recovery", hint: "post-peak cooling speed" },
  { key: "comfort", label: "Comfort", hint: "apparent temperature; higher is more favorable" },
  { key: "chaos", label: "Chaos", hint: "robust variability of temperature-change rates" },
  { key: "surprise", label: "Surprise", hint: "absolute local deviation from neighbors" },
];

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

function ScoutCard({ location }: { location: ScoutLocation }) {
  return (
    <article className="scout-card" style={{ "--card-accent": location.accent } as CSSProperties} aria-label={`${location.name} thermal player card`}>
      <div className="card-holo" aria-hidden="true" />
      <header className="card-topline"><div><span className="card-overall">{location.heatPressure}</span><span className="card-overall-label">HP</span></div><div className="card-edition"><span>SYNTHETIC</span><strong>SCOUT / {location.number}</strong></div></header>
      <div className="card-pressure-label">HEAT PRESSURE · RELATIVE TO COHORT</div>
      <div className="card-portrait" aria-hidden="true"><span className="sun-disc" /><svg viewBox="0 0 320 155" preserveAspectRatio="none"><path d="M0 138 42 84l39 31 41-73 42 76 47-55 37 41 40-72 32 50v73H0Z" fill="currentColor" opacity=".18" /><path d="M-10 138c62-29 103-19 161 2s113 10 179-23v48H-10Z" fill="currentColor" opacity=".32" /></svg><span className="card-location-code">{location.code}</span></div>
      <div className="card-identity"><p>{location.label}</p><h2>{location.name}</h2><span>{location.archetype}</span></div>
      <div className="card-spark"><div className="spark-meta"><span>{location.startTime}</span><strong>{location.temperatureC.toFixed(1)}° peak · {location.peakTime}</strong><span>{location.endTime}</span></div><Sparkline values={location.sparkline} accent={location.accent} /></div>
      <div className="card-stats">{METRICS.map((metric) => { const value = location.metrics[metric.key]; return <div key={metric.key} aria-label={`${metric.label}: ${value.percentile === null ? "unavailable" : `percentile ${value.percentile}`}; ${value.raw}. ${metric.hint}`}><strong>{value.percentile === null ? "—" : value.percentile}</strong><span>{metric.label}</span><small>{value.raw}</small></div>; })}</div>
      <footer className="card-footer"><span>Ratings = cohort percentiles</span><strong>FORTYGUARD × CELSIUS SCOUT</strong></footer>
    </article>
  );
}

export function CelsiusScout() {
  const [activeMissionId, setActiveMissionId] = useState(MISSIONS[1].id);
  const [selectedId, setSelectedId] = useState(MISSIONS[1].selectedIds[0]);
  const [manualSelection, setManualSelection] = useState(false);
  const [question, setQuestion] = useState("Find an underrated cool location.");
  const [agentReport, setAgentReport] = useState<AgentReport | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const activeMission = MISSIONS.find((mission) => mission.id === activeMissionId) ?? MISSIONS[1];
  const selectedLocation = LOCATION_BY_ID.get(selectedId) ?? LOCATIONS[0];
  const reportLocationIds = agentLocationIds(agentReport);
  const selectedIds = agentReport
    ? (reportLocationIds.length ? reportLocationIds : [selectedId])
    : manualSelection ? [selectedId] : activeMission.selectedIds;
  const selectedNames = selectedIds.map((id) => LOCATION_BY_ID.get(id)?.name).filter(Boolean) as string[];

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
        body: JSON.stringify({ question }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isRecord(payload) || !Array.isArray(payload.trace)) throw new Error("The scout could not complete that brief");
      const report = payload as unknown as AgentReport;
      setAgentReport(report);
      setManualSelection(false);
      const nextId = agentLocationIds(report)[0];
      if (nextId) setSelectedId(nextId);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "The scout could not complete that brief");
    } finally {
      setAgentLoading(false);
    }
  }

  const inspection = manualSelection && !agentReport ? inspectLocation(ANALYSIS, selectedId) : null;
  return (
    <main className="app-shell">
      <header className="site-header"><a className="wordmark" href="#top" aria-label="Celsius Scout home"><span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span><span>CELSIUS<strong>SCOUT</strong></span></a><div className="header-status"><span className="status-dot" aria-hidden="true" />Deterministic core · LLM-ready</div><a href="#how-it-works" className="text-link"><span className="text-link-label">How ratings work</span> <span aria-hidden="true">↗</span></a></header>
      <section className="intro" id="top"><div><p className="eyebrow">THERMAL INTELLIGENCE, SCOUTED</p><h1>Every block has a <em>thermal character.</em></h1></div><p className="intro-copy">Draft cool spots, expose deceptive averages, and inspect the evidence behind every pick. City heat, reimagined as a scouting board.</p></section>
      <section className="cohort-bar" aria-label="Active comparison cohort"><div className="cohort-title"><span className="demo-badge">SYNTHETIC PREVIEW</span><div><strong>{ANALYSIS.cohort.name}</strong><small>{ANALYSIS.cohort.source.label}</small></div></div><div className="cohort-facts"><span><small>LOCATIONS</small><strong>{ANALYSIS.cohort.locationCount} local profiles</strong></span><span><small>WINDOW</small><strong>18 Aug · {localTime(ANALYSIS.cohort.startTimestamp)}–{localTime(ANALYSIS.cohort.endTimestamp)}</strong></span><span><small>THRESHOLD</small><strong>Above {ANALYSIS.cohort.thresholdC}°C</strong></span><span><small>RATINGS</small><strong>Percentile in this cohort</strong></span></div></section>

      <section className="scout-workspace" aria-label="Celsius Scout workspace">
        <aside className="mission-rail">
          <div className="section-heading"><p className="eyebrow">01 / PICK A BRIEF</p><h2>Scouting missions</h2><p>Preset investigations backed by real structured tool results.</p></div>
          <div className="mission-list">{MISSIONS.map((mission, index) => <button key={mission.id} type="button" className={`mission-button${!agentReport && !manualSelection && activeMission.id === mission.id ? " is-active" : ""}`} onClick={() => runMission(mission)} aria-pressed={!agentReport && !manualSelection && activeMission.id === mission.id}><span className="mission-number">0{index + 1}</span><span><small>{mission.kicker}</small><strong>{mission.title}</strong></span><span aria-hidden="true">↗</span></button>)}</div>
          <form className="ask-scout" onSubmit={askScout}>
            <label htmlFor="scout-question">Ask the scout</label>
            <textarea id="scout-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={3} />
            <button type="submit" disabled={agentLoading || !question.trim()}>{agentLoading ? "Scouting…" : "Run agent brief"}</button>
            {agentError && <p role="alert">{agentError}</p>}
          </form>
          <div className="mission-note"><span aria-hidden="true">✦</span><p><strong>LLM-compatible, evidence-bound.</strong> A model may investigate and explain; code remains the source of every displayed number.</p></div>
        </aside>
        <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">02 / SCAN THE COHORT</p><h2>Phoenix board</h2></div><div className="map-key"><i /><span>Mission picks</span></div></div><HeatGrid locations={LOCATIONS} selectedIds={selectedIds} onSelect={inspect} /><div className="map-caption"><span>Select a tile to inspect its evidence</span><span>Synthetic point fixture shown as discrete footprints</span></div></section>
        <section className="card-panel"><div className="panel-heading card-panel-heading"><div><p className="eyebrow">03 / INSPECT THE PICK</p><h2>Thermal card</h2></div><span className="cohort-rank">{selectedLocation.archetype.replace("The ", "")}</span></div><ScoutCard location={selectedLocation} /><div className="card-explanation"><span className="explanation-mark" aria-hidden="true">✦</span><div><strong>Evidence-backed read</strong><p>{selectedLocation.evidence}</p></div></div></section>
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

      <section className="average-panel" aria-labelledby="average-title"><div className="average-intro"><p className="eyebrow">DERIVED EXPERIENCE / THE AVERAGE IS LYING</p><h2 id="average-title">One number hides the local spread.</h2><p>The broad cohort mean is {AVERAGE_MASKING.representativeMeanC.toFixed(1)}°C, but the local time-weighted means span {AVERAGE_MASKING.spatialMeanRangeC.toFixed(1)}°C. The scout keeps the distribution visible.</p></div><div className="average-stat"><span>Broad mean</span><strong>{AVERAGE_MASKING.representativeMeanC.toFixed(1)}°C</strong><small>mean of local time-weighted means</small></div><div className="average-stat"><span>Local range</span><strong>{AVERAGE_MASKING.coolestMeanC.toFixed(1)}–{AVERAGE_MASKING.hottestMeanC.toFixed(1)}°C</strong><small>{AVERAGE_MASKING.coolestLocation.name} → {AVERAGE_MASKING.hottestLocation.name}</small></div><div className="average-stat"><span>Exposure share</span><strong>{AVERAGE_MASKING.tileHoursAboveThresholdPercent.toFixed(1)}%</strong><small>of observed tile-hours above {ANALYSIS.cohort.thresholdC}°C</small></div></section>
      <section className="method-strip" id="how-it-works"><p><strong>Data honesty:</strong> this runnable preview uses a labeled synthetic Phoenix cohort. Connect the FortyGuard adapter to replace the fixture; ratings are recomputed from the active cohort.</p><p><strong>Interpretation:</strong> Heat Pressure is 50% Peak plus 50% Stamina. Surprise is local deviation, not statistical significance. These are comparison tools—not health, safety, or causal claims.</p></section>
    </main>
  );
}
