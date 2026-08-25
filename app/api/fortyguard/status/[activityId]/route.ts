import { NextResponse } from "next/server";
import { createFortyGuardProvider, toSafeRouteError } from "@/server/fortyguard-provider";

export async function GET(_request: Request, context: { params: Promise<{ activityId: string }> }) {
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
