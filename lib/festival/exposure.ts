import { degreeHoursAboveThreshold } from "../metrics";
import { elapsedHours, toEpochMs } from "../thermal-model";
import type { ThermalLocation } from "../types";
import type {
  ActivityExposure,
  FestivalAssignment,
  FestivalPlan,
  FestivalScheduleEvaluation,
  FestivalViolation,
} from "./types";

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

function endTimestamp(startTimestamp: string, durationHours: number): string {
  return new Date(toEpochMs(startTimestamp) + durationHours * 3_600_000).toISOString();
}

function intervalsOverlap(
  firstStart: string,
  firstDurationHours: number,
  secondStart: string,
  secondDurationHours: number,
): boolean {
  const firstStartMs = toEpochMs(firstStart);
  const firstEndMs = firstStartMs + firstDurationHours * 3_600_000;
  const secondStartMs = toEpochMs(secondStart);
  const secondEndMs = secondStartMs + secondDurationHours * 3_600_000;
  return firstStartMs < secondEndMs && secondStartMs < firstEndMs;
}

function temperatureAt(location: ThermalLocation, timestamp: string): number | null {
  const target = toEpochMs(timestamp);
  const first = location.samples[0];
  const last = location.samples.at(-1) as ThermalLocation["samples"][number];
  if (target < toEpochMs(first.timestamp) || target > toEpochMs(last.timestamp)) return null;

  for (let index = 0; index < location.samples.length; index += 1) {
    const sample = location.samples[index];
    if (toEpochMs(sample.timestamp) === target) return sample.temperatureC;
    const next = location.samples[index + 1];
    if (!next) break;
    const startMs = toEpochMs(sample.timestamp);
    const endMs = toEpochMs(next.timestamp);
    if (target > startMs && target < endMs) {
      const progress = (target - startMs) / (endMs - startMs);
      return sample.temperatureC + progress * (next.temperatureC - sample.temperatureC);
    }
  }
  return null;
}

interface ExposureWindow {
  meanTemperatureC: number;
  peakTemperatureC: number;
  degreeHoursAboveThresholdPerPerson: number;
  sampleCount: number;
}

function evaluateThermalWindow(
  location: ThermalLocation,
  startTimestamp: string,
  durationHours: number,
  thresholdC: number,
): ExposureWindow | null {
  const end = endTimestamp(startTimestamp, durationHours);
  const startTemperature = temperatureAt(location, startTimestamp);
  const endTemperature = temperatureAt(location, end);
  if (startTemperature === null || endTemperature === null) return null;

  const points = [
    { timestamp: startTimestamp, temperatureC: startTemperature },
    ...location.samples.filter((sample) => (
      toEpochMs(sample.timestamp) > toEpochMs(startTimestamp) &&
      toEpochMs(sample.timestamp) < toEpochMs(end)
    )),
    { timestamp: end, temperatureC: endTemperature },
  ];

  let temperatureDegreeHours = 0;
  let excessDegreeHours = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const duration = elapsedHours(points[index].timestamp, points[index + 1].timestamp);
    temperatureDegreeHours += duration * (
      points[index].temperatureC + points[index + 1].temperatureC
    ) / 2;
    excessDegreeHours += degreeHoursAboveThreshold(
      points[index].temperatureC,
      points[index + 1].temperatureC,
      duration,
      thresholdC,
    );
  }

  return {
    meanTemperatureC: round(temperatureDegreeHours / durationHours),
    peakTemperatureC: round(Math.max(...points.map((point) => point.temperatureC))),
    degreeHoursAboveThresholdPerPerson: round(excessDegreeHours, 3),
    sampleCount: points.length,
  };
}

function sameAssignment(first: FestivalAssignment, second: FestivalAssignment): boolean {
  return first.locationId === second.locationId && first.startTimestamp === second.startTimestamp;
}

function addViolation(
  violations: FestivalViolation[],
  code: FestivalViolation["code"],
  message: string,
  activityIds: string[],
): void {
  violations.push({ code, message, activityIds: [...activityIds].sort() });
}

/**
 * Deterministically validates a complete schedule and integrates its thermal
 * exposure from the same normalized time-series used by Celsius Scout.
 */
export function evaluateFestivalSchedule(
  plan: FestivalPlan,
  assignments: FestivalAssignment[],
): FestivalScheduleEvaluation {
  const violations: FestivalViolation[] = [];
  const activityById = new Map(plan.activities.map((activity) => [activity.id, activity]));
  const locationById = new Map(plan.locations.map((location) => [location.id, location]));
  const thermalById = new Map(plan.thermalCohort.locations.map((location) => [location.id, location]));
  const assignmentByActivity = new Map<string, FestivalAssignment>();

  for (const assignment of assignments) {
    if (!activityById.has(assignment.activityId)) {
      addViolation(violations, "unknown-activity", `Unknown activity ${assignment.activityId}.`, [assignment.activityId]);
      continue;
    }
    if (assignmentByActivity.has(assignment.activityId)) {
      addViolation(violations, "duplicate-assignment", `${assignment.activityId} has more than one assignment.`, [assignment.activityId]);
      continue;
    }
    assignmentByActivity.set(assignment.activityId, assignment);
  }

  const exposures: ActivityExposure[] = [];
  for (const activity of plan.activities) {
    const assignment = assignmentByActivity.get(activity.id);
    if (!assignment) {
      addViolation(violations, "missing-assignment", `${activity.name} is not scheduled.`, [activity.id]);
      continue;
    }
    const festivalLocation = locationById.get(assignment.locationId);
    if (!festivalLocation) {
      addViolation(violations, "unknown-location", `${activity.name} uses an unknown location.`, [activity.id]);
      continue;
    }
    if (!activity.allowedLocationIds.includes(assignment.locationId)) {
      addViolation(violations, "location-not-allowed", `${festivalLocation.name} is not allowed for ${activity.name}.`, [activity.id]);
    }
    if (!activity.allowedStartTimestamps.includes(assignment.startTimestamp)) {
      addViolation(violations, "time-not-allowed", `${activity.name} uses a start time outside its allowed slots.`, [activity.id]);
    }
    if (activity.fixed && !sameAssignment(assignment, activity.originalAssignment)) {
      addViolation(violations, "fixed-activity-moved", `${activity.name} is fixed to its original slot.`, [activity.id]);
    }
    if (activity.attendees > festivalLocation.capacity) {
      addViolation(
        violations,
        "capacity-exceeded",
        `${activity.name} has ${activity.attendees} attendees but ${festivalLocation.name} holds ${festivalLocation.capacity}.`,
        [activity.id],
      );
    }

    const thermalLocation = thermalById.get(festivalLocation.thermalLocationId);
    const thermalWindow = thermalLocation
      ? evaluateThermalWindow(
        thermalLocation,
        assignment.startTimestamp,
        activity.durationHours,
        plan.heatThresholdC,
      )
      : null;
    if (!thermalWindow) {
      addViolation(violations, "outside-thermal-window", `${activity.name} falls outside available thermal observations.`, [activity.id]);
      continue;
    }

    const changes: ActivityExposure["changes"] = [];
    if (assignment.locationId !== activity.originalAssignment.locationId) changes.push("location");
    if (assignment.startTimestamp !== activity.originalAssignment.startTimestamp) changes.push("time");
    const end = endTimestamp(assignment.startTimestamp, activity.durationHours);
    exposures.push({
      activityId: activity.id,
      activityName: activity.name,
      locationId: festivalLocation.id,
      locationName: festivalLocation.name,
      startTimestamp: assignment.startTimestamp,
      endTimestamp: end,
      attendees: activity.attendees,
      meanTemperatureC: thermalWindow.meanTemperatureC,
      peakTemperatureC: thermalWindow.peakTemperatureC,
      degreeHoursAboveThresholdPerPerson: thermalWindow.degreeHoursAboveThresholdPerPerson,
      heatExposurePersonDegreeHours: round(
        thermalWindow.degreeHoursAboveThresholdPerPerson * activity.attendees,
      ),
      changedFromOriginal: changes.length > 0,
      changes,
      evidence: [
        `${thermalWindow.sampleCount} boundary or observed temperature points integrated over ${activity.durationHours} h.`,
        `${thermalWindow.degreeHoursAboveThresholdPerPerson} degree-hours per attendee above ${plan.heatThresholdC}°C.`,
        `Attendance weighting: ${activity.attendees} people.`,
      ],
    });
  }

  const assignedActivities = plan.activities.flatMap((activity) => {
    const assignment = assignmentByActivity.get(activity.id);
    return assignment ? [{ activity, assignment }] : [];
  });
  for (let firstIndex = 0; firstIndex < assignedActivities.length; firstIndex += 1) {
    const first = assignedActivities[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < assignedActivities.length; secondIndex += 1) {
      const second = assignedActivities[secondIndex];
      if (!intervalsOverlap(
        first.assignment.startTimestamp,
        first.activity.durationHours,
        second.assignment.startTimestamp,
        second.activity.durationHours,
      )) continue;

      if (first.assignment.locationId === second.assignment.locationId) {
        addViolation(
          violations,
          "location-overlap",
          `${first.activity.name} and ${second.activity.name} overlap at the same location.`,
          [first.activity.id, second.activity.id],
        );
      }
      const explicitlyConflict = first.activity.conflictsWith?.includes(second.activity.id)
        || second.activity.conflictsWith?.includes(first.activity.id);
      if (explicitlyConflict) {
        addViolation(
          violations,
          "activity-conflict",
          `${first.activity.name} and ${second.activity.name} share resources and cannot overlap.`,
          [first.activity.id, second.activity.id],
        );
      }
    }
  }

  const orderedAssignments = plan.activities.flatMap((activity) => {
    const assignment = assignmentByActivity.get(activity.id);
    return assignment ? [{ ...assignment }] : [];
  });
  const changed = exposures.filter((exposure) => exposure.changedFromOriginal);
  return {
    feasible: violations.length === 0,
    assignments: orderedAssignments,
    activities: exposures,
    violations,
    totalHeatExposurePersonDegreeHours: round(
      exposures.reduce((sum, exposure) => sum + exposure.heatExposurePersonDegreeHours, 0),
    ),
    changedActivityCount: changed.length,
    locationChangeCount: exposures.filter((exposure) => exposure.changes.includes("location")).length,
    timeChangeCount: exposures.filter((exposure) => exposure.changes.includes("time")).length,
  };
}
