# Limitations and claim boundary

## Current technical limits

- The default Phoenix cohort is synthetic and intended for deterministic product
  demonstration, not environmental reporting.
- FortyGuard submission and polling are implemented, but the completed provider
  GeoJSON is not yet mapped into `ThermalCohort`; the public documentation does
  not fully specify every returned tile property.
- No completed-response cache exists yet. Repeated live calls could spend credits.
- The map uses synthetic discrete footprints over a stylized underlay, not the
  exact returned FortyGuard polygons.
- The optional LLM route is covered with mocked responses; no configured model
  call is required for the offline demo.
- Numeric grounding checks occurrence, not semantic equivalence. Important
  values should still be rendered directly from structured output.
- Recovery uses a documented ordinary least-squares trend and clamps flat or
  warming post-peak slopes to zero. It is descriptive and not a forecast.
- Archetypes use explicit ordered rules, not learned clusters.

## Claims we allow

- Relative rank inside the named cohort and window.
- Descriptive peak, duration, persistence, recovery, variability, and local
  deviation values produced by the engine.
- Evidence-grounded comparisons such as “similar mean, different persistence.”
- Schedule exposure improvement calculated against the fixture and constraints.

## Claims we avoid

- Personal danger, medical risk, or safety certification.
- Universal ratings that remain comparable across cohorts.
- Statistical significance without a specified inferential method.
- Causal explanations about trees, materials, morphology, or interventions.
- Precise cooling benefit from an unmodeled intervention.
- Surface-temperature wording: the intended FortyGuard source is near-ground
  ambient air temperature.

## Production hardening after the hackathon

Add a versioned raw-response schema, immutable snapshot cache, provenance hash,
map rendering from actual polygons, robust recovery estimator, agent evaluation
set, accessibility review with a real browser, and monitoring for provider and
model latency/cost.
