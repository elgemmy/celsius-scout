# Start here

## The 30-second reset

Celsius Scout is not a generic heat dashboard. It is a scouting board for the
thermal character of locations. A location becomes a card because its hourly
profile has traceable traits: Peak, Stamina, Recovery, Comfort when supported,
Chaos, Surprise, and peak time. Ratings are percentiles inside the active cohort.

The product loop is:

1. inspect one comparison cohort;
2. run a scouting brief;
3. see the selected map tiles;
4. inspect a collectible thermal card;
5. open the structured evidence and executed tool;
6. use the same engine to reveal what the broad average hides.

The optional LLM is useful, not decorative: it chooses deterministic tools and
explains returned evidence. When it is absent or fails, deterministic routing
keeps the exact same interaction runnable.

## First 20 minutes

```bash
npm ci
npm run check
npm run dev
```

Then open `http://localhost:3000` and run these in order:

1. **Thermal fraud** — establishes why a mean can mislead.
2. **Different twins** — proves similar averages can hide different behavior.
3. **Coolest five** — demonstrates selection, not just visualization.
4. Ask **“Find an underrated cool location.”** — demonstrates the agent path.
5. Scroll to **The Average Is Lying** — closes the hyperlocal value story.

## What is proven now

- Provider-neutral cohort normalization and validation.
- Interval-aware mean, exceedance, persistence, and degree-hour calculations.
- Recovery, Comfort gating, robust Chaos, local deviation, and peak timing.
- Cohort-relative percentile scores with stable tie behavior.
- Temperature-only Furnace/Oasis archetypes plus optional Comfort evidence.
- Four preset scout missions and a free-form agent endpoint.
- Ten scripted deterministic briefs route to the expected tools and stay
  numerically grounded.
- Numeric-grounding rejection for LLM explanations.
- Strict FortyGuard request validation, safe server-side key use, normalized
  async status, bounded polling, temporary 404 tolerance, and 429 handling.
- Eleven captured FortyGuard hourly layers with stable 100 m tile IDs, exact
  returned polygon footprints, request/result hashes, and a strict mapper.
- A polished responsive shell that defaults to observed data and visibly
  switches to the labeled synthetic offline fallback.
- Automated test, lint, type-check, and production-build gates.

## What is deliberately not claimed

- The Demo-mode Phoenix fixture is not FortyGuard-observed data.
- The Observed mode is one pinned historical snapshot, not live conditions or a
  forecast.
- Heat Pressure is not a health, safety, or universal quality score.
- Surprise is not statistical significance.
- The mapper accepts the captured hourly heatmap schema; it is not an arbitrary
  GeoJSON importer.
- No general live-request cache, user accounts, arbitrary map drawing,
  forecasts, or Premium segmentation dependencies are part of the core.

## File tour

| Area | Start here | Responsibility |
| --- | --- | --- |
| Domain | `lib/analysis.ts` | Cohort orchestration and neighborhood comparison |
| Metrics | `lib/metrics.ts` | Deterministic raw features |
| Scores | `lib/scoring.ts` | Cohort percentile ranks |
| Archetypes | `lib/archetypes.ts` | Ordered, inspectable classification rules |
| Scout tools | `lib/scouting.ts` | Evidence-rich rankings, comparisons, inspection |
| Average story | `lib/average-insight.ts` | Broad mean versus full local distribution |
| Demo data | `lib/demo-data.ts` | Labeled synthetic Phoenix fixture |
| Observed snapshot | `data/fortyguard/` | Immutable raw responses and hash manifest |
| Mapper | `server/fortyguard-mapper.ts` | Strict hourly response-to-cohort boundary |
| Agent | `server/scout-agent.ts` | Deterministic routing and optional LLM tool loop |
| Grounding | `server/grounding.ts` | Unsupported-number rejection |
| FortyGuard | `server/fortyguard-provider.ts` | Server-only API boundary and polling |
| Experience | `components/celsius-scout.tsx` | Main interactive scouting board |

## Highest-value next move

Run the critical desktop/mobile/accessibility flow in a real browser, deploy the
core, and record the final three-minute demo. Only audition another area if the
captured Phoenix variation proves illegible in that visual pass; do not spend
credits or time adding more UI surfaces by default.
