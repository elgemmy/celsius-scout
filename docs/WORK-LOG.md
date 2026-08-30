# Work log

This is a factual running log, not a polished narrative. Product and architecture decisions belong in `DECISION-LOG.md`.

## 2026-08-25

- Retrieved hackathon operational constraints and inspected the official FortyGuard API documentation bundle.
- Confirmed Heatmap and Status endpoint shapes, asynchronous activity IDs, 60/80/100 m granularity, and analytic modes for temperature, exceedance, persistence, and peak time.
- Initialized the empty GitHub repository with a short README.
- Built an initial local scaffold from an incomplete reconstruction of the idea.
- Paused immediately when the user challenged the direction; no prototype branches had been published.
- Received the authoritative Celsius Scout concept and discarded the heat-equity framing.
- Wrote `GOAL.md`, corrected the architecture and project context, and established the deterministic-calculation/LLM-reasoning contract.
- Started three isolated workstreams:
  - API, scientific-method, differentiation, and scope research.
  - Pure thermal feature, archetype, and scouting-tool engine.
  - Core Celsius Scout visual and interaction prototype.
- Completed the research scout. It verified U.S.-only coverage, 60/80/100 m heatmap granularity, native analytical modes, asynchronous behavior, Basic/Premium boundaries, and scientific language constraints.
- Adopted a fixed U.S. historical snapshot as the MVP data target and demoted Festival Tetris from submission scope until the flagship is green.

## Current convergence plan

1. Review the research report and adopt only defensible metrics.
2. Merge the tested engine into the submission candidate branch.
3. Integrate the strongest coherent UI elements rather than combining every experiment.
4. Add an optional LLM tool loop with a deterministic fallback.
5. Prove the core interaction end to end.
6. Branch two thin derived experiences from the verified core.
7. Compare, document, build, and browser-test every published branch.

## 2026-08-26

- Merged the tested thermal engine and independent visual direction.
- Removed all duplicated hardcoded UI metrics, archetypes, mission answers, and
  traces; the experience now reads one `analyzeCohort(demoCohort)` result.
- Added a deterministic Average Is Lying cohort summary and UI panel.
- Changed Furnace, Oasis, and coolest-lineup rules to remain useful with
  temperature-only heatmap input; Comfort is optional evidence.
- Added a hardened server-side FortyGuard provider with strict request
  validation, safe error normalization, bounded polling, temporary 404
  tolerance, rate-limit handling, and mocked-fetch tests.
- Removed the stale second provider implementation and filter-type-4 transport.
- Added a bounded optional LLM function-calling loop, deterministic fallback,
  UI ask box, and unsupported-number rejection.
- Reached a core checkpoint of 67 passing tests plus clean lint, strict
  TypeScript, and production build.
- Started an isolated Festival Tetris derived branch only after the core gate
  passed.
- Added tomorrow-morning onboarding, limitations, prerequisites, demo script,
  and handoff report.
- Passed production-server HTTP smoke checks for the home page, deterministic
  scout request, and safe unconfigured-provider response. Browser automation
  was attempted twice but the runtime has neither its expected CLI nor a browser
  binary; this remains a named pre-submission gate.

## 2026-08-30

- Verified the real provider submission and status envelopes and extended the
  adapter without exposing the API key.
- Captured eleven sequential hourly 100 m Phoenix heatmaps (10:00–20:00), each
  containing 42 stable returned polygons.
- Added resumable capture tooling, immutable sanitized raw snapshots, activity
  provenance, and SHA-256 request/result hashes.
- Added a strict response mapper that joins by `tile_id`, rejects footprint or
  schema drift, and produces a ten-location spatially distributed cohort.
- Made Observed mode the default, retained a visible synthetic Demo fallback,
  rendered returned footprints, and aligned the scout endpoint to the active
  cohort.
- Reached 73 passing tests with clean lint, strict TypeScript, and production
  build. HTTP smoke
  confirmed the observed page and grounded observed-cohort scout response.
- In-app browser verification was attempted, but no browser backend was
  registered in the workspace; final click/mobile/accessibility QA remains open.
- Added an in-site metric field guide covering Heat Pressure, all six card
  ratings, supporting raw evidence, percentile behavior, active provenance, and
  scientific claim boundaries.
