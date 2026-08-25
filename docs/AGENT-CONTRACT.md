# Scout agent contract

The scout is an analytical planner and explainer around a deterministic engine. It is not a second calculation engine.

## Two runtime modes

**Deterministic scout** routes the four supported demo missions to known tools and renders templated explanations. This mode is always available.

**LLM scout** uses the OpenAI Responses API function-calling loop when server-only credentials and a model are configured. It may select tools adaptively and synthesize their structured output.

The UI must label the active mode. Falling back is a normal state, not a hidden error.

## Allowed work

- Interpret the user's scouting objective.
- Choose one or more registered analytical tools.
- Compare structured results and decide what deserves inspection.
- Describe patterns and trade-offs already present in tool output.
- Write a concise explanation tied to named evidence fields.

## Forbidden work

- Invent, estimate, interpolate, or silently recalculate displayed numbers.
- Claim causation from correlation or spatial coincidence.
- Make medical-risk or precise intervention-effect claims.
- Access external data or call FortyGuard directly.
- Cite a number that does not occur in a returned tool result.

## Loop limits

- Strict JSON schemas with `additionalProperties: false`.
- At most three model turns and four analytical tool calls per mission.
- No parallel calls in the first implementation; preserve an inspectable trace.
- `store: false` for the hackathon demo.
- Return the selected tool names, arguments, results, mode, and final explanation to the UI.
- On invalid arguments, unknown tools, timeout, or provider failure, stop and use the deterministic scout.

## Prompt invariant

The model receives the cohort identifier and methodology plus tool outputs. It is instructed that every numerical statement must be copied from those tool outputs and that qualitative inferences must be phrased as observations, not causes.

The implementation follows the current [OpenAI function-calling flow](https://developers.openai.com/api/docs/guides/function-calling): request with tools, execute returned calls in application code, append `function_call_output` items tied by `call_id`, then request the final response.
