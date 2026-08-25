import type { Metadata } from "next";
import Link from "next/link";
import {
  analyzeCohort,
  demoFestivalPlan,
  optimizeFestivalPlan,
  type ActivityExposure,
} from "../../lib";

export const metadata: Metadata = {
  title: "Festival Tetris — Celsius Scout",
  description: "A deterministic before-and-after festival schedule powered by Celsius Scout thermal profiles.",
};

const result = optimizeFestivalPlan(demoFestivalPlan);
const analysis = analyzeCohort(demoFestivalPlan.thermalCohort);
const archetypeByThermalLocation = new Map(
  analysis.locations.map((location) => [location.id, location.archetype.name]),
);
const thermalLocationByFestivalLocation = new Map(
  demoFestivalPlan.locations.map((location) => [location.id, location.thermalLocationId]),
);

function localTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: demoFestivalPlan.timezone,
  }).format(new Date(timestamp));
}

function activityTime(activity: ActivityExposure): string {
  return `${localTime(activity.startTimestamp)}–${localTime(activity.endTimestamp)}`;
}

function number(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function archetypeFor(locationId: string): string {
  const thermalLocationId = thermalLocationByFestivalLocation.get(locationId);
  return thermalLocationId
    ? archetypeByThermalLocation.get(thermalLocationId) ?? "Unclassified"
    : "Unclassified";
}

function ScheduleColumn({
  title,
  eyebrow,
  activities,
  variant,
}: {
  title: string;
  eyebrow: string;
  activities: ActivityExposure[];
  variant: "before" | "after";
}) {
  const ordered = [...activities].sort((first, second) =>
    first.startTimestamp.localeCompare(second.startTimestamp)
    || first.locationName.localeCompare(second.locationName),
  );
  return (
    <section className={`festival-schedule festival-schedule--${variant}`}>
      <header>
        <div>
          <p className="festival-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span>{activities.filter((activity) => activity.changedFromOriginal).length} changed</span>
      </header>
      <ol>
        {ordered.map((activity) => (
          <li key={activity.activityId} className={activity.changedFromOriginal ? "is-moved" : "is-kept"}>
            <div className="festival-slot-time">
              <strong>{activityTime(activity)}</strong>
              <small>{activity.attendees} people</small>
            </div>
            <div className="festival-slot-copy">
              <span>{activity.changedFromOriginal ? variant === "after" ? "MOVED" : "RECONSIDER" : "LOCKED / KEPT"}</span>
              <h3>{activity.activityName}</h3>
              <p>{activity.locationName} · {archetypeFor(activity.locationId)}</p>
            </div>
            <div className="festival-slot-heat">
              <strong>{number(activity.heatExposurePersonDegreeHours)}</strong>
              <small>person-°C-hours</small>
              <em>{activity.meanTemperatureC.toFixed(1)}°C mean</em>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function FestivalPage() {
  const beforeById = new Map(result.before.activities.map((activity) => [activity.activityId, activity]));
  const moved = result.after.activities.filter((activity) => activity.changedFromOriginal);

  return (
    <main className="festival-shell">
      <header className="festival-header">
        <Link className="wordmark" href="/" aria-label="Back to Celsius Scout">
          <span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>CELSIUS<strong>SCOUT</strong></span>
        </Link>
        <span className="festival-header-title">FESTIVAL TETRIS / DERIVED PROTOTYPE</span>
        <Link className="festival-back" href="/">Back to scouting board <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="festival-hero">
        <div>
          <p className="festival-eyebrow">SAME THERMAL ENGINE · A NEW DECISION</p>
          <h1>Fit the festival<br /><em>around the heat.</em></h1>
        </div>
        <div className="festival-hero-copy">
          <p>Celsius Scout found the character of each location. Festival Tetris uses those same hourly profiles to rearrange a fictional event—without breaking the real-world rules.</p>
          <div className="festival-source"><span>SYNTHETIC DEMO</span>{demoFestivalPlan.sourceLabel}</div>
        </div>
      </section>

      <section className="festival-scoreboard" aria-label="Optimization result">
        <div className="festival-score festival-score--before">
          <span>Original exposure</span>
          <strong>{number(result.before.totalHeatExposurePersonDegreeHours)}</strong>
          <small>person-°C-hours above {demoFestivalPlan.heatThresholdC}°C</small>
        </div>
        <div className="festival-score-arrow" aria-hidden="true">→</div>
        <div className="festival-score festival-score--after">
          <span>Optimized exposure</span>
          <strong>{number(result.after.totalHeatExposurePersonDegreeHours)}</strong>
          <small>same activities · every hard constraint satisfied</small>
        </div>
        <div className="festival-reduction">
          <span>THERMAL LOAD REDUCTION</span>
          <strong>−{result.reductionPercent.toFixed(1)}%</strong>
          <p>{number(result.reductionPersonDegreeHours)} fewer person-°C-hours with {result.after.changedActivityCount} of {demoFestivalPlan.activities.length} activities changed.</p>
        </div>
      </section>

      <section className="festival-board-intro">
        <div><p className="festival-eyebrow">THE BOARD</p><h2>Before meets after.</h2></div>
        <p>Every block below is a real assignment. Exposure combines duration, attendance, and the linearly interpolated thermal profile. Endpoints may touch; overlaps may not.</p>
      </section>
      <div className="festival-board">
        <ScheduleColumn title="Original plan" eyebrow="01 / INTENTIONALLY INEFFICIENT" activities={result.before.activities} variant="before" />
        <ScheduleColumn title="Optimized plan" eyebrow="02 / EXACT BEST FEASIBLE" activities={result.after.activities} variant="after" />
      </div>

      <section className="festival-explanations">
        <header><p className="festival-eyebrow">THE SCOUT REPORT</p><h2>Four moves, each traceable.</h2></header>
        <div className="festival-move-grid">
          {moved.map((after) => {
            const before = beforeById.get(after.activityId) as ActivityExposure;
            const reduction = before.heatExposurePersonDegreeHours - after.heatExposurePersonDegreeHours;
            return (
              <article key={after.activityId}>
                <div className="festival-piece" aria-hidden="true"><i /><i /><i /></div>
                <span>{after.changes.join(" + ")} change</span>
                <h3>{after.activityName}</h3>
                <p><strong>{before.locationName}, {activityTime(before)}</strong> becomes <strong>{after.locationName}, {activityTime(after)}</strong>.</p>
                <dl>
                  <div><dt>Before</dt><dd>{number(before.heatExposurePersonDegreeHours)}</dd></div>
                  <div><dt>After</dt><dd>{number(after.heatExposurePersonDegreeHours)}</dd></div>
                  <div><dt>Reduction</dt><dd>−{number(reduction)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="festival-proof">
        <div className="festival-proof-heading">
          <p className="festival-eyebrow">WHY TRUST THIS RESULT?</p>
          <h2>The optimizer plans.<br />Code keeps score.</h2>
          <p>This prototype does not ask an LLM to estimate temperature, exposure, or feasibility. An LLM agent can choose objectives and explain trade-offs later; the calculations remain deterministic.</p>
        </div>
        <div className="festival-proof-list">
          <article><span>01</span><div><strong>{result.feasibleSchedulesEvaluated.toLocaleString()} feasible schedules checked</strong><p>Every declared combination was evaluated; this fixture uses exact enumeration, not a heuristic.</p></div></article>
          <article><span>02</span><div><strong>{result.candidatesRejectedByConstraints.toLocaleString()} candidates rejected</strong><p>Capacity, fixed assignments, location overlap, shared-crew conflicts, and thermal coverage are hard gates.</p></div></article>
          <article><span>03</span><div><strong>0 violations in the final plan</strong><p>Exposure is optimized first. Equal-exposure plans are resolved by the fewest changed activities and a stable tie-break.</p></div></article>
        </div>
      </section>

      <section className="festival-method">
        <p><strong>Exact scope:</strong> a small finite fixture with preset locations and time choices. Larger real events should move to a constraint solver or bounded search while keeping this evaluator as the source of truth.</p>
        <p><strong>Data honesty:</strong> values come from the labeled synthetic Phoenix cohort. {demoFestivalPlan.heatThresholdC}°C is a comparison threshold—not a health, safety, or comfort claim.</p>
      </section>
    </main>
  );
}
