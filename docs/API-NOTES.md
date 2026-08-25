# FortyGuard API notes

Source reviewed: official FortyGuard API documentation on 25 August 2026.

## Useful endpoints

- `POST https://api.fortyguard.com/v1/heatmap`
- `GET https://api.fortyguard.com/v1/status/{activity_id}`
- `POST https://api.fortyguard.com/v1/heat_intelligence`
- `POST https://api.fortyguard.com/v1/env_params`

Authentication uses the `api-key` request header.

Heatmap requests accept a GeoJSON FeatureCollection polygon, a date/time filter, and granularity of 60, 80, or 100 metres. Analytic modes include temperature (`tcm`), peak time, threshold exceedance, and threshold persistence.

The API is asynchronous: submission returns an activity ID, then the status endpoint returns Processing, Completed, or Failed. Use bounded exponential polling such as 3s, 6s, then 12s; stop on terminal states and cache repeated polygon plus date/time requests.

## Prototype policy

- Default to the local deterministic fixture.
- Use 100 m granularity and a small polygon while iterating.
- Never log API keys or signed report URLs.
- Cache completed results by a canonical request hash before adding repeated live demos.
- Null environmental values mean unavailable, not zero.

## Implemented boundary

`server/fortyguard-provider.ts` now validates polygon closure, coordinate order
and ranges, date/filter combinations, granularity, analytical threshold rules,
activity identifiers, and safe provider responses. It keeps the API key on the
server, normalizes terminal statuses, tolerates the initial status race, honors
rate-limit delays, and stops after bounded polling attempts.

The provider deliberately returns a safe generic completed result. The next API
task is to capture a real response and write a tested mapper into the
provider-neutral `ThermalCohort`. No completed-response cache exists yet.
