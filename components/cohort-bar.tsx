import type { CelsiusScoutAnalysis, ThermalCohort } from "../lib";
import { localTime } from "./scout-view";

export function CohortBar({
  cohorts,
  analysis,
  onSwitchCohort,
}: {
  cohorts: ThermalCohort[];
  analysis: CelsiusScoutAnalysis;
  onSwitchCohort: (cohortId: string) => void;
}) {
  const isObserved = analysis.cohort.source.kind === "fortyguard";
  const windowDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: analysis.cohort.timezone,
  }).format(new Date(analysis.cohort.startTimestamp));

  return (
    <section className="cohort-bar" aria-label="Active comparison cohort"><div className="cohort-title"><span className={`demo-badge${isObserved ? " is-observed" : ""}`}>{isObserved ? "HISTORICAL SNAPSHOT" : "SYNTHETIC PREVIEW"}</span><div><strong>{analysis.cohort.name}</strong><small>{analysis.cohort.source.label}</small></div></div><div className="cohort-controls" aria-label="Data mode">{cohorts.map((cohort) => <button key={cohort.id} type="button" className={cohort.id === analysis.cohort.id ? "is-active" : ""} onClick={() => onSwitchCohort(cohort.id)} aria-pressed={cohort.id === analysis.cohort.id}>{cohort.source.kind === "fortyguard" ? "Snapshot" : "Demo"}</button>)}</div><div className="cohort-facts"><span><small>LOCATIONS</small><strong>{analysis.cohort.locationCount} local profiles</strong></span><span><small>WINDOW</small><strong>{windowDate} · {localTime(analysis.cohort.startTimestamp, analysis.cohort.timezone)}–{localTime(analysis.cohort.endTimestamp, analysis.cohort.timezone)}</strong></span><span><small>THRESHOLD</small><strong>Above {analysis.cohort.thresholdC}°C</strong></span><span><small>{isObserved ? "RESOLUTION" : "RATINGS"}</small><strong>{isObserved ? `${analysis.cohort.source.granularityM} m grid` : "Percentile in this cohort"}</strong></span></div></section>
  );
}
