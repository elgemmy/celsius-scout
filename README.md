# Celsius Scout

**Scout the thermal character of a city—then prove every pick.**

Celsius Scout turns hyperlocal temperature series into collectible location
cards. One deterministic engine calculates the metrics, cohort percentiles,
archetypes, comparisons, lineups, and Average Is Lying summary. An optional LLM
agent can choose those tools and explain their evidence; it never owns the
displayed calculations.

The default experience is fully offline and uses a checked-in, hash-verified
FortyGuard snapshot: eleven hourly 100 m layers over a small Central Phoenix
area. A visible switch retains the conspicuously labeled synthetic cohort as a
deterministic fallback. Server-side routes can safely capture a replacement
snapshot without exposing the provider key.

## Start

Requires Node.js 20.9 or later. Node 22 LTS is recommended.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Try a preset mission, select a map tile, then ask:

> Find an underrated cool location.

Without LLM credentials, the ask box uses the deterministic scout. With
`OPENAI_API_KEY`, `OPENAI_MODEL`, and optionally `OPENAI_BASE_URL`, it uses a
strict Responses-API function-calling loop and rejects unsupported numerical
claims. Any OpenAI-style Responses provider works (OpenAI, DeepSeek, xAI); Chat
Completions-only endpoints will not.

## Verify

```bash
npm run check
```

This runs ESLint, strict TypeScript, all Vitest suites, and a production build.

## Optional server configuration

Copy `.env.example` to `.env` or `.env.local`. Never prefix these keys with `NEXT_PUBLIC_`.

- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`: plug any Responses-API provider. Defaults to `https://api.openai.com/v1` if the URL is omitted. Restart the server after changing these.
- `FORTYGUARD_API_KEY`: provider credential used only on the server. The scouting board already ships an Observed Phoenix snapshot; a live key does not swap the UI onto a new city.
- `FORTYGUARD_CAPTURE_TOKEN`: protects the operator-only heatmap/status routes; leaving it empty disables them.
- `FORTYGUARD_API_BASE_URL`: optional compatible endpoint override.

With the development server running and the same `FORTYGUARD_CAPTURE_TOKEN` in
both processes, `npm run capture:fortyguard` reuses any completed hourly files
and only submits missing layers for the pinned snapshot.

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
