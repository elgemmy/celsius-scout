# Branch strategy

| Branch | Purpose | Promotion rule |
| --- | --- | --- |
| `main` | Stable project context and eventual selected build | Only verified convergence commits |
| `work/core-engine` | Deterministic feature, scoring, archetype, and scouting tools | Tests and formula review pass |
| `prototype/celsius-scout-visual` | Independent visual and interaction direction | Theme is immediate and components integrate cleanly |
| `prototype/celsius-scout-core` | Full end-to-end submission candidate | Core tests, lint, type-check, build, and browser flow pass |
| `prototype/average-is-lying` | Focused analytical story from the proven core | Reuses `summarizeAverageMasking`; adds no duplicate calculations |
| `prototype/festival-tetris` | Thin deterministic optimization story from the proven core | Reuses analyzed profiles; respects every hard constraint |

Experiments may remain unmerged. A branch existing is not evidence that its direction should ship.

The recommended promotion order is core → focused Average story → Festival
proof. Do not merge the Festival page into the submission branch unless it is
still green and materially improves the three-minute story.
