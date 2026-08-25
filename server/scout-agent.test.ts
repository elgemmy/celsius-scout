import { describe, expect, it, vi } from "vitest";
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
});
