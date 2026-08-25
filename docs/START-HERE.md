# Start here tomorrow

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
git switch prototype/celsius-scout-core
npm install
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
- A polished responsive shell with synthetic labeling and an offline path.
- Automated test, lint, type-check, and production-build gates.

## What is deliberately not claimed

- The Phoenix fixture is not FortyGuard-observed data.
- Heat Pressure is not a health, safety, or universal quality score.
- Surprise is not statistical significance.
- The UI does not yet import arbitrary completed FortyGuard GeoJSON into a
  cohort. Exact returned property names must be captured and verified first.
- No caching layer, user accounts, arbitrary map drawing, forecasts, or Premium
  segmentation dependencies are part of the core.

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
| Agent | `server/scout-agent.ts` | Deterministic routing and optional LLM tool loop |
| Grounding | `server/grounding.ts` | Unsupported-number rejection |
| FortyGuard | `server/fortyguard-provider.ts` | Server-only API boundary and polling |
| Experience | `components/celsius-scout.tsx` | Main interactive scouting board |

## Highest-value next move

Use a real hackathon key once, submit a small 100 m U.S. heatmap request, save a
redacted completed response, and implement a tested provider-response mapper
into `ThermalCohort`. Audition Phoenix, Manhattan, and Chicago lakefront areas,
then lock one visually strong historical snapshot. Do not spend the first day
adding more UI surfaces.

After the snapshot is locked, record the final three-minute demo, deploy the
core branch, and only then decide whether Festival Tetris earns one short cameo.
