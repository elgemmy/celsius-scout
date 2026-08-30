# Celsius Scout handoff report

Judge-facing written summary: [`docs/SUBMISSION.md`](SUBMISSION.md).
This file is internal status, not the hackathon write-up.

## Outcome

The corrected Celsius Scout concept is now the repository's single product
identity. The stable core is runnable offline, visually coherent, backed by one
deterministic analysis engine, and defaults to a captured FortyGuard historical
snapshot with a visible synthetic fallback.

The strongest submission direction is `prototype/celsius-scout-core`.

## What changed after the reset

- Removed the unrelated heat-equity framing.
- Built a provider-neutral thermal domain model and synthetic Phoenix fixture.
- Implemented and tested interval-aware features, percentiles, archetypes, and
  scouting selections.
- Replaced every hardcoded card/mission claim in the visual prototype with the
  actual engine output.
- Made Furnace, Oasis, and coolest-lineup logic work on heatmap temperature data
  without optional environmental inputs.
- Added The Average Is Lying as a direct summary of the analyzed cohort.
- Added a server-only FortyGuard request/status/polling boundary.
- Added an optional LLM tool-selection/explanation loop with strict schemas,
  bounded calls, deterministic fallback, and unsupported-number rejection.
- Kept Festival Tetris isolated as a derived optimization branch.

## Reliability evidence

### August 30 live-data integration

- Verified live nested submission/status envelopes against the configured API.
- Captured eleven hourly 100 m layers containing 42 stable polygons each.
- Added a strict mapper, immutable sanitized raw snapshot, and SHA-256
  request/result provenance.
- Defaulted the UI and grounded scout endpoint to a deterministic ten-tile
  observed cohort selected for spatial coverage.
- Preserved the labeled synthetic Demo mode without external keys or network.
- Expanded the suite to 73 passing tests with clean lint, strict TypeScript, and
  a production build.

The remaining unproven gate is interactive browser/mobile/accessibility QA. The
in-app workflow was attempted again, but this workspace exposed no browser
backend.

At the core checkpoint:

- 67 automated tests pass, including ten scripted deterministic agent briefs.
- ESLint passes.
- strict TypeScript passes.
- the Next.js production build passes.
- the app remains functional with no provider or model credentials.
- synthetic input and comparison-relative scores are visible in the interface.
- a live production-server smoke check passes for the home page, deterministic
  scout API, and safe missing-FortyGuard-configuration response.

Automated screenshot/click verification remains unproven in this workspace: the
browser workflow is installed without its CLI or browser binary. Production
build, HTTP smoke, and code-backed UI review passed; run the final visual and
mobile check in a browser before submission.

See `docs/METRICS.md` for formulas and `docs/LIMITATIONS.md` for what these gates
do not prove.

## Direction comparison

| Direction | Strength | Risk | Recommendation |
| --- | --- | --- | --- |
| Celsius Scout core | Memorable identity, analytical depth, visible agent work, reliable offline demo | Needs one real snapshot to prove provider mapping | Submit this |
| The Average Is Lying | Clear FortyGuard value proof with minimal extra scope | Too thin as a standalone identity | Keep inside core; focused branch for storytelling |
| Festival Tetris | Shows decision impact and deterministic optimization | Can distract from scouting identity and consume demo time | Keep as optional branch/cameo only |

## Runnable branch status

| Branch | Route | Verification | Role |
| --- | --- | --- | --- |
| `prototype/celsius-scout-core` | `/` | 67 tests, lint, TypeScript, production build, HTTP smoke | Recommended submission base |
| `prototype/average-is-lying` | `/average` | 69 tests, lint, TypeScript, production build, HTTP smoke | Focused analytical story |
| `prototype/festival-tetris` | `/festival` | 73 tests, lint, TypeScript, production build, HTTP smoke | Optional decision/optimization proof |

All three branches are published to the configured GitHub repository. The
repository remains private; visibility and collaborator access were not changed.
That access change belongs in the explicit final-submission checklist.

## Highest-value remaining work

1. Perform a real browser/mobile/accessibility pass on Observed and Demo modes.
2. Deploy the core and record
   the three-minute demo.
3. Run the scripted agent evaluation prompts with the actual configured model.
4. Audition another area only if the captured Phoenix variation is visually
   illegible; otherwise avoid additional provider spend.
5. Make the repository public and add the required hackathon collaborator only
   when ready for submission.

## Suggested five-day allocation

| Day | Goal |
| --- | --- |
| 1 | Real API capture, mapper, city audition, freeze snapshot |
| 2 | Integrate actual polygons/provenance and run claim review |
| 3 | Deploy, browser/accessibility pass, configured-agent evaluation |
| 4 | Record/edit demo and finish submission copy |
| 5 | Buffer, rehearse, make repository public, final submission checks |

Do not spend the buffer on accounts, Premium segmentation, forecasts, causal
claims, or a wide generic chat interface.
