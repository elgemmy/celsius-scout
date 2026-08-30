import { describe, expect, it } from "vitest";
import { authorizeFortyGuardCapture } from "./fortyguard-capture-auth";

function request(token?: string) {
  return new Request("https://example.test/api/fortyguard/heatmap", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("FortyGuard capture route authorization", () => {
  it("fails closed when the operator token is not configured", () => {
    expect(authorizeFortyGuardCapture(request(), "")).toMatchObject({
      authorized: false,
      status: 503,
    });
  });

  it("rejects a missing or incorrect bearer token", () => {
    expect(authorizeFortyGuardCapture(request(), "capture-secret")).toMatchObject({ authorized: false, status: 401 });
    expect(authorizeFortyGuardCapture(request("wrong"), "capture-secret")).toMatchObject({ authorized: false, status: 401 });
  });

  it("accepts the configured bearer token", () => {
    expect(authorizeFortyGuardCapture(request("capture-secret"), "capture-secret")).toEqual({ authorized: true });
  });
});
