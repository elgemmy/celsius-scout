import { describe, expect, it, vi } from "vitest";
import {
  createFortyGuardProvider,
  FortyGuardProviderError,
  toSafeRouteError,
  validateHeatmapRequest,
} from "./fortyguard-provider";

const activityId = "activity_123456";

const polygon = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { label: "test area" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-112.08, 33.44],
            [-112.07, 33.44],
            [-112.07, 33.45],
            [-112.08, 33.44],
          ],
        ],
      },
    },
  ],
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    polygonAoi: polygon,
    dateTime: { filterType: 2, startDate: "2026-07-15", startTime: "10:00", endTime: "18:00" },
    granularity: 100,
    analyticType: "persistence",
    threshold: 36,
    direction: "above",
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function providerWith(fetcher: ReturnType<typeof vi.fn>) {
  return createFortyGuardProvider({
    apiKey: "server-secret-key",
    baseUrl: "https://provider.example",
    fetch: fetcher as unknown as typeof fetch,
  });
}

async function expectProviderError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error("Expected provider call to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(FortyGuardProviderError);
    expect((error as FortyGuardProviderError).code).toBe(code);
    return error as FortyGuardProviderError;
  }
}

describe("heatmap request validation", () => {
  it("accepts documented filter types 1-3 and normalizes the default analytic mode", () => {
    expect(
      validateHeatmapRequest(
        request({
          dateTime: { filterType: 1, startDate: "2021-01-01", startTime: "09:30" },
          analyticType: undefined,
          threshold: undefined,
          direction: undefined,
          granularity: 60,
        }),
      ).analyticType,
    ).toBe("tcm");
    expect(
      validateHeatmapRequest(
        request({ dateTime: { filterType: 3, startDate: "2026-07-15" }, granularity: 80 }),
      ).dateTime.filterType,
    ).toBe(3);
  });

  it.each([
    ["a geometry rather than a polygon FeatureCollection", { polygonAoi: { type: "Polygon", coordinates: [] } }],
    [
      "an open polygon ring",
      {
        polygonAoi: {
          ...polygon,
          features: [
            {
              ...polygon.features[0],
              geometry: {
                type: "Polygon",
                coordinates: [[[-112.08, 33.44], [-112.07, 33.44], [-112.07, 33.45], [-112.08, 33.45]]],
              },
            },
          ],
        },
      },
    ],
    ["filter type 4", { dateTime: { filterType: 4, startDate: "2026-07-15" } }],
    ["a pre-2021 date", { dateTime: { filterType: 3, startDate: "2020-12-31" } }],
    ["an impossible calendar date", { dateTime: { filterType: 3, startDate: "2026-02-30" } }],
    ["a missing end time for filter type 2", { dateTime: { filterType: 2, startDate: "2026-07-15", startTime: "10:00" } }],
    [
      "a backwards same-day range",
      { dateTime: { filterType: 2, startDate: "2026-07-15", startTime: "18:00", endTime: "10:00" } },
    ],
    ["an extra time for filter type 3", { dateTime: { filterType: 3, startDate: "2026-07-15", startTime: "10:00" } }],
    ["an undocumented granularity", { granularity: 50 }],
    ["an unknown analytic mode", { analyticType: "average" }],
    ["a direction on tcm", { analyticType: "tcm", threshold: undefined, direction: "above" }],
    ["a threshold on peak-time analytics", { analyticType: "time_of_measure", threshold: 36, direction: undefined }],
    ["an unknown threshold direction", { direction: "around" }],
    ["a non-finite threshold", { threshold: Number.NaN }],
  ])("rejects %s before a provider call", async (_label, overrides) => {
    const fetcher = vi.fn();
    const provider = providerWith(fetcher);
    await expectProviderError(provider.submitHeatmap(request(overrides)), "invalid_request");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("FortyGuard submission", () => {
  it("submits the provider payload with api-key and returns only the activity ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ activity_id: activityId, message: "accepted", signed_url: "https://secret.example/?token=x" }, { status: 202 }),
    );
    const provider = providerWith(fetcher);

    await expect(provider.submitHeatmap(request())).resolves.toEqual({ activityId });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://provider.example/v1/heatmap");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json", "api-key": "server-secret-key" },
      cache: "no-store",
    });
    expect(JSON.parse(init.body)).toEqual({
      polygon_aoi: {
        ...polygon,
        features: [{ ...polygon.features[0], properties: null }],
      },
      date_time: {
        filter_type: 2,
        start_date: "2026-07-15",
        start_time: "10:00",
        end_time: "18:00",
      },
      granularity: 100,
      analytic_type: "persistence",
      threshold: 36,
      direction: "above",
    });
  });

  it("accepts the live provider's nested submission envelope", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        error: false,
        status_code: 200,
        message: "Heatmap Submitted Successfully",
        data: { activity_id: activityId },
      }),
    );

    await expect(providerWith(fetcher).submitHeatmap(request())).resolves.toEqual({ activityId });
  });

  it("rejects a malformed activity ID returned by the provider", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ activity_id: "../../secret" }, { status: 202 }));
    await expectProviderError(providerWith(fetcher).submitHeatmap(request()), "invalid_provider_response");
  });
});

describe("status normalization and bounded polling", () => {
  it("normalizes status casing and redacts links and credential-like result fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "cOmPlEtEd",
        data: {
          map_data: { type: "FeatureCollection", features: [] },
          report_url: "https://files.example/report?X-Amz-Signature=secret",
          api_key: "provider-secret",
          source: "https://provider.example/source",
        },
      }),
    );

    await expect(providerWith(fetcher).getActivityStatus(activityId)).resolves.toEqual({
      activityId,
      status: "Completed",
      result: {
        map_data: { type: "FeatureCollection", features: [] },
        report_url: "[redacted-link]",
        source: "[redacted-link]",
      },
    });
  });

  it("normalizes the live provider's nested status envelope", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        error: false,
        status_code: 200,
        message: "Processing",
        data: { activity_id: activityId, status: "Processing" },
      }))
      .mockResolvedValueOnce(jsonResponse({
        error: false,
        status_code: 200,
        message: "Completed",
        data: { activity_id: activityId, status: "Completed", result: { tiles: 7 } },
      }));

    const provider = providerWith(fetcher);
    await expect(provider.getActivityStatus(activityId)).resolves.toEqual({
      activityId,
      status: "Processing",
    });
    await expect(provider.getActivityStatus(activityId)).resolves.toEqual({
      activityId,
      status: "Completed",
      result: { tiles: 7 },
    });
  });

  it("tolerates an initial 404 and then completes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "not indexed yet" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ status: "Completed", result: { tiles: 12 } }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(providerWith(fetcher).waitForActivity(activityId, { sleep })).resolves.toEqual({
      activityId,
      status: "Completed",
      result: { tiles: 12 },
    });
    expect(sleep).toHaveBeenCalledWith(3_000);
  });

  it("polls Processing with 3s then 6s backoff before completion", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: "processing" }))
      .mockResolvedValueOnce(jsonResponse({ status: "PROCESSING" }))
      .mockResolvedValueOnce(jsonResponse({ status: "completed", data: { tiles: 20 } }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await providerWith(fetcher).waitForActivity(activityId, { sleep });
    expect(sleep.mock.calls).toEqual([[3_000], [6_000]]);
  });

  it("stops on Failed and preserves the activity ID in the error", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ status: "Failed", error: "provider details" }));
    const error = await expectProviderError(providerWith(fetcher).waitForActivity(activityId), "activity_failed");
    expect(error.activityId).toBe(activityId);
    expect(error.message).not.toContain("provider details");
  });

  it("honors Retry-After on 429 but caps it at the bounded maximum", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "slow down" }, { status: 429, headers: { "retry-after": "30" } }))
      .mockResolvedValueOnce(jsonResponse({ status: "Completed", result: { ok: true } }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await providerWith(fetcher).waitForActivity(activityId, { sleep });
    expect(sleep).toHaveBeenCalledWith(12_000);
  });

  it("times out after the bounded attempt count with 3s, 6s, 12s-style backoff", async () => {
    const fetcher = vi.fn().mockImplementation(async () => jsonResponse({ status: "Processing" }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const error = await expectProviderError(
      providerWith(fetcher).waitForActivity(activityId, { maxAttempts: 4, sleep }),
      "poll_timeout",
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[3_000], [6_000], [12_000]]);
    expect(error.activityId).toBe(activityId);
  });

  it.each(["x", "../../secret", "contains spaces", "a".repeat(129)])(
    "rejects invalid activity ID %s without calling fetch",
    async (invalidActivityId) => {
      const fetcher = vi.fn();
      await expectProviderError(providerWith(fetcher).getActivityStatus(invalidActivityId), "invalid_request");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});

describe("safe route errors", () => {
  it("keeps useful activity and rate-limit context without leaking provider bodies or keys", () => {
    const error = new FortyGuardProviderError("FortyGuard rate limit reached", {
      code: "rate_limited",
      activityId,
      httpStatus: 429,
      retryAfterMs: 5_100,
    });

    expect(toSafeRouteError(error)).toEqual({
      status: 429,
      body: {
        error: {
          code: "rate_limited",
          message: "FortyGuard rate limit reached",
          activityId,
          retryAfterSeconds: 6,
        },
      },
      headers: { "retry-after": "6" },
    });
    expect(JSON.stringify(toSafeRouteError(error))).not.toContain("server-secret-key");
  });
});
