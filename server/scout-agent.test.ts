import { describe, expect, it, vi } from "vitest";
import { demoCohort } from "../lib";
import { runScoutAgent } from "./scout-agent";

describe("Celsius Scout agent", () => {
  it.each([
    ["Build the coolest five-location lineup.", "find_coolest_lineup"],
    ["Draft me five cool picks.", "find_coolest_lineup"],
    ["Find the biggest thermal fraud.", "find_biggest_thermal_fraud"],
    ["Where does the average hide the peak?", "find_biggest_thermal_fraud"],
    ["Which location cools down fastest?", "find_fastest_recovery"],
    ["Show me the strongest post-peak recovery.", "find_fastest_recovery"],
    ["Find an underrated cool location.", "find_underrated_cool_location"],
    ["Which local cool spot differs from its neighbors?", "find_underrated_cool_location"],
    ["Find the same average with different behavior.", "find_similar_average_different_behavior_pair"],
    ["Which two locations are thermal twins?", "find_similar_average_different_behavior_pair"],
  ])("routes and grounds the scripted brief: %s", async (question, expectedTool) => {
    const result = await runScoutAgent({ question, apiKey: "", model: "" });

    expect(result.trace[0].tool).toBe(expectedTool);
    expect(result.grounding.grounded).toBe(true);
  });

  it("runs a deterministic scouting tool when model credentials are absent", async () => {
    const result = await runScoutAgent({
      question: "Find the area that cools down fastest after peak heat.",
      apiKey: "",
      model: "",
    });

    expect(result.mode).toBe("deterministic");
    expect(result.trace[0].tool).toBe("find_fastest_recovery");
    expect(result.grounding.grounded).toBe(true);
  });

  it("runs tools against the supplied cohort rather than a hidden demo singleton", async () => {
    const customCohort = {
      ...demoCohort,
      id: "custom-cohort",
      name: "Custom real-data candidate",
      source: { label: "Imported candidate snapshot", kind: "fortyguard" as const },
    };

    const result = await runScoutAgent({
      question: "Find the biggest thermal fraud.",
      cohort: customCohort,
      apiKey: "",
      model: "",
    });

    expect(result.trace[0].result.context).toMatchObject({
      cohortId: "custom-cohort",
      cohortName: "Custom real-data candidate",
      sourceLabel: "Imported candidate snapshot",
      isSynthetic: false,
    });
  });

  it("fails visibly to a grounded inspection when a requested metric is unavailable", async () => {
    const shortCohort = {
      ...demoCohort,
      id: "short-window",
      locations: demoCohort.locations.map((location) => ({
        ...location,
        samples: [location.samples[0], location.samples.at(-1)!],
      })),
    };

    const result = await runScoutAgent({
      question: "Which location cools down fastest?",
      cohort: shortCohort,
      apiKey: "",
      model: "",
    });

    expect(result.trace[0].tool).toBe("metric_unavailable");
    expect(result.explanation).toContain("unavailable for this cohort");
    expect(result.fallbackReason).toContain("No location has enough post-peak observations");
    expect(result.grounding.grounded).toBe(true);
  });

  it("executes model-selected tools and accepts a grounded explanation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{
          type: "function_call",
          name: "find_fastest_recovery",
          call_id: "call_1",
          arguments: "{}",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output_text: "Comeback Park has the fastest supported post-peak cooling trend.",
        output: [],
      }), { status: 200 }));

    const result = await runScoutAgent({
      question: "Who recovers fastest?",
      apiKey: "test-key",
      model: "test-model",
      fetch: fetcher,
    });

    expect(result.mode).toBe("llm");
    expect(result.trace.map((entry) => entry.tool)).toEqual(["find_fastest_recovery"]);
    expect(result.grounding.grounded).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects unsupported model numbers and falls back safely", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{
          type: "function_call",
          name: "find_fastest_recovery",
          call_id: "call_1",
          arguments: "{}",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output_text: "It remains hot for 777 hours.",
        output: [],
      }), { status: 200 }));

    const result = await runScoutAgent({
      question: "Who recovers fastest?",
      apiKey: "test-key",
      model: "test-model",
      fetch: fetcher,
    });

    expect(result.mode).toBe("deterministic");
    expect(result.fallbackReason).toContain("777");
    expect(result.grounding.grounded).toBe(true);
  });

  it("accepts rounded model numbers that match evidence at the claimed precision", async () => {
    const cohort = {
      ...demoCohort,
      id: "rounded-evidence",
      locations: demoCohort.locations.map((location) =>
        location.id === "comeback-park"
          ? {
              ...location,
              samples: location.samples.map((sample, index) =>
                index === 4 ? { ...sample, temperatureC: 41.901 } : sample,
              ),
            }
          : location,
      ),
    };

    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{
          type: "function_call",
          name: "find_biggest_thermal_fraud",
          call_id: "call_1",
          arguments: "{}",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output_text: "Comeback Park peaks at 41.9°C around 15:00.",
        output: [],
      }), { status: 200 }));

    const result = await runScoutAgent({
      question: "Find the biggest thermal fraud.",
      cohort,
      apiKey: "test-key",
      model: "test-model",
      fetch: fetcher,
    });

    expect(result.mode).toBe("llm");
    expect(result.grounding.grounded).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
  });

  it.each([
    [undefined, "https://api.openai.com/v1/responses"],
    ["", "https://api.openai.com/v1/responses"],
    ["https://api.openai.com/v1", "https://api.openai.com/v1/responses"],
    ["https://api.openai.com/v1/", "https://api.openai.com/v1/responses"],
    ["https://api.openai.com/v1/responses", "https://api.openai.com/v1/responses"],
    ["https://api.deepseek.com", "https://api.deepseek.com/responses"],
    ["https://api.x.ai/v1", "https://api.x.ai/v1/responses"],
  ])("posts to the OpenAI-compatible Responses URL for base %s", async (baseUrl, expected) => {
    const previous = process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [] }), { status: 200 }));

    try {
      await runScoutAgent({
        question: "Who recovers fastest?",
        apiKey: "test-key",
        model: "provider-model",
        ...(baseUrl === undefined ? {} : { baseUrl }),
        fetch: fetcher,
      });
    } finally {
      if (previous === undefined) delete process.env.OPENAI_BASE_URL;
      else process.env.OPENAI_BASE_URL = previous;
    }

    expect(fetcher).toHaveBeenCalled();
    expect(String(fetcher.mock.calls[0][0])).toBe(expected);
  });
});
