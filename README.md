# Celsius Scout

**Scout the thermal character of a city—then prove every pick.**

Celsius Scout turns hyperlocal temperature series into collectible location
cards. One deterministic engine calculates the metrics, cohort percentiles,
archetypes, comparisons, lineups, and Average Is Lying summary. An optional LLM
agent can choose those tools and explain their evidence; it never owns the
displayed calculations.

The default demo is fully offline and uses a conspicuously labeled synthetic
Phoenix cohort. Server-side FortyGuard routes and a bounded async provider are
ready for a real captured heatmap response. A live response-to-cohort mapper is
intentionally deferred until the exact returned GeoJSON properties are verified.

## Start

Requires Node.js 20.9 or later. Node 22 LTS is recommended.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the flagship scouting board, or `/festival`
for the isolated Festival Tetris proof. The latter is intentionally a thin
derived slice; its exact optimizer and limitations are documented in
[`docs/FESTIVAL-TETRIS.md`](docs/FESTIVAL-TETRIS.md).

On the flagship, try a preset mission, select a map tile, then ask:

> Find an underrated cool location.

Without LLM credentials, the ask box uses the deterministic scout. With
`OPENAI_API_KEY` and `OPENAI_MODEL`, it uses a strict function-calling loop and
rejects unsupported numerical claims.

## Verify

```bash
npm run check
```

This runs ESLint, strict TypeScript, all Vitest suites, and a production build.

## Optional server configuration

Copy `.env.example` to `.env.local`. Never prefix these keys with `NEXT_PUBLIC_`.

- `FORTYGUARD_API_KEY`: enables the server-only heatmap/status routes.
- `FORTYGUARD_API_BASE_URL`: optional compatible endpoint override.
- `OPENAI_API_KEY` and `OPENAI_MODEL`: enable LLM planning/explanation.

## What to read next

- [`docs/START-HERE.md`](docs/START-HERE.md) — tomorrow-morning onboarding
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — three-minute demo route
- [`docs/METRICS.md`](docs/METRICS.md) — exact analytical contract
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime boundaries
- [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md) — decisions, status, and next moves
- [`docs/PREREQUISITES.md`](docs/PREREQUISITES.md) — topics worth knowing
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — claims and technical limits

## Branches

| Branch | Direction |
| --- | --- |
| `prototype/celsius-scout-core` | Submission candidate: map, cards, missions, grounded agent, Average Is Lying |
| `prototype/average-is-lying` | Focused analytical narrative using the same core summary |
| `prototype/festival-tetris` | Derived deterministic schedule-optimization proof |

The core branch is the recommended submission base. Festival Tetris is a proof
of reuse, not a reason to weaken the flagship.
