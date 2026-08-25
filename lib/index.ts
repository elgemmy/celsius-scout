export { analyzeCohort, type AnalysisOptions } from "./analysis";
export {
  summarizeAverageMasking,
  type AverageMaskingSummary,
} from "./average-insight";
export { classifyArchetype } from "./archetypes";
export { demoCohort } from "./demo-data";
export {
  calculateBaseThermalFeatures,
  degreeHoursAboveThreshold,
  deriveBomApparentTemperatureC,
  durationAboveThresholdHours,
  resolveApparentTemperature,
  withLocalDeviation,
} from "./metrics";
export { percentileRanks, scoreThermalFeatures, type ScoreDirection } from "./scoring";
export {
  compareLocations,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  findUnderratedCoolLocation,
  inspectLocation,
} from "./scouting";
export { elapsedHours, normalizeThermalCohort, toEpochMs } from "./thermal-model";
export type * from "./types";
