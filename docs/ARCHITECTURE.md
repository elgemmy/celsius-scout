# Architecture

```text
synthetic fixture ─┐
                   ├→ ThermalCohort → features → cohort scores → archetypes
FortyGuard adapter ┘                                      │
                                                         ├→ scouting tools
                                                         ├→ Average Is Lying
                                                         └→ Festival exposure

scouting tools → deterministic explanation
              └→ optional LLM tool loop → numeric grounding gate

structured results → map + thermal cards + evidence report
```

## Runtime boundaries

| Layer | Code | Owns | Must not own |
| --- | --- | --- | --- |
| Provider | `server/fortyguard-provider.ts` | Auth, request validation, safe polling/status | Thermal feature formulas |
| Domain | `lib/` | Normalized series, metrics, percentiles, archetypes, scout tools | Provider response shapes, React state |
| Agent | `server/scout-agent.ts` | Tool selection, bounded loop, explanation | Private calculations or direct FortyGuard calls |
| Grounding | `server/grounding.ts` | Reject numerical claims absent from evidence | Recompute or infer values |
| Experience | `components/` | Interaction, presentation, visible provenance | Duplicate analytical constants |

## Data modes

The application always starts from the synthetic Phoenix fixture. A live path
submits and polls FortyGuard safely, but importing a completed provider response
requires a versioned mapper after the exact response properties are captured.
That missing boundary is explicit; the UI never silently relabels fixture data
as observed data.

## Agent modes

- **Deterministic:** phrase-based routing calls one known tool and returns a
  templated evidence explanation. Always available.
- **LLM:** the Responses API receives strict tools, the application executes
  calls, and the model explains returned results. Three model turns and four
  tool calls are the hard limits. Unsupported numbers force deterministic
  fallback.

## Branch strategy

- `prototype/celsius-scout-core`: the submission candidate.
- `prototype/average-is-lying`: a focused analytical story from the same summary.
- `prototype/festival-tetris`: a derived constrained-optimization proof.

Secondary branches consume the core domain model. They do not fork formulas.
