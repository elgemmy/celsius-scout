/**
 * Server-side boundary for the FortyGuard API.
 *
 * Keep this module out of client component imports: it is the only place that
 * reads FORTYGUARD_API_KEY and it deliberately returns a small, normalized
 * response surface instead of proxying provider responses verbatim.
 */

const DEFAULT_BASE_URL = "https://api.fortyguard.com";
const ACTIVITY_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type FortyGuardGranularity = 60 | 80 | 100;
export type FortyGuardAnalyticType = "tcm" | "time_of_measure" | "exceedance" | "persistence";
export type FortyGuardThresholdDirection = "above" | "below";

export type GeoJsonPosition = [longitude: number, latitude: number] | [longitude: number, latitude: number, altitude: number];

export interface GeoJsonPolygonFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: GeoJsonPosition[][];
  };
  properties: null;
}

export interface GeoJsonPolygonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonPolygonFeature[];
}

export type FortyGuardDateTimeFilter =
  | { filterType: 1; startDate: string; startTime: string }
  | { filterType: 2; startDate: string; startTime: string; endTime: string }
  | { filterType: 3; startDate: string };

export interface FortyGuardHeatmapRequest {
  polygonAoi: GeoJsonPolygonFeatureCollection;
  dateTime: FortyGuardDateTimeFilter;
  granularity: FortyGuardGranularity;
  analyticType?: FortyGuardAnalyticType;
  threshold?: number;
  direction?: FortyGuardThresholdDirection;
}

interface ProviderHeatmapPayload {
  polygon_aoi: GeoJsonPolygonFeatureCollection;
  date_time:
    | { filter_type: 1; start_date: string; start_time: string }
    | { filter_type: 2; start_date: string; start_time: string; end_time: string }
    | { filter_type: 3; start_date: string };
  granularity: FortyGuardGranularity;
  analytic_type: FortyGuardAnalyticType;
  threshold?: number;
  direction?: FortyGuardThresholdDirection;
}

export type SafeProviderJson = null | boolean | number | string | SafeProviderJson[] | { [key: string]: SafeProviderJson };

export interface HeatmapSubmission {
  activityId: string;
}

export type FortyGuardActivityStatus<TResult extends SafeProviderJson = SafeProviderJson> =
  | { activityId: string; status: "Processing" }
  | { activityId: string; status: "Completed"; result: TResult }
  | { activityId: string; status: "Failed" };

export type FortyGuardErrorCode =
  | "invalid_request"
  | "not_configured"
  | "upstream_http_error"
  | "rate_limited"
  | "invalid_provider_response"
  | "activity_failed"
  | "poll_timeout";

export class FortyGuardProviderError extends Error {
  readonly code: FortyGuardErrorCode;
  readonly activityId?: string;
  readonly httpStatus?: number;
  readonly retryAfterMs?: number;
  readonly issues?: string[];

  constructor(
    message: string,
    options: {
      code: FortyGuardErrorCode;
      activityId?: string;
      httpStatus?: number;
      retryAfterMs?: number;
      issues?: string[];
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "FortyGuardProviderError";
    this.code = options.code;
    this.activityId = options.activityId;
    this.httpStatus = options.httpStatus;
    this.retryAfterMs = options.retryAfterMs;
    this.issues = options.issues;
  }
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Sleep = (milliseconds: number) => Promise<void>;

export interface FortyGuardProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: FetchLike;
}

export interface PollOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  initialNotFoundTolerance?: number;
  sleep?: Sleep;
}

export interface FortyGuardProvider {
  submitHeatmap(input: unknown): Promise<HeatmapSubmission>;
  getActivityStatus(activityId: string): Promise<FortyGuardActivityStatus>;
  waitForActivity(activityId: string, options?: PollOptions): Promise<Extract<FortyGuardActivityStatus, { status: "Completed" }>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertValidDate(value: unknown, field: string, issues: string[]): value is string {
  if (typeof value !== "string") {
    issues.push(`${field} must use YYYY-MM-DD format`);
    return false;
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) {
    issues.push(`${field} must use YYYY-MM-DD format`);
    return false;
  }

  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2021 ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    issues.push(`${field} must be a real date in 2021 or later`);
    return false;
  }
  return true;
}

function assertValidTime(value: unknown, field: string, issues: string[]): value is string {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    issues.push(`${field} must use HH:MM 24-hour format`);
    return false;
  }
  return true;
}

function timeAsMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function positionsMatch(left: GeoJsonPosition, right: GeoJsonPosition): boolean {
  return left.length === right.length && left.every((coordinate, index) => coordinate === right[index]);
}

function validatePosition(value: unknown, field: string, issues: string[]): value is GeoJsonPosition {
  if (
    !Array.isArray(value) ||
    (value.length !== 2 && value.length !== 3) ||
    !value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
  ) {
    issues.push(`${field} must be a GeoJSON position with two or three finite coordinates`);
    return false;
  }

  const [longitude, latitude] = value as number[];
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    issues.push(`${field} longitude/latitude is outside the GeoJSON range`);
    return false;
  }
  return true;
}

function validatePolygonFeatureCollection(
  value: unknown,
  field: string,
  issues: string[],
): value is GeoJsonPolygonFeatureCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features) || value.features.length === 0) {
    issues.push(`${field} must be a non-empty GeoJSON FeatureCollection`);
    return false;
  }

  let valid = true;
  value.features.forEach((feature, featureIndex) => {
    const featurePath = `${field}.features[${featureIndex}]`;
    if (!isRecord(feature) || feature.type !== "Feature" || !isRecord(feature.geometry) || feature.geometry.type !== "Polygon") {
      issues.push(`${featurePath} must be a GeoJSON Polygon Feature`);
      valid = false;
      return;
    }

    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      issues.push(`${featurePath}.geometry.coordinates must contain at least one linear ring`);
      valid = false;
      return;
    }

    coordinates.forEach((ring, ringIndex) => {
      const ringPath = `${featurePath}.geometry.coordinates[${ringIndex}]`;
      if (!Array.isArray(ring) || ring.length < 4) {
        issues.push(`${ringPath} must contain at least four positions`);
        valid = false;
        return;
      }

      const validPositions = ring.every((position, positionIndex) => validatePosition(position, `${ringPath}[${positionIndex}]`, issues));
      if (!validPositions) {
        valid = false;
        return;
      }

      if (!positionsMatch(ring[0] as GeoJsonPosition, ring[ring.length - 1] as GeoJsonPosition)) {
        issues.push(`${ringPath} must be closed (first and last positions must match)`);
        valid = false;
      }
    });
  });

  return valid;
}

function validateDateTime(value: unknown, issues: string[]): value is FortyGuardDateTimeFilter {
  if (!isRecord(value) || ![1, 2, 3].includes(value.filterType as number)) {
    issues.push("dateTime.filterType must be 1, 2, or 3");
    return false;
  }

  const filterType = value.filterType;
  const validDate = assertValidDate(value.startDate, "dateTime.startDate", issues);

  if ("endDate" in value) issues.push("dateTime.endDate is not supported for filter types 1-3");

  if (filterType === 1) {
    const validStart = assertValidTime(value.startTime, "dateTime.startTime", issues);
    if ("endTime" in value) issues.push("dateTime.endTime is not allowed for filter type 1");
    return validDate && validStart;
  }

  if (filterType === 2) {
    const validStart = assertValidTime(value.startTime, "dateTime.startTime", issues);
    const validEnd = assertValidTime(value.endTime, "dateTime.endTime", issues);
    if (validStart && validEnd && timeAsMinutes(value.startTime as string) >= timeAsMinutes(value.endTime as string)) {
      issues.push("dateTime.endTime must be later than dateTime.startTime on the same day");
      return false;
    }
    return validDate && validStart && validEnd;
  }

  if ("startTime" in value) issues.push("dateTime.startTime is not allowed for filter type 3");
  if ("endTime" in value) issues.push("dateTime.endTime is not allowed for filter type 3");
  return validDate;
}

export function validateHeatmapRequest(input: unknown): FortyGuardHeatmapRequest {
  const issues: string[] = [];
  if (!isRecord(input)) {
    throw new FortyGuardProviderError("Invalid FortyGuard heatmap request", {
      code: "invalid_request",
      issues: ["request body must be an object"],
    });
  }

  const validPolygon = validatePolygonFeatureCollection(input.polygonAoi, "polygonAoi", issues);
  const validDateTime = validateDateTime(input.dateTime, issues);

  if (![60, 80, 100].includes(input.granularity as number)) {
    issues.push("granularity must be 60, 80, or 100 metres");
  }

  const analyticType = input.analyticType ?? "tcm";
  if (!["tcm", "time_of_measure", "exceedance", "persistence"].includes(analyticType as string)) {
    issues.push("analyticType must be tcm, time_of_measure, exceedance, or persistence");
  }

  const thresholdMode = analyticType === "exceedance" || analyticType === "persistence";
  if (input.threshold !== undefined && (typeof input.threshold !== "number" || !Number.isFinite(input.threshold))) {
    issues.push("threshold must be a finite number");
  }
  if (input.direction !== undefined && input.direction !== "above" && input.direction !== "below") {
    issues.push("direction must be above or below");
  }
  if (!thresholdMode && input.threshold !== undefined) {
    issues.push("threshold is only valid for exceedance or persistence analytics");
  }
  if (!thresholdMode && input.direction !== undefined) {
    issues.push("direction is only valid for exceedance or persistence analytics");
  }

  if (issues.length > 0 || !validPolygon || !validDateTime) {
    throw new FortyGuardProviderError("Invalid FortyGuard heatmap request", {
      code: "invalid_request",
      issues,
    });
  }

  // The AOI needs geometry only. Rebuild it from validated coordinates so
  // arbitrary client properties and non-schema fields never cross the
  // provider boundary.
  const sourcePolygon = input.polygonAoi as GeoJsonPolygonFeatureCollection;
  const polygonAoi: GeoJsonPolygonFeatureCollection = {
    type: "FeatureCollection",
    features: sourcePolygon.features.map((feature) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: feature.geometry.coordinates.map((ring) => ring.map((position) => [...position] as GeoJsonPosition)),
      },
      properties: null,
    })),
  };

  return {
    polygonAoi,
    dateTime: input.dateTime as FortyGuardDateTimeFilter,
    granularity: input.granularity as FortyGuardGranularity,
    analyticType: analyticType as FortyGuardAnalyticType,
    ...(input.threshold !== undefined ? { threshold: input.threshold as number } : {}),
    ...(input.direction !== undefined ? { direction: input.direction as FortyGuardThresholdDirection } : {}),
  };
}

function toProviderPayload(request: FortyGuardHeatmapRequest): ProviderHeatmapPayload {
  const dateTime = request.dateTime;
  const date_time =
    dateTime.filterType === 1
      ? { filter_type: 1 as const, start_date: dateTime.startDate, start_time: dateTime.startTime }
      : dateTime.filterType === 2
        ? {
            filter_type: 2 as const,
            start_date: dateTime.startDate,
            start_time: dateTime.startTime,
            end_time: dateTime.endTime,
          }
        : { filter_type: 3 as const, start_date: dateTime.startDate };

  return {
    polygon_aoi: request.polygonAoi,
    date_time,
    granularity: request.granularity,
    analytic_type: request.analyticType ?? "tcm",
    ...(request.threshold !== undefined ? { threshold: request.threshold } : {}),
    ...(request.direction !== undefined ? { direction: request.direction } : {}),
  };
}

export function assertValidActivityId(activityId: unknown): asserts activityId is string {
  if (typeof activityId !== "string" || !ACTIVITY_ID_PATTERN.test(activityId)) {
    throw new FortyGuardProviderError("Invalid FortyGuard activity ID", {
      code: "invalid_request",
      issues: ["activityId must contain 6-128 letters, numbers, underscores, or hyphens"],
    });
  }
}

function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, timestamp - now);
}

async function parseJson(response: Response, activityId?: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new FortyGuardProviderError("FortyGuard returned an invalid response", {
      code: "invalid_provider_response",
      activityId,
      httpStatus: response.status,
      cause,
    });
  }
}

function httpError(response: Response, activityId?: string): FortyGuardProviderError {
  const retryAfterMs = response.status === 429 ? parseRetryAfter(response.headers.get("retry-after")) : undefined;
  return new FortyGuardProviderError(
    response.status === 429 ? "FortyGuard rate limit reached" : `FortyGuard request failed with HTTP ${response.status}`,
    {
      code: response.status === 429 ? "rate_limited" : "upstream_http_error",
      activityId,
      httpStatus: response.status,
      retryAfterMs,
    },
  );
}

function normalizeActivityId(value: unknown): string | undefined {
  return typeof value === "string" && ACTIVITY_ID_PATTERN.test(value) ? value : undefined;
}

function sanitizeProviderJson(value: unknown, seen = new WeakSet<object>()): SafeProviderJson {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    // Heatmap results do not require links. Dropping every absolute URL makes
    // accidental proxying of temporary signed report links impossible.
    if (/^https?:\/\//i.test(value) || /(?:x-amz-signature|x-goog-signature|[?&](?:sig|signature|token)=)/i.test(value)) {
      return "[redacted-link]";
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeProviderJson(item, seen));
  if (!isRecord(value)) return null;
  if (seen.has(value)) return null;
  seen.add(value);

  const sanitized: { [key: string]: SafeProviderJson } = {};
  for (const [key, nested] of Object.entries(value)) {
    if (/(?:api[-_]?key|authorization|credential|secret|token|signature|signed[-_]?url|download[-_]?url)/i.test(key)) {
      continue;
    }
    sanitized[key] = sanitizeProviderJson(nested, seen);
  }
  return sanitized;
}

function completedResult(data: Record<string, unknown>): SafeProviderJson {
  if ("result" in data) return sanitizeProviderJson(data.result);
  if ("data" in data) return sanitizeProviderJson(data.data);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!["status", "state", "activity_id", "activityId"].includes(key)) result[key] = value;
  }
  return sanitizeProviderJson(result);
}

function normalizeStatus(data: unknown, expectedActivityId: string): FortyGuardActivityStatus {
  if (!isRecord(data)) {
    throw new FortyGuardProviderError("FortyGuard returned an invalid status response", {
      code: "invalid_provider_response",
      activityId: expectedActivityId,
    });
  }

  const rawStatus = typeof data.status === "string" ? data.status : typeof data.state === "string" ? data.state : "";
  const status = rawStatus.trim().toLowerCase();
  if (status === "processing" || status === "pending" || status === "queued") {
    return { activityId: expectedActivityId, status: "Processing" };
  }
  if (status === "completed" || status === "complete" || status === "succeeded" || status === "success") {
    return { activityId: expectedActivityId, status: "Completed", result: completedResult(data) };
  }
  if (status === "failed" || status === "failure" || status === "error") {
    return { activityId: expectedActivityId, status: "Failed" };
  }

  throw new FortyGuardProviderError("FortyGuard returned an unknown activity status", {
    code: "invalid_provider_response",
    activityId: expectedActivityId,
  });
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("unsafe base URL");
    return url.toString().replace(/\/$/, "");
  } catch (cause) {
    throw new FortyGuardProviderError("FortyGuard API base URL is invalid", {
      code: "not_configured",
      cause,
    });
  }
}

function delayForAttempt(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createFortyGuardProvider(options: FortyGuardProviderOptions = {}): FortyGuardProvider {
  const apiKey = options.apiKey ?? process.env.FORTYGUARD_API_KEY;
  if (!apiKey?.trim()) {
    throw new FortyGuardProviderError("FortyGuard live data is not configured", { code: "not_configured" });
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.FORTYGUARD_API_BASE_URL ?? DEFAULT_BASE_URL);
  const fetcher = options.fetch ?? globalThis.fetch;

  async function fetchStatus(activityId: string): Promise<FortyGuardActivityStatus> {
    assertValidActivityId(activityId);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/v1/status/${encodeURIComponent(activityId)}`, {
        method: "GET",
        headers: { "api-key": apiKey as string },
        cache: "no-store",
      });
    } catch (cause) {
      throw new FortyGuardProviderError("Could not reach FortyGuard", {
        code: "upstream_http_error",
        activityId,
        cause,
      });
    }

    if (!response.ok) throw httpError(response, activityId);
    return normalizeStatus(await parseJson(response, activityId), activityId);
  }

  return {
    async submitHeatmap(input: unknown): Promise<HeatmapSubmission> {
      const request = validateHeatmapRequest(input);
      let response: Response;
      try {
        response = await fetcher(`${baseUrl}/v1/heatmap`, {
          method: "POST",
          headers: { "content-type": "application/json", "api-key": apiKey },
          body: JSON.stringify(toProviderPayload(request)),
          cache: "no-store",
        });
      } catch (cause) {
        throw new FortyGuardProviderError("Could not reach FortyGuard", {
          code: "upstream_http_error",
          cause,
        });
      }

      if (!response.ok) throw httpError(response);
      const data = await parseJson(response);
      const activityId = isRecord(data)
        ? normalizeActivityId(data.activity_id) ?? normalizeActivityId(data.activityId)
        : undefined;
      if (!activityId) {
        throw new FortyGuardProviderError("FortyGuard did not return a valid activity ID", {
          code: "invalid_provider_response",
        });
      }
      return { activityId };
    },

    getActivityStatus: fetchStatus,

    async waitForActivity(activityId: string, pollOptions: PollOptions = {}) {
      assertValidActivityId(activityId);
      const maxAttempts = pollOptions.maxAttempts ?? 6;
      const baseDelayMs = pollOptions.baseDelayMs ?? 3_000;
      const maxDelayMs = pollOptions.maxDelayMs ?? 12_000;
      const initialNotFoundTolerance = pollOptions.initialNotFoundTolerance ?? 2;
      const sleep = pollOptions.sleep ?? defaultSleep;

      if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
        throw new FortyGuardProviderError("maxAttempts must be an integer from 1 to 20", {
          code: "invalid_request",
          activityId,
        });
      }
      if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0 || !Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) {
        throw new FortyGuardProviderError("Polling delays are invalid", { code: "invalid_request", activityId });
      }
      if (!Number.isInteger(initialNotFoundTolerance) || initialNotFoundTolerance < 0 || initialNotFoundTolerance > maxAttempts) {
        throw new FortyGuardProviderError("initialNotFoundTolerance is invalid", { code: "invalid_request", activityId });
      }

      let validStatusSeen = false;
      let notFoundCount = 0;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const status = await fetchStatus(activityId);
          validStatusSeen = true;
          if (status.status === "Completed") return status;
          if (status.status === "Failed") {
            throw new FortyGuardProviderError("FortyGuard activity failed", {
              code: "activity_failed",
              activityId,
            });
          }
        } catch (error) {
          if (!(error instanceof FortyGuardProviderError)) throw error;
          const toleratedNotFound =
            error.httpStatus === 404 && !validStatusSeen && notFoundCount < initialNotFoundTolerance;
          if (toleratedNotFound) {
            notFoundCount += 1;
          } else if (error.code !== "rate_limited") {
            throw error;
          }

          if (attempt < maxAttempts - 1) {
            const fallbackDelay = delayForAttempt(attempt, baseDelayMs, maxDelayMs);
            await sleep(Math.min(maxDelayMs, error.retryAfterMs ?? fallbackDelay));
            continue;
          }
        }

        if (attempt < maxAttempts - 1) {
          await sleep(delayForAttempt(attempt, baseDelayMs, maxDelayMs));
        }
      }

      throw new FortyGuardProviderError("FortyGuard activity did not complete before the polling limit", {
        code: "poll_timeout",
        activityId,
      });
    },
  };
}

export interface SafeRouteError {
  status: number;
  body: {
    error: {
      code: FortyGuardErrorCode | "invalid_json" | "unexpected_error";
      message: string;
      activityId?: string;
      retryAfterSeconds?: number;
      issues?: string[];
    };
  };
  headers?: Record<string, string>;
}

export function toSafeRouteError(error: unknown): SafeRouteError {
  if (error instanceof SyntaxError) {
    return { status: 400, body: { error: { code: "invalid_json", message: "Request body must be valid JSON" } } };
  }

  if (!(error instanceof FortyGuardProviderError)) {
    return { status: 500, body: { error: { code: "unexpected_error", message: "Unexpected server error" } } };
  }

  const status =
    error.code === "invalid_request"
      ? 400
      : error.code === "not_configured"
        ? 503
        : error.code === "rate_limited"
          ? 429
          : error.code === "poll_timeout"
            ? 504
            : 502;
  const retryAfterSeconds = error.retryAfterMs === undefined ? undefined : Math.max(0, Math.ceil(error.retryAfterMs / 1000));
  return {
    status,
    body: {
      error: {
        code: error.code,
        message: error.message,
        ...(error.activityId ? { activityId: error.activityId } : {}),
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
        ...(error.issues?.length ? { issues: error.issues } : {}),
      },
    },
    ...(retryAfterSeconds !== undefined ? { headers: { "retry-after": String(retryAfterSeconds) } } : {}),
  };
}
