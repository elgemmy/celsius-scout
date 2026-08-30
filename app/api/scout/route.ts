import { NextResponse } from "next/server";
import { runScoutAgent } from "@/server/scout-agent";
import { cohortById } from "@/server/cohort-registry";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const question = typeof body === "object" && body !== null && "question" in body
      ? (body as { question?: unknown }).question
      : undefined;
    if (typeof question !== "string") {
      return NextResponse.json({ error: "question must be a string" }, { status: 400 });
    }
    const cohortId = typeof body === "object" && body !== null && "cohortId" in body
      ? (body as { cohortId?: unknown }).cohortId
      : undefined;
    const result = await runScoutAgent({ question, cohort: cohortById(cohortId) });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid scout request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
