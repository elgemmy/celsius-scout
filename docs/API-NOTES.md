# FortyGuard API notes

Source reviewed: official FortyGuard API documentation on 29 August 2026.

## Useful endpoints

- `POST https://api.fortyguard.com/v1/heatmap`
- `GET https://api.fortyguard.com/v1/status/{activity_id}`
- `POST https://api.fortyguard.com/v1/heat_intelligence`
- `POST https://api.fortyguard.com/v1/env_params`

Authentication uses the `api-key` request header.

Heatmap requests accept a GeoJSON FeatureCollection polygon, a date/time filter, and granularity of 60, 80, or 100 metres. Supported dates begin in 2019. Filter types cover a single hour, same-day hour range, single day, or a date range of at most 31 days. Analytic modes include temperature (`tcm`), peak time, threshold exceedance, and threshold persistence.

The API is asynchronous: submission returns an activity ID, then the status endpoint returns Processing, Completed, or Failed. Both submission and status payloads use a documented top-level envelope whose endpoint-specific values live under `data`. Use bounded exponential polling such as 3s, 6s, then 12s; stop on terminal states and cache repeated polygon plus date/time requests.

## Prototype policy

- Default to the checked-in, hash-verified historical snapshot; retain the
  clearly labeled deterministic synthetic fixture as a fallback.
- Use 100 m granularity and a small polygon while iterating.
- Never log API keys or signed report URLs.
- Keep capture and status routes operator-only with
  `FORTYGUARD_CAPTURE_TOKEN`; leaving it unset disables them.
- Cache completed results by a canonical request hash before adding repeated live demos.
- Null environmental values mean unavailable, not zero.

## Implemented boundary

`server/fortyguard-provider.ts` now validates polygon closure, coordinate order
and ranges, date/filter combinations, granularity, analytical threshold rules,
activity identifiers, documented response envelopes, and safe provider
responses. It keeps the API key on the server, verifies returned activity IDs,
normalizes terminal statuses, tolerates the initial status race, honors
rate-limit delays, and stops after bounded polling attempts.

The provider deliberately returns a safe generic completed result. The next API
boundary is now verified against the live envelopes: submissions carry
`data.activity_id`, while statuses carry `data.status`. Completed heatmaps expose
`data.result.map_data.features` with `tile_id`, `average_temperature`,
`min_temperature`, `max_temperature`, and Polygon geometry.

`server/fortyguard-mapper.ts` joins time-specific responses by stable `tile_id`
and fails closed on tile-count, footprint, or schema drift. The pinned snapshot
contains eleven hourly layers, with raw responses stored separately from the
derived cohort and SHA-256 request/result hashes in its manifest. General live
route requests still do not have a canonical-request cache.
