# Limitations and claim boundary

## Current technical limits

- Observed mode is a pinned August 18, 2026 Central Phoenix historical snapshot,
  not current conditions or a forecast. Demo mode remains synthetic.
- The versioned mapper supports the verified hourly heatmap response contract;
  unrecognized provider schema changes fail closed.
- The immutable snapshot capture is hashed and reused, but arbitrary live route
  requests have no general canonical-request cache and could spend credits.
- Observed tiles use returned FortyGuard polygons over a stylized underlay; the
  underlay is not a street-accurate basemap.
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

Add schema migration support, a general live-request cache, a geographic
basemap, robust recovery estimator, broader agent evaluation set, accessibility
review with a real browser, and monitoring for provider and model latency/cost.
