# Architecture

```text
synthetic fixture ─────────┐
                          ├→ ThermalCohort → features → cohort scores → archetypes
FortyGuard hourly snapshot┘                                      │
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
| Mapper | `server/fortyguard-mapper.ts` | Captured schema validation, stable tile joins, centroids/footprints | Scoring or UI labels |
| Domain | `lib/` | Normalized series, metrics, percentiles, archetypes, scout tools | Provider response shapes, React state |
| Agent | `server/scout-agent.ts` | Tool selection, bounded loop, explanation | Private calculations or direct FortyGuard calls |
| Grounding | `server/grounding.ts` | Reject numerical claims absent from evidence | Recompute or infer values |
| Experience | `components/` | Interaction, presentation, visible provenance | Duplicate analytical constants |

## Data modes

The application starts from the immutable Central Phoenix FortyGuard snapshot:
eleven time-specific 100 m heatmaps joined by stable `tile_id`. It selects ten
spatially distributed returned polygons for the focused scouting cohort. The
Observed/Demo control switches to the synthetic Phoenix fixture without network
access. Both modes use the same domain engine and carry explicit provenance.

The raw sanitized provider results live separately from derived cohort data.
The capture manifest records activity IDs plus SHA-256 request/result hashes.
The capture script skips completed files, but the public live request routes do
not yet provide a general cache.

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
