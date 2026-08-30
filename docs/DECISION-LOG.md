# Decision log

## 2026-08-25 — Correct the product identity before branching

**Decision:** Discard the initial heat-equity framing. Celsius Scout is a thermal player-scouting product. The Average Is Lying and Festival Tetris are demonstrations powered by the same engine.

**Why:** The initial reconstruction did not contain the actual proposal and introduced an unrelated scoring model. Keeping it would damage thematic coherence.

## 2026-08-25 — One core before secondary breadth

**Decision:** Complete and verify the Celsius Scout loop before expanding either secondary experience.

**Why:** Five days remain. A memorable, reliable core scores better and teaches us more than three fragile surfaces.

## 2026-08-25 — Deterministic calculations, optional LLM reasoning

**Decision:** Pure functions calculate numbers and return structured evidence. An LLM may choose tools, analyze their outputs, and write explanations constrained to that evidence.

**Why:** This preserves reproducibility without reducing the agent to decorative chat.

## 2026-08-25 — Demo-first data architecture

**Decision:** Every branch opens with a deterministic synthetic fixture, while a shared server-side adapter supports live FortyGuard calls.

**Why:** It keeps the demo reliable without credentials or credit use and preserves a credible path to real data.

## 2026-08-25 — Secure API boundary

**Decision:** Keep external API keys in Next.js route handlers; never expose them through public environment variables.

**Why:** Browser-exposed keys would leak credits and make the demo unsafe to publish.

## 2026-08-25 — Lock the provider-independent core to documented access

**Decision:** Depend only on heatmaps and status polling. Use a validated U.S. historical snapshot at 100 m while developing, and treat environmental or segmentation data as optional enrichment.

**Why:** Current coverage is U.S.-only, exposed granularity is 60/80/100 m, and the public hackathon material does not guarantee Premium access.

## 2026-08-25 — Keep card semantics scientifically honest

**Decision:** Show raw values plus cohort percentiles; call the optional overall number Heat Pressure; calculate Comfort only from actual apparent-temperature data; describe Surprise as local deviation.

**Why:** These labels avoid inventing comfort, universal safety scores, statistical significance, or causal meaning that the data does not establish.

## 2026-08-25 — Festival Tetris cannot delay the flagship

**Decision:** Keep a runnable Festival Tetris branch as a derived proof only after the core candidate passes its gates. Do not put it on the submission path by default.

**Why:** Impact and technical execution comprise 75% of judging. The flagship's reliability is the highest-value use of the remaining five days.
## 2026-08-25 — converge on one reliable Celsius Scout engine

- Treat the deterministic cohort analysis as the single source for the map,
  cards, scouting tools, Average Is Lying summary, and any LLM evidence packet.
- Keep LLM use: it may select tools, compare structured results, and write an
  explanation. Displayed numerical claims must already exist in tool evidence.
- Make the signature archetypes and coolest-lineup query work from temperature
  heatmaps alone. Comfort can strengthen a result but cannot be a core gate.
- Define Heat Pressure as exactly 50% Peak percentile plus 50% Stamina
  percentile. It is not a health, safety, or universal quality score.
- Use interval-linear integration for time-weighted mean, exceedance, degree
  hours, and longest persistence. Keep total exceedance and longest persistence
  separate.
- Use an ordinary least-squares post-peak recovery trend for this prototype and
  label it descriptive, not predictive. A robust estimator is a documented
  post-hackathon improvement.
- Use the IQR of successive temperature-rate changes for Chaos and a signed
  same-hour neighbor-median difference for local deviation. Call the latter a
  deviation, not statistical significance.
- Ship a labeled synthetic Phoenix snapshot as the offline reliability path;
  the FortyGuard adapter replaces the provider-neutral input when credentials
  are available.
- Embed a compact Average Is Lying panel in the core because it is a direct
  cohort summary. Keep Festival Tetris isolated as a derived branch until the
  main scouting loop passes tests, lint, build, and browser verification.

## Reliability rules

- Comfort is unavailable without supplied apparent temperature or complete
  humidity-and-wind inputs.
- Recovery is unavailable without the peak plus two later observations.
- Local deviation needs at least two matching neighbors.
- Ranking ties always break by stable location id after shared percentile ranks.

## 2026-08-30 — Use a verified hourly FortyGuard snapshot as the default

**Decision:** Default the product to eleven captured 100 m `tcm` layers over a
small Central Phoenix area, joined only by stable provider `tile_id`. Keep the
synthetic fixture behind a visible Demo switch and as the no-network fallback.

**Why:** A same-day range response contains aggregate minimum, maximum, and mean
values but no timestamps for those extrema. Treating those aggregates as a
series would invent temporal order. Time-specific responses preserve the core
series-to-features loop and make Recovery, persistence, peak time, and Chaos
traceable to observed ordered samples.

**Implementation boundary:** Store sanitized raw responses separately, hash each
request and result, validate the observed response schema, fail on tile or
footprint drift, render returned polygons, and select ten spatially distributed
tiles deterministically. Do not infer humidity, wind, apparent temperature, or
named landmarks from temperature heatmaps.

## 2026-08-30 — Put the metric contract inside the experience

**Decision:** Make the header’s “How ratings work” link open a complete in-page
field guide for every card rating and supporting statistic. The guide reflects
the active cohort threshold, name, provenance, and Comfort availability.

**Why:** Cohort percentiles and playful labels are easy to misread as universal
or safety scores. Keeping definitions, formulas, unavailable-state behavior, and
claim boundaries beside the interaction makes the scouting metaphor legible
without separating users from the board.

## 2026-08-29 — Fail closed at real-data boundaries

- Parse FortyGuard's documented `{ data: ... }` response envelope for both
  submission and status calls, and reject a returned activity ID that does not
  match the requested activity.
- Support the documented 2019+ date range and filter type 4 instead of coding
  only against simplified test responses.
- Require all locations in a scored cohort to share an observation window.
- Make local deviation unavailable when any timestamp lacks two matching
  neighbors; do not turn partial spatial coverage into a complete Surprise
  score.
 - Let the scout agent normalize and analyze a supplied raw cohort; the
   synthetic fixture is a fallback input, not a hidden calculation singleton.

**Why:** Live provider responses and incomplete spatial series must fail visibly
or remain unavailable. Silent fallback to demo-shaped assumptions would make a
 working interface look more reliable than its evidence.

## 2026-08-30 — OpenAI-compatible Responses endpoint, not Chat Completions

**Decision:** Keep the scout LLM client on the OpenAI Responses API
(`POST {base}/responses` with function tools). Make the base URL configurable
via `OPENAI_BASE_URL` so OpenAI (`https://api.openai.com/v1`), DeepSeek
(`https://api.deepseek.com`), and xAI (`https://api.x.ai/v1`) can share the
same loop. Accept an SDK-style base, a trailing slash, or a full `/responses`
URL. Empty values fall back to OpenAI.

**Why:** The existing tool-call, numeric-grounding, and fallback contract is
Responses-shaped. Judges can plug any compatible key, model, and URL without a
client rewrite. Chat Completions-only hosts are out of scope.
