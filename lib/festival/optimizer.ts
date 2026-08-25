import { evaluateFestivalSchedule } from "./exposure";
import type {
  FestivalActivity,
  FestivalAssignment,
  FestivalOptimizationResult,
  FestivalPlan,
  FestivalScheduleEvaluation,
} from "./types";

function candidateAssignments(activity: FestivalActivity): FestivalAssignment[] {
  if (activity.fixed) return [{ ...activity.originalAssignment }];
  return activity.allowedStartTimestamps.flatMap((startTimestamp) =>
    activity.allowedLocationIds.map((locationId) => ({
      activityId: activity.id,
      locationId,
      startTimestamp,
    })),
  ).sort((first, second) =>
    first.startTimestamp.localeCompare(second.startTimestamp)
    || first.locationId.localeCompare(second.locationId),
  );
}

function scheduleKey(evaluation: FestivalScheduleEvaluation): string {
  return evaluation.assignments
    .map((assignment) => `${assignment.activityId}:${assignment.startTimestamp}:${assignment.locationId}`)
    .join("|");
}

/** Heat exposure is primary; minimum changed activities is the exact tie-break. */
function isBetter(
  candidate: FestivalScheduleEvaluation,
  incumbent: FestivalScheduleEvaluation | null,
): boolean {
  if (!incumbent) return true;
  return candidate.totalHeatExposurePersonDegreeHours < incumbent.totalHeatExposurePersonDegreeHours
    || (
      candidate.totalHeatExposurePersonDegreeHours === incumbent.totalHeatExposurePersonDegreeHours
      && (
        candidate.changedActivityCount < incumbent.changedActivityCount
        || (
          candidate.changedActivityCount === incumbent.changedActivityCount
          && scheduleKey(candidate).localeCompare(scheduleKey(incumbent)) < 0
        )
      )
    );
}

/**
 * Exhaustively evaluates the fixture's finite assignment space. This is an
 * exact optimizer for the declared choices, not a heuristic or LLM proposal.
 */
export function optimizeFestivalPlan(plan: FestivalPlan): FestivalOptimizationResult {
  const originalAssignments = plan.activities.map((activity) => ({ ...activity.originalAssignment }));
  const before = evaluateFestivalSchedule(plan, originalAssignments);
  if (!before.feasible) throw new Error("The original festival schedule must be feasible");

  const candidates = plan.activities.map(candidateAssignments);
  let best: FestivalScheduleEvaluation | null = null;
  let feasibleSchedulesEvaluated = 0;
  let candidatesRejectedByConstraints = 0;

  function visit(activityIndex: number, assignments: FestivalAssignment[]): void {
    if (activityIndex === plan.activities.length) {
      const evaluation = evaluateFestivalSchedule(plan, assignments);
      if (!evaluation.feasible) {
        candidatesRejectedByConstraints += 1;
        return;
      }
      feasibleSchedulesEvaluated += 1;
      if (isBetter(evaluation, best)) best = evaluation;
      return;
    }
    for (const assignment of candidates[activityIndex]) {
      visit(activityIndex + 1, [...assignments, assignment]);
    }
  }

  visit(0, []);
  if (!best) throw new Error("No feasible festival schedule exists for the declared choices");
  const after: FestivalScheduleEvaluation = best;
  const reduction = before.totalHeatExposurePersonDegreeHours
    - after.totalHeatExposurePersonDegreeHours;
  const reductionPercent = before.totalHeatExposurePersonDegreeHours === 0
    ? 0
    : (reduction / before.totalHeatExposurePersonDegreeHours) * 100;

  return {
    planId: plan.id,
    before,
    after,
    reductionPersonDegreeHours: Math.round(reduction * 100) / 100,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
    feasibleSchedulesEvaluated,
    candidatesRejectedByConstraints,
    movedActivityIds: after.activities
      .filter((activity) => activity.changedFromOriginal)
      .map((activity) => activity.activityId),
    methodology: [
      "Enumerate every declared activity, location, and start-time combination in stable order.",
      "Reject schedules that move fixed activities, exceed capacity, overlap a location, overlap declared activity conflicts, or fall outside the thermal series.",
      `Integrate linearly interpolated temperature above ${plan.heatThresholdC}°C and multiply by attendance to obtain person-degree-hours.`,
      "Choose the feasible schedule with the lowest total person-degree-hours; if tied, choose the fewest changed activities, then a stable lexical schedule key.",
      "The comparison threshold is an operational demo reference, not a safe/unsafe boundary or health model.",
    ],
  };
}
