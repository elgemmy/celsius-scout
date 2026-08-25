import { describe, expect, it } from "vitest";
import { demoFestivalPlan } from "./demo-plan";
import { evaluateFestivalSchedule } from "./exposure";
import { optimizeFestivalPlan } from "./optimizer";

const originalAssignments = demoFestivalPlan.activities.map((activity) => ({
  ...activity.originalAssignment,
}));

describe("festival schedule evaluation", () => {
  it("evaluates the fixture's original schedule from thermal series evidence", () => {
    const evaluation = evaluateFestivalSchedule(demoFestivalPlan, originalAssignments);

    expect(evaluation.feasible).toBe(true);
    expect(evaluation.violations).toEqual([]);
    expect(evaluation.activities).toHaveLength(demoFestivalPlan.activities.length);
    expect(evaluation.changedActivityCount).toBe(0);
    expect(evaluation.totalHeatExposurePersonDegreeHours).toBeGreaterThan(0);
    expect(evaluation.activities.every((activity) => activity.evidence.length === 3)).toBe(true);
  });

  it("rejects capacity, fixed-movement, location-overlap, and declared conflicts", () => {
    const invalidAssignments = originalAssignments.map((assignment) => {
      if (assignment.activityId === "dance-circuit") {
        return {
          ...assignment,
          locationId: "canal-steps",
          startTimestamp: "2026-08-18T13:00:00-07:00",
        };
      }
      if (assignment.activityId === "site-opening") {
        return { ...assignment, locationId: "canal-steps" };
      }
      if (assignment.activityId === "junior-jam") {
        return {
          ...assignment,
          locationId: "canal-steps",
          startTimestamp: "2026-08-18T14:00:00-07:00",
        };
      }
      return assignment;
    });
    const evaluation = evaluateFestivalSchedule(demoFestivalPlan, invalidAssignments);
    const codes = evaluation.violations.map((violation) => violation.code);

    expect(evaluation.feasible).toBe(false);
    expect(codes).toContain("capacity-exceeded");
    expect(codes).toContain("fixed-activity-moved");
    expect(codes).toContain("location-overlap");
    expect(codes).toContain("activity-conflict");
  });

  it("treats touching endpoints as non-overlapping", () => {
    const evaluation = evaluateFestivalSchedule(demoFestivalPlan, originalAssignments);
    const food = evaluation.activities.find((activity) => activity.activityId === "food-lab");
    const dance = evaluation.activities.find((activity) => activity.activityId === "dance-circuit");

    expect(food?.endTimestamp).toBe(new Date(dance?.startTimestamp as string).toISOString());
    expect(evaluation.violations.some((violation) => violation.code === "location-overlap")).toBe(false);
  });
});

describe("festival optimizer", () => {
  it("finds the same exact optimum on repeat", () => {
    const first = optimizeFestivalPlan(demoFestivalPlan);
    const second = optimizeFestivalPlan(demoFestivalPlan);

    expect(first).toEqual(second);
    expect(first.before.feasible).toBe(true);
    expect(first.after.feasible).toBe(true);
    expect(first.reductionPersonDegreeHours).toBeGreaterThan(0);
    expect(first.reductionPercent).toBeGreaterThan(0);
    expect(first.feasibleSchedulesEvaluated).toBeGreaterThan(1);
    expect(first.candidatesRejectedByConstraints).toBeGreaterThan(0);
    // These values also protect the evidence rendered by the static demo page.
    expect(first.after.totalHeatExposurePersonDegreeHours).toBe(2_910);
    expect(first.after.changedActivityCount).toBe(4);
  });

  it("never moves fixed activities and reports every change", () => {
    const result = optimizeFestivalPlan(demoFestivalPlan);
    const afterById = new Map(result.after.assignments.map((assignment) => [assignment.activityId, assignment]));

    for (const activity of demoFestivalPlan.activities.filter((item) => item.fixed)) {
      expect(afterById.get(activity.id)).toEqual(activity.originalAssignment);
      expect(result.movedActivityIds).not.toContain(activity.id);
    }
    expect(result.after.changedActivityCount).toBe(result.movedActivityIds.length);
    expect(result.after.activities.filter((activity) => activity.changedFromOriginal).map((activity) => activity.activityId))
      .toEqual(result.movedActivityIds);
  });

  it("uses exposure as the primary objective and changes only as a tie-break", () => {
    const result = optimizeFestivalPlan(demoFestivalPlan);

    expect(result.after.totalHeatExposurePersonDegreeHours)
      .toBeLessThan(result.before.totalHeatExposurePersonDegreeHours);
    expect(result.methodology.join(" ")).toContain("fewest changed activities");
    expect(result.methodology.join(" ")).toContain("not a safe/unsafe boundary");
  });
});
