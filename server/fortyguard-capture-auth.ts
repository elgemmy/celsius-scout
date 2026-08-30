import { timingSafeEqual } from "node:crypto";

export type CaptureAuthorization =
  | { authorized: true }
  | { authorized: false; status: 401 | 503; message: string };

/** Protects operator-only routes that can spend provider credits or expose results. */
export function authorizeFortyGuardCapture(
  request: Request,
  configuredToken = process.env.FORTYGUARD_CAPTURE_TOKEN,
): CaptureAuthorization {
  if (!configuredToken) {
    return {
      authorized: false,
      status: 503,
      message: "FortyGuard capture routes are disabled",
    };
  }

  const authorization = request.headers.get("authorization");
  const suppliedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(configuredToken);
  const supplied = Buffer.from(suppliedToken);
  const matches = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  return matches
    ? { authorized: true }
    : { authorized: false, status: 401, message: "Capture authorization required" };
}
