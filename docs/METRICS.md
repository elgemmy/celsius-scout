# Celsius Scout metrics contract

This document is the calculation boundary for the demo. The UI and any LLM may
interpret these outputs, but neither should recalculate or invent them.

## Input contract

`ThermalCohort` contains a comparison cohort, a Celsius threshold, and at least
two `ThermalLocation` series. Every `ThermalSample` has an ISO-8601 timestamp
with an explicit UTC offset and a temperature. Samples may also contain:

- provider-supplied apparent temperature, or
- relative humidity and wind speed for a derived apparent temperature.

Provider adapters map external responses into this model before analysis. Core
calculations do not depend on FortyGuard response shapes or geographic coverage.
The normalizer validates ranges and IANA timezone metadata, sorts samples,
rejects duplicate instants, requires a shared observation window for fair
cohort scores, and does not mutate its input.

The bundled Phoenix cohort is synthetic and deliberately shaped for the demo.
It is not observed FortyGuard data. It has ten fictional locations and eleven
hourly observations per location, including all six specialist archetypes and a
fallback profile.

## Raw features

### Observed duration

Elapsed time between the first and last normalized timestamps in hours.

### Peak and peak time

The maximum observed temperature and its timestamp. If multiple observations
tie, the earliest is selected. `peakOffsetHours` is elapsed time from the start
of that location's series, making peak timing comparable inside a shared window.

### Time-weighted mean

Temperature is assumed to change linearly between observations. The mean is the
trapezoidal integral divided by elapsed time. This prevents dense sampling from
receiving more weight than sparse sampling.

### Total exceedance

`totalExceedanceHours` is total interpolated time strictly above the selected
threshold. A crossing interval contributes only the fraction above threshold.
The instant exactly on the threshold has zero duration, so `>` versus `>=` does
not change the integral.

### Longest persistence

`longestPersistenceHours` is the longest uninterrupted interpolated run above
the threshold. It is separate from total exceedance: two short hot spells can
have the same total as one continuous spell but should not receive identical
Stamina interpretations.

### Excess degree-hours

`degreeHoursAboveThresholdC` integrates `max(temperature - threshold, 0)` over
time using linearly interpolated intervals. It preserves both magnitude and
duration, and is exposed for deeper analysis even though it is not a card score.

### Recovery

Post-peak observations are fit with ordinary least squares against elapsed time.
The negative slope is reported as a positive cooling rate in °C/hour; a warming
or flat slope becomes zero. The peak and at least two later samples are required.
Otherwise Recovery and its cohort score are `null`, not zero.

This is a descriptive trend over the observed window, not a forecast.

### Comfort

`meanApparentTemperatureC` is a time-weighted apparent-temperature mean. It is
available only when every sample has either:

1. a provider-supplied apparent temperature, or
2. humidity and wind speed for the Australian Bureau of Meteorology shade
   apparent-temperature formula:

```text
AT = Ta + 0.33e - 0.70ws - 4.00
e  = RH/100 × 6.105 × exp(17.27Ta / (237.7 + Ta))
```

Temperature alone is not relabeled as comfort. Incomplete inputs produce
`null` and method `unavailable`. This is an environmental comfort proxy, not a
medical risk measure.

### Chaos

For each interval, calculate the temperature-change rate in °C/hour. Then take
successive differences between those rates. `temporalVariabilityIqrCPerHour` is
the interquartile range of those rate changes. IQR is robust to isolated
extremes; using rate changes distinguishes irregular swings from a smooth daily
rise and fall.

### Local deviation (Surprise source)

For every timestamp, subtract the median temperature of the location's
same-timestamp neighbors. The raw feature is the median of those signed
differences across the window:

- positive: locally hotter than neighbors
- negative: locally cooler than neighbors
- zero: aligned with neighbors

At least two matching neighbors at every location timestamp are required.
Partial timestamp coverage is not silently scored: otherwise the feature and
Surprise score are `null`. Explicit `neighborIds` are preferred. If absent, the
engine deterministically chooses the three nearest cohort locations by local
coordinate distance, breaking ties by location id.

This is called a local deviation, not a statistically significant anomaly.

### Peak-to-mean gap

`peakToMeanGapC = peakTemperatureC - meanTemperatureC`. It powers the playful
“thermal fraud” question by showing where an average masks a sharp peak. “Fraud”
does not imply intent or data error.

## Cohort card scores

Raw values become 0–100 average-rank percentiles inside the active cohort. The
minimum maps to 0, maximum to 100, ties share their average rank, and an all-tied
cohort receives 50. Unavailable values do not participate and stay `null`.

| Score | High means |
| --- | --- |
| Peak | Higher observed maximum |
| Stamina | Longer single persistence run above threshold |
| Recovery | Faster supported post-peak cooling |
| Comfort | Lower apparent-temperature mean |
| Chaos | More irregular changes in temperature-change rate |
| Surprise | Larger absolute local deviation; inspect the signed raw value for direction |
| Late Peak | Peak occurs later in the shared window |

Scores are only comparable within the active cohort and window. They are not
universal ratings.

`Heat Pressure = 0.50 × Peak + 0.50 × Stamina`, rounded to an integer. It is a
compact thermal-intensity summary, not overall quality, health risk, or safety.

## Archetype rules

Rules run in this explicit order. A specialist activates only when its stated
cohort evidence is present; otherwise the next rule is considered.

| Archetype | Deterministic rule |
| --- | --- |
| The Chaos Merchant | Chaos ≥ 85 |
| The Night Owl | Late Peak ≥ 95 |
| The Comeback Kid | Recovery ≥ 85, Peak ≥ 65, and Stamina < 80 |
| The Furnace | Peak ≥ 75 and Stamina ≥ 65 |
| The Marathoner | Stamina ≥ 85 |
| The Oasis | Peak ≤ 35 and Stamina ≤ 35; Comfort is optional support |
| The Balanced Operator | fallback |

Every result contains its triggering metrics and a plain-language reason.

## Scouting tools

- `findCoolestLineup`: when the complete cohort has Comfort, ranks 45% Comfort
  + 30% inverse Peak + 25% inverse Stamina. With temperature-only data, ranks
  55% inverse Peak + 45% inverse Stamina, so the core remains runnable from
  heatmap data alone.
- `findBiggestThermalFraud`: largest peak-to-mean gap, then Heat Pressure.
- `findUnderratedCoolLocation`: most negative valid local deviation, then
  Comfort.
- `findFastestRecovery`: highest available raw recovery rate.
- `findSimilarAverageDifferentBehaviorPair`: among pairs within a configurable
  mean-temperature gap, maximizes average percentile distance across Peak,
  Stamina, Recovery, Chaos, and Late Peak. If none qualify, it explicitly marks
  a closest-mean fallback.
- `compareLocations`: returns both complete profiles and signed metric
  differences.
- `inspectLocation`: returns normalized samples, raw features, scores,
  archetype evidence, cohort context, and methodology in one payload.

Selections use stable location-id tie breaks. Tool outputs intentionally contain
the complete numbers and methods an LLM needs to analyze or explain the result
without performing hidden calculations.

## Claims boundary

Allowed claims are descriptive and tied to the selected cohort and observation
window. Avoid causal urban-design claims, health-risk predictions, claims of
statistical significance, or precise intervention effects. An LLM may form
analytical interpretations and explain trade-offs, but every numerical claim
must already exist in the supplied structured tool result.
