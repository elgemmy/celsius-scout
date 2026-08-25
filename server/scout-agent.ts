import {
  analyzeCohort,
  compareLocations,
  demoCohort,
  findBiggestThermalFraud,
  findCoolestLineup,
  findFastestRecovery,
  findSimilarAverageDifferentBehaviorPair,
  findUnderratedCoolLocation,
  inspectLocation,
  type ScoutToolResult,
} from "../lib";
import { validateNumericGrounding, type GroundingResult } from "./grounding";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_MODEL_TURNS = 3;
const MAX_TOOL_CALLS = 4;
const analysis = analyzeCohort(demoCohort);

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ScoutTraceEntry {
  tool: string;
  arguments: Record<string, unknown>;
  result: ScoutToolResult<unknown>;
}

export interface ScoutAgentResult {
  mode: "deterministic" | "llm";
  question: string;
  explanation: string;
  trace: ScoutTraceEntry[];
  grounding: GroundingResult;
  fallbackReason?: string;
}

export interface ScoutAgentOptions {
  question: string;
  apiKey?: string;
  model?: string;
  fetch?: FetchLike;
}

interface FunctionCall {
  type: "function_call";
  name: string;
  call_id: string;
  arguments: string;
}

interface ResponsesPayload {
  output?: unknown[];
  output_text?: string;
}

const noArguments = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const locationIds = analysis.locations.map((location) => location.id);
const tools = [
  {
    type: "function",
    name: "find_coolest_lineup",
    description: "Build a ranked cool-location lineup from cohort-relative Peak, Stamina, and optional Comfort evidence.",
    strict: true,
    parameters: {
      type: "object",
      properties: { count: { type: "integer", minimum: 1, maximum: analysis.cohort.locationCount } },
      required: ["count"],
      additionalProperties: false,
    },
  },
  { type: "function", name: "find_biggest_thermal_fraud", description: "Find where a time-weighted mean hides the largest observed peak.", strict: true, parameters: noArguments },
  { type: "function", name: "find_underrated_cool_location", description: "Find the strongest supported cool-side local deviation from neighbors.", strict: true, parameters: noArguments },
  { type: "function", name: "find_fastest_recovery", description: "Find the fastest supported post-peak cooling trend.", strict: true, parameters: noArguments },
  {
    type: "function",
    name: "find_similar_average_different_behavior_pair",
    description: "Find a pair with similar time-weighted means but contrasting thermal profiles.",
    strict: true,
    parameters: {
      type: "object",
      properties: { maximumMeanDifferenceC: { type: "number", minimum: 0, maximum: 10 } },
      required: ["maximumMeanDifferenceC"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "compare_locations",
    description: "Compare two known locations and return signed metric differences.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        firstId: { type: "string", enum: locationIds },
        secondId: { type: "string", enum: locationIds },
      },
      required: ["firstId", "secondId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "inspect_location",
    description: "Inspect one location's normalized samples, features, scores, archetype, and evidence.",
    strict: true,
    parameters: {
      type: "object",
      properties: { locationId: { type: "string", enum: locationIds } },
      required: ["locationId"],
      additionalProperties: false,
    },
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} must be finite`);
  return value;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return value;
}

function executeTool(name: string, args: Record<string, unknown>): ScoutToolResult<unknown> {
  switch (name) {
    case "find_coolest_lineup":
      return findCoolestLineup(analysis, finiteNumber(args.count, "count"));
    case "find_biggest_thermal_fraud":
      return findBiggestThermalFraud(analysis);
    case "find_underrated_cool_location":
      return findUnderratedCoolLocation(analysis);
    case "find_fastest_recovery":
      return findFastestRecovery(analysis);
    case "find_similar_average_different_behavior_pair":
      return findSimilarAverageDifferentBehaviorPair(
        analysis,
        finiteNumber(args.maximumMeanDifferenceC, "maximumMeanDifferenceC"),
      );
    case "compare_locations":
      return compareLocations(
        analysis,
        stringValue(args.firstId, "firstId"),
        stringValue(args.secondId, "secondId"),
      );
    case "inspect_location":
      return inspectLocation(analysis, stringValue(args.locationId, "locationId"));
    default:
      throw new Error(`Unknown scout tool: ${name}`);
  }
}

function deterministicTool(question: string): ScoutTraceEntry {
  const normalized = question.toLowerCase();
  let tool = "find_biggest_thermal_fraud";
  let args: Record<string, unknown> = {};

  if (/lineup|coolest (?:five|5)|draft/.test(normalized)) {
    tool = "find_coolest_lineup";
    args = { count: 5 };
  } else if (/recover|cools? down fastest|post-peak/.test(normalized)) {
    tool = "find_fastest_recovery";
  } else if (/underrated|cool.*neighbor|local cool/.test(normalized)) {
    tool = "find_underrated_cool_location";
  } else if (/similar|same average|twins|behave.*different/.test(normalized)) {
    tool = "find_similar_average_different_behavior_pair";
    args = { maximumMeanDifferenceC: 1 };
  }

  return { tool, arguments: args, result: executeTool(tool, args) };
}

function deterministicExplanation(entry: ScoutTraceEntry): string {
  const evidence = entry.result.evidence.slice(0, 3).map((item) =>
    `${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ""}`,
  );
  return `${entry.result.answer} ${evidence.join("; ")}.`;
}

function deterministicResult(question: string, reason?: string): ScoutAgentResult {
  const entry = deterministicTool(question);
  const explanation = deterministicExplanation(entry);
  return {
    mode: "deterministic",
    question,
    explanation,
    trace: [entry],
    grounding: validateNumericGrounding(explanation, entry),
    ...(reason ? { fallbackReason: reason } : {}),
  };
}

function functionCalls(output: unknown[] | undefined): FunctionCall[] {
  return (output ?? []).filter((item): item is FunctionCall =>
    isRecord(item) &&
    item.type === "function_call" &&
    typeof item.name === "string" &&
    typeof item.call_id === "string" &&
    typeof item.arguments === "string",
  );
}

function outputText(payload: ResponsesPayload): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload.output ?? []) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text.trim();
      }
    }
  }
  return null;
}

async function requestModel(
  fetcher: FetchLike,
  apiKey: string,
  model: string,
  input: unknown[],
): Promise<ResponsesPayload> {
  const response = await fetcher(RESPONSES_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      parallel_tool_calls: false,
      instructions: [
        "You are Celsius Scout, an urban heat analyst with a playful scouting voice.",
        "Use at least one registered tool before answering.",
        "Calculations and rankings come only from tools. You may analyze, compare, and explain their outputs.",
        "Every number in the final answer must occur verbatim in returned tool evidence.",
        "Make descriptive observations, never causal, medical, safety, or statistical-significance claims.",
        `Active synthetic cohort: ${analysis.cohort.name}. Location ids: ${locationIds.join(", ")}.`,
      ].join(" "),
      input,
      tools,
    }),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload)) throw new Error(`Model request failed with status ${response.status}`);
  return payload as ResponsesPayload;
}

export async function runScoutAgent(options: ScoutAgentOptions): Promise<ScoutAgentResult> {
  const question = options.question.trim();
  if (!question || question.length > 500) throw new Error("Question must contain 1 to 500 characters");
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_MODEL;
  if (!apiKey || !model) return deterministicResult(question, "LLM credentials are not configured");

  const fetcher = options.fetch ?? fetch;
  const trace: ScoutTraceEntry[] = [];
  let input: unknown[] = [{ role: "user", content: question }];

  try {
    for (let turn = 0; turn < MAX_MODEL_TURNS; turn += 1) {
      const payload = await requestModel(fetcher, apiKey, model, input);
      const calls = functionCalls(payload.output);
      if (!calls.length) {
        const explanation = outputText(payload);
        if (!explanation || !trace.length) return deterministicResult(question, "The LLM did not complete a grounded tool call");
        const grounding = validateNumericGrounding(explanation, trace);
        if (!grounding.grounded) {
          return deterministicResult(question, `Rejected unsupported numerical claims: ${grounding.unsupportedNumbers.join(", ")}`);
        }
        return { mode: "llm", question, explanation, trace, grounding };
      }
      if (trace.length + calls.length > MAX_TOOL_CALLS) return deterministicResult(question, "The LLM exceeded the tool-call limit");

      const outputs = calls.map((call) => {
        const parsed: unknown = JSON.parse(call.arguments);
        if (!isRecord(parsed)) throw new Error("Tool arguments must be a JSON object");
        const result = executeTool(call.name, parsed);
        trace.push({ tool: call.name, arguments: parsed, result });
        return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) };
      });
      input = [...input, ...(payload.output ?? []), ...outputs];
    }
    return deterministicResult(question, "The LLM reached the model-turn limit");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error";
    return deterministicResult(question, `The LLM path failed safely: ${message}`);
  }
}
