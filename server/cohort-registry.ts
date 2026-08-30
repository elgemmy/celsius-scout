import "server-only";

import { demoCohort } from "../lib/demo-data";
import type { ThermalCohort } from "../lib/types";
import { fortyGuardPhoenixCohort } from "./fortyguard-snapshot";

export const experienceCohorts: ThermalCohort[] = [fortyGuardPhoenixCohort, demoCohort];

export function cohortById(cohortId: unknown): ThermalCohort {
  if (typeof cohortId !== "string") return fortyGuardPhoenixCohort;
  const cohort = experienceCohorts.find((candidate) => candidate.id === cohortId);
  if (!cohort) throw new Error("Unknown Celsius Scout cohort");
  return cohort;
}
