import { NextResponse } from "next/server";
import { createFortyGuardProvider, toSafeRouteError } from "@/server/fortyguard-provider";
import { authorizeFortyGuardCapture } from "@/server/fortyguard-capture-auth";

export async function POST(request: Request) {
  const authorization = authorizeFortyGuardCapture(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status, headers: { "cache-control": "no-store" } },
    );
  }
  try {
    const body: unknown = await request.json();
    const submission = await createFortyGuardProvider().submitHeatmap(body);
    return NextResponse.json(submission, {
      status: 202,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const safe = toSafeRouteError(error);
    return NextResponse.json(safe.body, {
      status: safe.status,
      headers: { "cache-control": "no-store", ...safe.headers },
    });
  }
}
