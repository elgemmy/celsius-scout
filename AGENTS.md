# Celsius Scout working agreement

Read `GOAL.md` before making product or architecture decisions.

- Celsius Scout is a playful thermal scouting product, not a generic heat dashboard or heat-equity planner.
- Preserve the single core loop: series → features → cohort scores → archetype → scouting tools → grounded explanation.
- Code owns all calculations. LLMs may plan, investigate, analyze structured outputs, and explain evidence.
- Every numerical claim in an LLM response must be present in tool output supplied to it.
- Keep deterministic demo mode runnable without external keys or network access.
- Keep `FORTYGUARD_API_KEY` and `OPENAI_API_KEY` server-side.
- Label synthetic fixtures and proxy metrics directly in the interface.
- Avoid medical, causal, and precise intervention-effect claims.
- Prefer one complete interaction over several inactive controls.
- Run tests, lint, build, and the critical browser flow before handoff.
- Record material scope, formula, architecture, or product decisions in `docs/DECISION-LOG.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
