# Prerequisites and useful topics

You do not need mastery of all of these. The short brief under each topic is the
minimum mental model needed to work safely in this repository.

## TypeScript and Next.js App Router

The UI is a Next.js App Router application. Components under `app/` define
routes; server route handlers keep credentials off the browser. The analytical
engine under `lib/` is plain TypeScript and deliberately independent of React.

## Time-series integration

Samples may be unevenly spaced. Celsius Scout assumes linear change between
observations and integrates intervals, rather than averaging rows. This matters
for time-weighted mean, threshold duration, persistence, and degree-hours.

## Cohort-relative percentiles

A card score answers “how does this location rank in this selected area and
window?” It is not a globally comparable rating. Changing the cohort, window,
threshold, or granularity changes the meaning of a percentile.

## GeoJSON and coordinate order

FortyGuard heatmap requests use polygon FeatureCollections. GeoJSON positions
are longitude first, latitude second, and polygon rings must close. The current
provider validates these rules before spending API credits.

## Asynchronous APIs

Heatmap submission returns an activity identifier. The client polls status with
bounded backoff until Completed or Failed. Temporary not-found and rate-limit
responses are expected states, not reasons for an infinite loop.

## Environmental comfort proxies

Air temperature alone is not Comfort. The engine uses provider-supplied apparent
temperature or complete humidity-and-wind inputs for the documented BOM shade
formula. Missing input remains unavailable.

## Spatial comparison

Surprise is the signed difference from same-time neighbor medians. It is a local
descriptive deviation. It does not establish statistical significance or the
cause of the difference.

## LLM function calling

The model receives strict tool schemas, requests a tool, the application runs
deterministic code, and the tool result returns to the model for explanation.
The loop is bounded. The server rejects final numerical claims not found in the
evidence bundle and falls back to a deterministic explanation.

## Constraint optimization

Festival Tetris treats schedule rules as hard constraints and heat exposure as
an objective. A valid result must preserve fixed activities, capacities, and
conflicts before it can claim an improvement. Fewer changes are a secondary
objective, not an excuse to violate constraints.

## Scientific claim boundaries

Modeled thermal patterns support descriptive comparisons. They do not by
themselves support medical advice, causal claims about urban design, statistical
significance, or precise intervention effects. Keep input, calculation, and
commentary visibly separate.
