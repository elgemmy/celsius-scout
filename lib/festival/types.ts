import type { ThermalCohort } from "../types";

export interface FestivalLocation {
  id: string;
  name: string;
  thermalLocationId: string;
  capacity: number;
}

export interface FestivalAssignment {
  activityId: string;
  locationId: string;
  startTimestamp: string;
}

export interface FestivalActivity {
  id: string;
  name: string;
  description: string;
  attendees: number;
  durationHours: number;
  fixed: boolean;
  allowedLocationIds: string[];
  allowedStartTimestamps: string[];
  /** Activities sharing either side of this relation cannot overlap. */
  conflictsWith?: string[];
  originalAssignment: FestivalAssignment;
}

export interface FestivalPlan {
  id: string;
  name: string;
  timezone: string;
  sourceLabel: string;
  /** A comparison threshold, not a health or safety limit. */
  heatThresholdC: number;
  thermalCohort: ThermalCohort;
  locations: FestivalLocation[];
  activities: FestivalActivity[];
}

export type FestivalViolationCode =
  | "missing-assignment"
  | "duplicate-assignment"
  | "unknown-activity"
  | "unknown-location"
  | "location-not-allowed"
  | "time-not-allowed"
  | "fixed-activity-moved"
  | "capacity-exceeded"
  | "outside-thermal-window"
  | "location-overlap"
  | "activity-conflict";

export interface FestivalViolation {
  code: FestivalViolationCode;
  message: string;
  activityIds: string[];
}

export interface ActivityExposure {
  activityId: string;
  activityName: string;
  locationId: string;
  locationName: string;
  startTimestamp: string;
  endTimestamp: string;
  attendees: number;
  meanTemperatureC: number;
  peakTemperatureC: number;
  degreeHoursAboveThresholdPerPerson: number;
  heatExposurePersonDegreeHours: number;
  changedFromOriginal: boolean;
  changes: Array<"location" | "time">;
  evidence: string[];
}

export interface FestivalScheduleEvaluation {
  feasible: boolean;
  assignments: FestivalAssignment[];
  activities: ActivityExposure[];
  violations: FestivalViolation[];
  totalHeatExposurePersonDegreeHours: number;
  changedActivityCount: number;
  locationChangeCount: number;
  timeChangeCount: number;
}

export interface FestivalOptimizationResult {
  planId: string;
  before: FestivalScheduleEvaluation;
  after: FestivalScheduleEvaluation;
  reductionPersonDegreeHours: number;
  reductionPercent: number;
  feasibleSchedulesEvaluated: number;
  candidatesRejectedByConstraints: number;
  movedActivityIds: string[];
  methodology: string[];
}
