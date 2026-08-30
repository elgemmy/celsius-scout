import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const baseUrl = process.env.CELSIUS_SCOUT_URL ?? "http://localhost:3000";
const captureToken = process.env.FORTYGUARD_CAPTURE_TOKEN;
if (!captureToken) throw new Error("FORTYGUARD_CAPTURE_TOKEN is required to use operator capture routes");
const date = "2026-08-18";
const times = Array.from({ length: 11 }, (_, index) => `${String(index + 10).padStart(2, "0")}:00`);
const outputDirectory = path.join(process.cwd(), "data", "fortyguard", "raw", `phoenix-${date}`);
const resumedActivities = JSON.parse(process.env.FORTYGUARD_RESUME_ACTIVITIES ?? "{}");

const polygonAoi = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-112.08, 33.448],
          [-112.07, 33.448],
          [-112.07, 33.456],
          [-112.08, 33.456],
          [-112.08, 33.448],
        ]],
      },
      properties: null,
    },
  ],
};

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function captureRequest(time) {
  return { date, time, granularityM: 100, analyticType: "tcm", polygonAoi };
}

async function requestJson(relativePath, init) {
  const response = await fetch(new URL(relativePath, baseUrl), {
    ...init,
    headers: { ...init?.headers, authorization: `Bearer ${captureToken}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${relativePath} failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function existingCapture(time) {
  const filename = path.join(outputDirectory, `${time.replace(":", "-")}.json`);
  try {
    const parsed = JSON.parse(await readFile(filename, "utf8"));
    if (
      sha256(parsed?.request) === sha256(captureRequest(time)) &&
      parsed?.result?.map_data?.features?.length
    ) return parsed;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return null;
}

async function submit(time) {
  const payload = await requestJson("/api/fortyguard/heatmap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      polygonAoi,
      dateTime: { filterType: 1, startDate: date, startTime: time },
      granularity: 100,
      analyticType: "tcm",
    }),
  });
  if (typeof payload?.activityId !== "string") throw new Error(`Submission for ${time} returned no activity ID`);
  return payload.activityId;
}

async function poll(activityId, time) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const payload = await requestJson(`/api/fortyguard/status/${encodeURIComponent(activityId)}`);
    if (payload?.status === "Completed" && payload?.result?.map_data?.features?.length) return payload.result;
    if (payload?.status === "Failed") throw new Error(`FortyGuard activity ${activityId} failed for ${time}`);
    if (attempt < 7) await wait(Math.min(12_000, 3_000 * 2 ** attempt));
  }
  throw new Error(`FortyGuard activity ${activityId} timed out for ${time}`);
}

await mkdir(outputDirectory, { recursive: true });
const captures = [];

for (const time of times) {
  const cached = await existingCapture(time);
  if (cached) {
    captures.push(cached);
    process.stdout.write(`Reused ${time}\n`);
    continue;
  }

  const resumedId = resumedActivities[time];
  const activityId = typeof resumedId === "string" ? resumedId : await submit(time);
  const result = await poll(activityId, time);
  const capture = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    activityId,
    request: captureRequest(time),
    result,
  };
  await writeFile(
    path.join(outputDirectory, `${time.replace(":", "-")}.json`),
    `${JSON.stringify(capture, null, 2)}\n`,
    { mode: 0o644 },
  );
  captures.push(capture);
  process.stdout.write(`Captured ${time}: ${result.map_data.features.length} tiles\n`);
}

const manifest = {
  schemaVersion: 1,
  id: `phoenix-${date}-100m-hourly`,
  name: "Central Phoenix FortyGuard snapshot",
  timezone: "America/Phoenix",
  thresholdC: 38,
  source: {
    label: "FortyGuard observed hourly ambient-air temperature · 100 m historical snapshot",
    kind: "fortyguard",
  },
  date,
  granularityM: 100,
  polygonAoi,
  captures: captures.map((capture) => ({
    time: capture.request.time,
    timestamp: `${date}T${capture.request.time}:00-07:00`,
    activityId: capture.activityId,
    requestSha256: sha256(capture.request),
    resultSha256: sha256(capture.result),
    file: `raw/phoenix-${date}/${capture.request.time.replace(":", "-")}.json`,
  })),
};

await writeFile(
  path.join(process.cwd(), "data", "fortyguard", `phoenix-${date}-manifest.json`),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { mode: 0o644 },
);
process.stdout.write(`Wrote ${captures.length}-snapshot manifest\n`);
