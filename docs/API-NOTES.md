# FortyGuard API usage

Judge-facing record of what Celsius Scout actually calls. Source reviewed against
the official FortyGuard API docs (29 August 2026). Implementation:
`server/fortyguard-provider.ts`.

## Endpoints we used

| Method | URL | Role |
| --- | --- | --- |
| `POST` | `https://api.fortyguard.com/v1/heatmap` | Submit one historical TCM layer |
| `GET` | `https://api.fortyguard.com/v1/status/{activity_id}` | Poll that job to completion |

We did **not** call `heat_intelligence` or `env_params`. This submission is
temperature heatmaps only.

## Authentication (server-only)

FortyGuard authenticates with the **`api-key` request header**, not a
browser-exposed token.

- `FORTYGUARD_API_KEY` is read only on the server (`createFortyGuardProvider`).
- Never prefix it `NEXT_PUBLIC_`. It must not appear in client bundles.
- The browser never talks to `api.fortyguard.com`. Capture goes through Next.js
  routes; the scouting board reads the **checked-in snapshot**, not a live key.

Operator capture routes (`/api/fortyguard/heatmap`,
`/api/fortyguard/status/[activityId]`) require
`Authorization: Bearer $FORTYGUARD_CAPTURE_TOKEN`. If that token is unset, the
routes return 503 and are disabled even when the provider key is present.

## Async activity IDs

Heatmap submission is asynchronous:

1. `POST /v1/heatmap` returns a nested envelope; we read `data.activity_id`.
2. `GET /v1/status/{activity_id}` returns `data.status`: `Processing`,
   `Completed`, or `Failed`.
3. A completed heatmap exposes `data.result.map_data.features` with `tile_id`,
   `average_temperature`, `min_temperature`, `max_temperature`, and Polygon
   geometry.

The provider verifies the returned activity ID, tolerates an initial status
404 race, honors 429 retry delays, and stops after bounded exponential polling
(3s, 6s, 12s cap). Failed or timed-out jobs fail closed. We do not invent
timestamps from same-day min/max aggregates.

## Snapshot shipped with this repo

Pinned capture, not live conditions:

| Field | Value |
| --- | --- |
| Date | **18 August 2026** |
| Hours | 10:00–20:00 America/Phoenix (eleven separate hourly requests) |
| Analytic | `tcm` (temperature) |
| Granularity | **100 m** |
| Filter | `filterType: 1` (single hour per request) |
| Area | Small Central Phoenix polygon (~33.448–33.456 N, 112.08–112.07 W) |
| Tiles | 42 stable polygons per hour; **10** spatially distributed tiles on the board |

Raw sanitized responses live in
`data/fortyguard/raw/phoenix-2026-08-18/`. The manifest
(`data/fortyguard/phoenix-2026-08-18-manifest.json`) stores activity IDs plus
SHA-256 hashes of every request and completed result. The mapper
(`server/fortyguard-mapper.ts`) joins layers only by stable `tile_id` and
rejects tile-count or footprint drift.

The UI default is this snapshot (**Historical Snapshot**). **Synthetic Demo**
is a labeled fixture, not FortyGuard data. A live key does **not** import
another city into the board.

## Recapture

```bash
# In .env.local: FORTYGUARD_API_KEY, FORTYGUARD_CAPTURE_TOKEN
npm run dev
# separate shell, same token:
npm run capture:fortyguard
```

`scripts/capture-fortyguard-snapshot.mjs` posts each missing hour to
`/api/fortyguard/heatmap`, polls `/api/fortyguard/status/:id`, and reuses
completed files whose request hash still matches. It writes sanitized JSON
only (no API key). Replacing the pin requires updating the capture config and
`docs/DECISION-LOG.md`.

## Keys never in the browser

| Secret | Where it lives | Browser? |
| --- | --- | --- |
| `FORTYGUARD_API_KEY` | Server provider only | No |
| `FORTYGUARD_CAPTURE_TOKEN` | Capture-route gate | No |
| `OPENAI_API_KEY` | Scout agent only | No |

Credential-like fields and provider URLs are stripped from stored results.
See `.env.example`.
