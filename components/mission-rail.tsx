import type { FormEvent } from "react";
import type { AgentReport, Mission } from "./scout-view";

export function MissionRail({
  missions,
  activeMission,
  agentReport,
  manualSelection,
  question,
  agentLoading,
  agentError,
  onRunMission,
  onQuestionChange,
  onAskScout,
}: {
  missions: Mission[];
  activeMission: Mission;
  agentReport: AgentReport | null;
  manualSelection: boolean;
  question: string;
  agentLoading: boolean;
  agentError: string | null;
  onRunMission: (mission: Mission) => void;
  onQuestionChange: (value: string) => void;
  onAskScout: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <aside className="mission-rail">
      <div className="section-heading">
        <p className="eyebrow">01 / PICK A BRIEF</p>
        <h2>Pick a brief.</h2>
      </div>
      <div className="mission-list">
        {missions.map((mission, index) => {
          const isActive = !agentReport && !manualSelection && activeMission.id === mission.id;
          return (
            <button
              key={mission.id}
              type="button"
              className={`mission-button${isActive ? " is-active" : ""}`}
              onClick={() => onRunMission(mission)}
              aria-pressed={isActive}
            >
              <span className="mission-number">0{index + 1}</span>
              <span>
                <small>{mission.kicker}</small>
                <strong>{mission.title}</strong>
              </span>
            </button>
          );
        })}
      </div>
      <form className="ask-scout" onSubmit={onAskScout}>
        <label htmlFor="scout-question">Or write a brief.</label>
        <textarea
          id="scout-question"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          maxLength={500}
          rows={3}
        />
        <button type="submit" disabled={agentLoading || !question.trim()}>
          {agentLoading ? "Scouting…" : "Run agent brief"}
        </button>
        {agentError && <p role="alert">{agentError}</p>}
      </form>
      <p className="mission-note">LLM-compatible, evidence-bound. Code owns every displayed number.</p>
    </aside>
  );
}
