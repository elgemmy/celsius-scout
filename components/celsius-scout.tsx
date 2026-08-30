"use client";

import { useMemo, useState, type FormEvent } from "react";
import { inspectLocation, type ThermalCohort } from "../lib";
import { AveragePanel } from "./average-panel";
import { CohortBar } from "./cohort-bar";
import { EvidencePanel } from "./evidence-panel";
import { MapPanel } from "./map-panel";
import { MethodStrip } from "./method-strip";
import { MissionRail } from "./mission-rail";
import { RatingsGuide } from "./ratings-guide";
import { ScoutCard } from "./scout-card";
import { ScoutIntro } from "./scout-intro";
import {
  agentLocationIds,
  buildExperience,
  isRecord,
  type AgentReport,
  type Mission,
} from "./scout-view";
import { SiteHeader } from "./site-header";

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

  const inspection = manualSelection && !agentReport ? inspectLocation(analysis, selectedLocation.id) : null;
  return (
    <main className="app-shell">
      <SiteHeader status="Deterministic core · LLM-ready" />
      <ScoutIntro />
      <CohortBar cohorts={cohorts} analysis={analysis} onSwitchCohort={switchCohort} />

      <section className="scout-workspace" aria-label="Celsius Scout workspace">
        <MissionRail
          missions={missions}
          activeMission={activeMission}
          agentReport={agentReport}
          manualSelection={manualSelection}
          question={question}
          agentLoading={agentLoading}
          agentError={agentError}
          onRunMission={runMission}
          onQuestionChange={setQuestion}
          onAskScout={askScout}
        />
        <MapPanel locations={locations} selectedIds={selectedIds} isObserved={isObserved} onSelect={inspect} />
        <section className="card-panel"><div className="panel-heading card-panel-heading"><div><p className="eyebrow">03 / INSPECT THE PICK</p><h2>Thermal card</h2></div><span className="cohort-rank">{selectedLocation.archetype.replace("The ", "")}</span></div><ScoutCard location={selectedLocation} thresholdC={analysis.cohort.thresholdC} /><div className="card-explanation"><span className="explanation-mark" aria-hidden="true">✦</span><div><strong>Evidence-backed read</strong><p>{selectedLocation.evidence}</p></div></div></section>
      </section>

      <EvidencePanel
        agentReport={agentReport}
        manualSelection={manualSelection}
        activeMission={activeMission}
        inspection={inspection}
        selectedLocation={selectedLocation}
        selectedNames={selectedNames}
        visibleEvidence={visibleEvidence}
      />
      <AveragePanel analysis={analysis} averageMasking={averageMasking} />
      <RatingsGuide analysis={analysis} />
      <MethodStrip isObserved={isObserved} snapshotId={analysis.cohort.source.snapshotId} />
    </main>
  );
}
