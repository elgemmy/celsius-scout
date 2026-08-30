# Celsius Scout research report

Research completed on 25 August 2026 against the current official FortyGuard API documentation bundle, hackathon material, product pages, and primary statistical references.

## Recommendation

Build one excellent fixed-area experience: Celsius Scout converts hourly tiles from one validated U.S. area into traceable thermal cards, then an agent scouts, compares, and builds lineups using deterministic tools.

Place **The Average Is Lying** inside that experience as a focused insight. Keep **Festival Tetris** as a derived branch and roadmap proof until the core is deployed, tested, and polished.

## Verified FortyGuard facts

### Endpoints and access

| Endpoint | Documented access | Useful output |
| --- | --- | --- |
| `POST /v1/heatmap` | Basic, Startup, Premium | GeoJSON tile layer plus aggregate statistics |
| `POST /v1/env_params` | Basic/Startup: up to 3 parameters; Premium: all | Time-aligned environmental arrays |
| `POST /v1/satellite` | Premium | Image, class coverage, legend, segmentation mask |
| `POST /v1/streetview` | Premium | Images, class coverage, legend, segmentation mask |
| `POST /v1/heat_intelligence` | Premium | Temporary signed PDF download link |
| `GET /v1/status/{activity_id}` | All tiers | Processing or endpoint-specific result |

The hackathon trial amount and tier are not public. The core must not depend on Premium endpoints.

### Heatmap capabilities

The heatmap endpoint accepts a GeoJSON polygon, date/time filter, granularity, and optional analytical mode:

- `tcm`: temperature in °C per tile
- `time_of_measure`: UTC hour at which the tile peaks
- `exceedance`: total hours past a threshold
- `persistence`: longest continuous run past a threshold
- `direction`: above or below
- `threshold`: defaults to 30°C

Completed statistics include minimum, maximum, mean, standard deviation, a sorted distribution, normal-curve plot data, and histogram frequencies. Individual GeoJSON property names are not completely documented, so the live adapter must be built and tested against captured responses.

### Geography, time, and resolution

- Current coverage is United States only.
- Exposed granularity is 60, 80, or 100 metres.
- The product must not repeat the marketing-level ~20 m claim for an output requested at a coarser tile size.
- The source is ambient air temperature approximately two metres above ground, not land-surface temperature.
- Data is hourly.
- Same-day ranges can span at most 23 hours.
- Forecasts extend up to 12 hours.
- The current endpoint documentation accepts dates from 2019 onward. Keep a
  real-key boundary test in the final integration pass in case provider policy
  differs from the published contract.
- Avoid multi-day filter type 4 in the MVP because the endpoint page and limitations page disagree.

### Async and failure behavior

All analytical submissions return an `activity_id` and require status polling.

- Continue on `Processing`.
- Stop on `Completed` or `Failed`.
- Tolerate a temporary `404` immediately after submission.
- Treat `429` as rate limiting.
- Normalize status casing.
- Use bounded backoff with jitter and retain the activity ID in errors.

Credits are documented as deducted only after successful completion. Exact per-operation costs and request-rate limits are not documented.

### Cache policy for this project

- Hash the normalized endpoint and payload.
- Cache completed historical responses as immutable snapshots.
- Store raw provider responses separately from derived results.
- Cache real-time/forecast results briefly and record retrieval time.
- Never log or cache signed report download URLs.
- Ship one validated offline snapshot so the demo never depends on live credits.

Official sources:

- [FortyGuard API documentation](https://docs-api.fortyguard.com/)
- [API limitations](https://docs-api.fortyguard.com/docs/limitations)
- [FortyGuard Hackathon 2026](https://www.fortyguard.com/hackathon26)
- [FortyGuard products](https://www.fortyguard.com/products)
- [FortyGuard technology](https://www.fortyguard.com/our-technology)

## Defensible metric model

Every card must identify the cohort, area, local date/time window, granularity, threshold, sample count, data mode, and analysis version.

| Trait | MVP definition | Reliability rule |
| --- | --- | --- |
| Peak | Maximum sampled temperature | Do not call one shared snapshot each tile's daily peak |
| Peak time | Earliest time attaining Peak, converted to local time | Document tie handling |
| Exceedance | Total time at or above the visible threshold | Descriptive threshold, not universal danger level |
| Stamina | Longest continuous threshold run | Keep distinct from total Exceedance |
| Recovery | Negative post-peak slope in °C/hour; prototype uses documented OLS | Unavailable with insufficient post-peak coverage |
| Comfort | Inverted cohort percentile of real apparent temperature | Unavailable when apparent temperature is missing |
| Chaos | Temporal interquartile range | Explain as variability, not randomness |
| Surprise | Signed median deviation from matching-hour neighbor medians | Record neighborhood rule and require enough neighbors |

Use empirical percentile ranks within the exact active cohort. Always show raw units beside the percentile. Percentiles become incomparable when the area, date, time window, threshold, or granularity changes.

If the card needs an overall number, call it **Heat Pressure** and calculate it transparently as 50% Peak percentile plus 50% Stamina percentile. It describes relative thermal pressure, not safety or quality.

For robust local deviation, median and median absolute deviation are preferable to mean and standard deviation. When neighborhood MAD is effectively zero, retain the raw signed difference and percentile instead of dividing by an arbitrary epsilon. See the [NIST robust spread reference](https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm).

Use deterministic archetype rules for the MVP:

- **The Furnace:** high Peak and high Stamina
- **The Oasis:** low Peak and low Stamina, with Comfort only when available
- **The Marathoner:** extreme Stamina
- **The Comeback Kid:** high Peak and strong Recovery
- **The Night Owl:** an unusually late peak
- **The Chaos Merchant:** high robust Chaos
- **Balanced:** no affinity clears the threshold

Run ordered, tested thresholds and attach the triggering evidence. The exact
adopted rules live in `docs/METRICS.md`. Do not describe them as learned clusters.

Use “local deviation” or “Surprise,” not “statistically significant anomaly.” Formal Local Moran analysis is post-MVP because it requires defensible neighborhood, permutation, and multiple-testing choices. See [Anselin's LISA paper](https://onlinelibrary.wiley.com/doi/10.1111/j.1538-4632.1995.tb00338.x) and [PySAL's local statistics guide](https://pysal.org/esda/stable/user-guide/local.html).

## Grounded LLM role

The LLM can translate a scouting objective into tool choices, select locations for follow-up, recognize qualitative combinations, compare structured results, form labeled hypotheses, and explain evidence.

The LLM cannot change snapshot values, generate rankings privately, or cite a number absent from its evidence bundle. Provider data, derived metrics, and commentary remain visibly distinct. The UI renders important numbers directly from structured output.

Evaluate at least ten scripted missions for factual consistency and unsupported-number leakage. When the LLM is missing or fails, deterministic routing and explanation templates preserve the experience.

## Five-day scope

### Must ship

- One validated U.S. area and historical day.
- Hourly raw snapshot with reproducible provenance.
- Peak, Peak Time, Exceedance, Stamina, Recovery, Chaos, Surprise, and cohort percentiles.
- Deterministic archetypes.
- Linked polygon map, card, sparkline, comparison, and evidence drawer.
- Four reliable scout missions: thermal fraud, coolest lineup, underrated cool location, and similar averages/different behavior.
- Visible tool trace.
- The Average Is Lying insight inside the core.
- Offline snapshot plus optional live refresh.
- Formula, schema, provenance, and limitations documentation.

### Cut until the core is green

- Festival Tetris in the submission path
- Premium segmentation/report dependencies
- forecasts and arbitrary user-drawn areas
- multiple final-demo cities
- authentication and persistence
- health-risk or intervention-effect scores
- causal explanations about vegetation or built form
- learned clustering
- MCP server
- generic open-ended chat

## City audition

Before locking the live snapshot, test three small 100 m areas:

- Manhattan park/urban contrast
- downtown Phoenix plus a major park
- Chicago lakefront versus inland blocks

Compare valid-tile percentage, P90–P10 Peak spread, Persistence IQR, peak-time variation, and meaningful local deviations. Select the strongest verified dataset, then consider 60 m only if credit and latency behavior are acceptable.

## Differentiation

FortyGuard already offers maps, reports, routing, heat-zone identification, and planning intelligence. Celsius Scout should answer a different question:

> What kind of thermal player is this location, how does it behave across the day, what makes it unusual, and which locations fit my scouting objective?

The differentiators are temporal profiles, cohort-relative cards, explicit archetypes, agent-led discovery, lineup composition, and The Average Is Lying as a compact proof of the hyperlocal value proposition.

Render the actual returned polygons. Avoid blurred interpolation that implies precision between cells.

## Scientific language to preserve

- FortyGuard values may be modeled estimates; use provider metadata where available.
- Thresholds and percentiles are descriptive and cohort-dependent.
- Apparent temperature is a proxy with assumptions, not a personal safety assessment.
- Missing environmental values may be `null` or legacy `-999`; neither means zero.
- Spatially adjacent cells are not independent observations.
- Segmentation correlation does not establish causation.
- Recovery may be unavailable when the observation window ends too soon.
- Peak-time outputs require UTC-to-local conversion.
- The cards do not infer personal health risk or prescribe interventions.

## Judging and demo implications

Official weighting is 40% Impact and Relevance, 35% Technical Execution, 15% Innovation, and 10% Communication. The final deadline is 30 August 2026 at 23:59 GST, or 21:59 in Brussels. Conflicting video guidance exists, so target a maximum of three minutes.

Recommended story:

1. “The city average says 33°C, but locations with the same average do not behave the same.”
2. Ask for the biggest thermal fraud.
3. Show its deterministic tool calls and selected evidence.
4. Compare two cards with similar averages but different Stamina and Recovery.
5. Reveal The Average Is Lying distribution.
6. Build the coolest lineup.
7. End with one engine that discovers, explains, and converts thermal behavior into a selection decision.
