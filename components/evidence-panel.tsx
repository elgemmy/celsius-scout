import type { AgentReport, EvidenceFact, Mission, ScoutLocation } from "./scout-view";

const CALL_LABEL = /peak\s*[−\-–]\s*mean|behavior gap|selection score|^recovery$/i;

function isCallFact(index: number, facts: EvidenceFact[]) {
  const marked = facts.findIndex((fact) => CALL_LABEL.test(fact.label));
  return index === (marked === -1 ? facts.length - 1 : marked);
}

export function EvidencePanel({
  agentReport,
  manualSelection,
  activeMission,
  inspection,
  selectedLocation,
  selectedNames,
  visibleEvidence,
}: {
  agentReport: AgentReport | null;
  manualSelection: boolean;
  activeMission: Mission;
  inspection: { question: string; tool: string } | null;
  selectedLocation: ScoutLocation;
  selectedNames: string[];
  visibleEvidence: EvidenceFact[];
}) {
  const tools = agentReport?.trace.map((entry) => entry.tool) ?? [inspection?.tool ?? activeMission.tool];
  const result = agentReport?.explanation ?? (manualSelection ? selectedLocation.evidence : activeMission.result);
  const reportKicker = agentReport
    ? `${agentReport.mode.toUpperCase()} AGENT`
    : manualSelection
      ? "FREE INSPECTION"
      : activeMission.title.toUpperCase();

  return (
    <section className="evidence-panel" aria-live="polite">
      <div className="mission-result">
        <p className="eyebrow">SCOUT REPORT / {reportKicker}</p>
        <h2>{agentReport?.question ?? inspection?.question ?? activeMission.prompt}</h2>
        <div className="evidence-facts">
          {visibleEvidence.map((item, index) => (
            <div key={item.label} className={isCallFact(index, visibleEvidence) ? "is-punch" : undefined}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <p className="evidence-result">{result}</p>
        {agentReport?.fallbackReason && <small className="agent-fallback">Fallback: {agentReport.fallbackReason}</small>}
        {selectedNames.length > 1 && (
          <div className="selection-strip" aria-label="Selected locations">
            {selectedNames.map((name) => <span key={name}>{name}</span>)}
          </div>
        )}
      </div>
      <div className="tool-trace">
        <div className="trace-heading">
          <span className="trace-pulse" aria-hidden="true" />
          <strong>Executed tool{agentReport && agentReport.trace.length > 1 ? "s" : ""}</strong>
          <small>structured result</small>
        </div>
        <ol>
          {tools.map((tool, index) => (
            <li key={`${tool}-${index}`}>
              <span>{index + 1}</span>
              <code>{tool}()</code>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
