# Celsius Scout — FortyGuard hackathon summary

**Code:** [github.com/elgemmy/celsius-scout](https://github.com/elgemmy/celsius-scout)  
**Run:** `npm ci && npm run dev` → `http://localhost:3000` (no API keys required)  
**Video script:** [`docs/DEMO-SCRIPT.md`](DEMO-SCRIPT.md) (2–5 minutes; recording is a separate human step)  
**API usage:** [`docs/API-NOTES.md`](API-NOTES.md)

Celsius Scout is a thermal scouting board. It turns FortyGuard hyperlocal
temperature series into collectible location cards, cohort-relative ratings,
deterministic archetypes, and evidence-backed briefs.

## Problem

A city average is one number. It cannot say whether a block spiked and recovered,
held heat all afternoon, or stayed slightly cooler than its neighbors. FortyGuard
already measures near-ground air temperature at 60–100 m. The missing product is
not another heatmap: it is a way to *scout* those profiles, compare them inside
a named cohort, and prove every pick.

## Solution

The app is one loop, owned by code:

1. Load a comparison cohort (captured FortyGuard snapshot, or labeled synthetic
   Demo).
2. Calculate interval-aware features: peak, time-weighted mean, exceedance,
   persistence, recovery, variability, local deviation.
3. Rank those features as 0–100 percentiles inside the active cohort only.
4. Assign an archetype with explicit rules (Furnace, Oasis, Comeback Kid, and
   the rest).
5. Render the location on the Phoenix Combine map and as a FIFA-style player
   card (Heat Pressure, Peak, Stamina, Recovery, Comfort, Chaos, Surprise).
6. Run scouting tools — Thermal fraud, Different twins, Coolest five, Fastest
   recovery — and, optionally, let an LLM choose those tools in **Ask the Scout**.
   Displayed numbers must already exist in tool output; invented figures are
   rejected.

**The Average Is Lying** is the same engine in one panel: broad mean versus local
range versus share of tile-hours above the 38°C threshold. It is not a second
product.

The default board is **Historical Snapshot**. **Synthetic Demo** is a visible
fallback for contrasting archetypes when the captured field is nearly uniform.
There is no live-city import in the UI; a FortyGuard key does not swap Phoenix
for another place.

## FortyGuard data used

We used the public heatmap path, not forecasts or Premium segmentation.

| Item | What we actually did |
| --- | --- |
| Endpoints | `POST /v1/heatmap`, `GET /v1/status/{activity_id}` |
| Auth | Server-only `api-key` header; key never reaches the browser |
| Mode | Historical `tcm` (temperature) at **100 m** |
| Window | **18 August 2026**, 10:00–20:00 America/Phoenix (eleven hourly layers) |
| Area | Small Central Phoenix polygon; 42 returned tiles per hour |
| Cohort | Ten spatially distributed tiles joined only by stable `tile_id` |
| Provenance | Sanitized raw JSON plus SHA-256 request/result hashes in `data/fortyguard/` |

Capture is operator-only (`npm run capture:fortyguard` behind
`FORTYGUARD_CAPTURE_TOKEN`). The checked-in snapshot is the demo; recapture is
for replacing that pin, not for browsing live cities. See
[`docs/API-NOTES.md`](API-NOTES.md).

## Impact — what to notice

- **A memorable question.** “What kind of thermal player is this block?” is
  easier to demo than a generic heat dashboard, and it matches the FortyGuard
  resolution story.
- **Traceable picks.** Missions and Ask the Scout print the executed tool
  (`find_biggest_thermal_fraud()`, and so on) plus the facts the engine used.
- **Honest captured data.** The August 18 snapshot is nearly spatially uniform
  (~0.03°C across selected means; every sample above 38°C). The UI says so. That
  is a feature: we prove the real provider path without inventing microclimates.
- **Reliable offline demo.** No FortyGuard or OpenAI key is required. The LLM
  path is optional; the deterministic scout keeps the same briefs runnable.
- **Claim discipline.** Heat Pressure is 50% Peak + 50% Stamina inside this
  cohort. Comfort is unavailable on the temperature-only snapshot. We do not
  make medical, causal, or intervention-effect claims.

Formulas: [`docs/METRICS.md`](METRICS.md). Limits: [`docs/LIMITATIONS.md`](LIMITATIONS.md).

## Limits

- Historical snapshot, not current conditions or a forecast.
- Temperature-only TCM; no humidity, wind, or apparent temperature in Observed
  mode, so Comfort stays unavailable.
- Ten sampled tiles from 42, not the full grid; Surprise uses nearest sampled
  neighbors.
- The stylized city underlay is a stage, not a street-accurate basemap.
- Optional LLM explanations are numerically grounded, not semantically proven.

Celsius Scout’s bet is small and complete: one captured FortyGuard series,
one engine, one scouting desk, every number on a receipt.
