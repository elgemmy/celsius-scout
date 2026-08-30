import "server-only";

import capture10 from "../data/fortyguard/raw/phoenix-2026-08-18/10-00.json";
import capture11 from "../data/fortyguard/raw/phoenix-2026-08-18/11-00.json";
import capture12 from "../data/fortyguard/raw/phoenix-2026-08-18/12-00.json";
import capture13 from "../data/fortyguard/raw/phoenix-2026-08-18/13-00.json";
import capture14 from "../data/fortyguard/raw/phoenix-2026-08-18/14-00.json";
import capture15 from "../data/fortyguard/raw/phoenix-2026-08-18/15-00.json";
import capture16 from "../data/fortyguard/raw/phoenix-2026-08-18/16-00.json";
import capture17 from "../data/fortyguard/raw/phoenix-2026-08-18/17-00.json";
import capture18 from "../data/fortyguard/raw/phoenix-2026-08-18/18-00.json";
import capture19 from "../data/fortyguard/raw/phoenix-2026-08-18/19-00.json";
import capture20 from "../data/fortyguard/raw/phoenix-2026-08-18/20-00.json";
import { mapFortyGuardHourlyCaptures } from "./fortyguard-mapper";

const captures = [
  capture10,
  capture11,
  capture12,
  capture13,
  capture14,
  capture15,
  capture16,
  capture17,
  capture18,
  capture19,
  capture20,
];

const capturedAt = captures
  .map((capture) => capture.capturedAt)
  .sort((left, right) => left.localeCompare(right))
  .at(-1) as string;

export const fortyGuardPhoenixCohort = mapFortyGuardHourlyCaptures(captures, {
  id: "phoenix-fortyguard-2026-08-18",
  name: "Central Phoenix observed combine",
  timezone: "America/Phoenix",
  utcOffset: "-07:00",
  thresholdC: 38,
  granularityM: 100,
  snapshotId: "phoenix-2026-08-18-100m-hourly-v1",
  capturedAt,
  locationCount: 10,
});
