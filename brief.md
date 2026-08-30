# Celsius Scout implementation brief

## Outcome

Celsius Scout now defaults to a real, immutable FortyGuard historical snapshot
while preserving the labeled synthetic Phoenix cohort as a visible Demo-mode
fallback. Both modes run through the same deterministic series → features →
cohort scores → archetypes → scouting tools → grounded explanation loop.

## FortyGuard integration

- Verified the live provider's nested submission and status envelopes.
- Captured eleven hourly `tcm` heatmaps from 10:00–20:00 on August 18, 2026.
- Each response contains 42 stable 100 m Central Phoenix polygons.
- Stored sanitized raw responses separately under `data/fortyguard/raw/`.
- Added a manifest with SHA-256 hashes for every request and completed result.
- Added resumable `npm run capture:fortyguard` tooling that reuses matching
  completed files and submits only missing layers.
- Implemented a strict mapper that validates the observed response schema,
  joins only by stable `tile_id`, rejects tile/footprint drift, derives polygon
  centroids, and selects ten spatially distributed tiles deterministically.

## Product integration

- Observed mode is the default board; Demo mode remains available without keys
  or network access.
- The map renders returned FortyGuard polygon footprints over the stylized
  underlay.
- Cards, missions, Average Is Lying, and the scout API analyze the active cohort.
- The scout request includes the active cohort ID, keeping tool evidence and the
  visible board aligned.
- Provenance, 100 m resolution, historical window, and data mode are labeled in
  the interface.
- The existing “How ratings work” link now opens an in-page field guide covering
  Heat Pressure, all card ratings, supporting statistics, percentile behavior,
  unavailable values, provenance, and scientific claim boundaries.

## Security and reliability

- `FORTYGUARD_API_KEY` remains only in ignored `.env.local` and is never sent to
  the browser.
- Browser requests go through server-only Next.js route handlers.
- Provider URLs and credential-like fields are sanitized from captured results.
- Credential scans passed for source files and production build output.
- Provider activity IDs are absent from client static assets.
- The synthetic deterministic path remains runnable offline.

## Verification

- ESLint passes.
- Strict TypeScript passes.
- 73 tests across 10 files pass.
- The Next.js production build passes.
- Production HTTP smoke checks pass for the observed page, both scout cohorts,
  numerical grounding, and safe invalid-provider handling.
- Rendered-page checks confirm the metric guide and observed provenance.

## Remaining work

Interactive desktop/mobile/accessibility browser QA remains open because the
workspace exposed no registered browser backend. Deployment, configured-model
evaluation, demo recording, and final repository visibility/collaborator steps
also remain submission tasks.
