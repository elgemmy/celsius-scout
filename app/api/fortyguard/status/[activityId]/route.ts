import { NextResponse } from "next/server";
import { createFortyGuardProvider, toSafeRouteError } from "@/server/fortyguard-provider";
import { authorizeFortyGuardCapture } from "@/server/fortyguard-capture-auth";

export async function GET(request: Request, context: { params: Promise<{ activityId: string }> }) {
  const authorization = authorizeFortyGuardCapture(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status, headers: { "cache-control": "no-store" } },
    );
  }
  try {
    const { activityId } = await context.params;
    const status = await createFortyGuardProvider().getActivityStatus(activityId);
    return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const safe = toSafeRouteError(error);
    return NextResponse.json(safe.body, {
      status: safe.status,
      headers: { "cache-control": "no-store", ...safe.headers },
    });
  }
}
