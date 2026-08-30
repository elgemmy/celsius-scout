# Celsius Scout

**Scout the thermal character of a city—then prove every pick.**

**Code repository:** [github.com/elgemmy/celsius-scout](https://github.com/elgemmy/celsius-scout)

Celsius Scout turns hyperlocal temperature series into collectible location
cards. One deterministic engine calculates the metrics, cohort percentiles,
archetypes, comparisons, lineups, and Average Is Lying summary. An optional LLM
agent can choose those tools and explain their evidence; it never owns the
displayed calculations.

The default experience is fully offline and uses a checked-in, hash-verified
FortyGuard snapshot: eleven hourly 100 m layers over a small Central Phoenix
area on 18 August 2026. A visible **Synthetic Demo** switch retains the
conspicuously labeled synthetic cohort as a deterministic fallback.

## For judges

| Submission item | Where it is |
| --- | --- |
| Working demo | This Next.js app — [Start](#start) |
| Code repository | [github.com/elgemmy/celsius-scout](https://github.com/elgemmy/celsius-scout) |
| Written summary, solution, and impact | [`docs/SUBMISSION.md`](docs/SUBMISSION.md) |
| Short video (2–5 min) | Script: [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md). Recording is a separate human step. |
| FortyGuard API usage | [`docs/API-NOTES.md`](docs/API-NOTES.md) |

## Start

Requires Node.js 20.9 or later. Node 22 LTS is recommended.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No FortyGuard or OpenAI key is required.

You should see **The Phoenix Combine**, mode **Historical Snapshot**, mission
tabs, a FIFA-style player card, **Ask the Scout**, and **The Average Is Lying**.
Try a preset mission, select a map tile, then ask:

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

Copy [`.env.example`](.env.example) to `.env` or `.env.local`. Never prefix these
keys with `NEXT_PUBLIC_`.

- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`: plug any Responses-API provider. Defaults to `https://api.openai.com/v1` if the URL is omitted. Restart the server after changing these.
- `FORTYGUARD_API_KEY`: provider credential used only on the server. The scouting board already ships the Observed Phoenix snapshot; a live key does **not** import a new city.
- `FORTYGUARD_CAPTURE_TOKEN`: protects the operator-only heatmap/status routes; leaving it empty disables them.
- `FORTYGUARD_API_BASE_URL`: optional compatible endpoint override.

FortyGuard usage (endpoints `heatmap` and `status`, `api-key` header, async
activity IDs, the 18 August 2026 100 m TCM snapshot, and
`npm run capture:fortyguard`) is documented in
[`docs/API-NOTES.md`](docs/API-NOTES.md). Keys never enter the browser.

With the development server running and the same `FORTYGUARD_CAPTURE_TOKEN` in
both processes, `npm run capture:fortyguard` reuses any completed hourly files
and only submits missing layers for the pinned snapshot.

## What to read next

- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — written project summary
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — 2–5 minute recording script
- [`docs/API-NOTES.md`](docs/API-NOTES.md) — FortyGuard API usage
- [`docs/METRICS.md`](docs/METRICS.md) — exact analytical contract
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime boundaries
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — claims and technical limits
