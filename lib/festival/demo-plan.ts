import { demoCohort } from "../demo-data";
import type { FestivalActivity, FestivalPlan } from "./types";

const timestamp = (hour: number): string =>
  `2026-08-18T${String(hour).padStart(2, "0")}:00:00-07:00`;

const activity = (
  input: Omit<FestivalActivity, "originalAssignment"> & {
    originalLocationId: string;
    originalStartHour: number;
  },
): FestivalActivity => {
  const { originalLocationId, originalStartHour, ...fields } = input;
  return {
    ...fields,
    originalAssignment: {
      activityId: fields.id,
      locationId: originalLocationId,
      startTimestamp: timestamp(originalStartHour),
    },
  };
};

/**
 * A fictional, intentionally heat-inefficient event plan. It reuses the exact
 * synthetic Phoenix time series behind the Celsius Scout cards.
 */
export const demoFestivalPlan: FestivalPlan = {
  id: "sunset-circuit-demo",
  name: "Sunset Circuit",
  timezone: demoCohort.timezone,
  sourceLabel: "Fictional event plan on the synthetic Phoenix scouting cohort",
  heatThresholdC: demoCohort.thresholdC,
  thermalCohort: demoCohort,
  locations: [
    { id: "glassworks", name: "Glassworks Plaza", thermalLocationId: "glassworks", capacity: 900 },
    { id: "canal-steps", name: "Canal Steps", thermalLocationId: "canal-steps", capacity: 400 },
    { id: "transit-apron", name: "Transit Apron", thermalLocationId: "marathon-apron", capacity: 1_200 },
    { id: "comeback-park", name: "Comeback Park", thermalLocationId: "comeback-park", capacity: 700 },
    { id: "library-arcade", name: "Library Arcade", thermalLocationId: "balanced-arcade", capacity: 550 },
  ],
  activities: [
    activity({
      id: "site-opening",
      name: "Site opening",
      description: "The installed gates and welcome set cannot move.",
      attendees: 600,
      durationHours: 1,
      fixed: true,
      allowedLocationIds: ["glassworks"],
      allowedStartTimestamps: [timestamp(11)],
      originalLocationId: "glassworks",
      originalStartHour: 11,
    }),
    activity({
      id: "dance-circuit",
      name: "Dance circuit",
      description: "A high-attendance two-hour outdoor program.",
      attendees: 600,
      durationHours: 2,
      fixed: false,
      allowedLocationIds: ["glassworks", "transit-apron", "comeback-park", "canal-steps"],
      allowedStartTimestamps: [timestamp(13), timestamp(15), timestamp(17)],
      originalLocationId: "glassworks",
      originalStartHour: 15,
    }),
    activity({
      id: "makers-market",
      name: "Makers market",
      description: "A two-hour market with a shared production footprint.",
      attendees: 420,
      durationHours: 2,
      fixed: false,
      allowedLocationIds: ["transit-apron", "comeback-park", "library-arcade", "canal-steps"],
      allowedStartTimestamps: [timestamp(11), timestamp(13), timestamp(15)],
      originalLocationId: "transit-apron",
      originalStartHour: 13,
    }),
    activity({
      id: "food-lab",
      name: "Food lab",
      description: "A compact one-hour session sharing crew with Junior Jam.",
      attendees: 260,
      durationHours: 1,
      fixed: false,
      allowedLocationIds: ["glassworks", "canal-steps", "library-arcade"],
      allowedStartTimestamps: [timestamp(12), timestamp(14), timestamp(16)],
      conflictsWith: ["junior-jam"],
      originalLocationId: "glassworks",
      originalStartHour: 14,
    }),
    activity({
      id: "junior-jam",
      name: "Junior Jam",
      description: "A one-hour session sharing crew with the Food Lab.",
      attendees: 300,
      durationHours: 1,
      fixed: false,
      allowedLocationIds: ["comeback-park", "canal-steps", "library-arcade"],
      allowedStartTimestamps: [timestamp(13), timestamp(15), timestamp(17)],
      conflictsWith: ["food-lab"],
      originalLocationId: "comeback-park",
      originalStartHour: 13,
    }),
    activity({
      id: "sunset-headliner",
      name: "Sunset headliner",
      description: "Main-stage production is fixed after setup.",
      attendees: 800,
      durationHours: 2,
      fixed: true,
      allowedLocationIds: ["transit-apron"],
      allowedStartTimestamps: [timestamp(17)],
      originalLocationId: "transit-apron",
      originalStartHour: 17,
    }),
  ],
};
