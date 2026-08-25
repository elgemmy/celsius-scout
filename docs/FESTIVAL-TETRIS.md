# Festival Tetris prototype

Festival Tetris proves that Celsius Scout's thermal profiles can drive a
decision, not just a card. The `/festival` route compares an intentionally poor
fictional schedule with the best feasible schedule inside a small, declared
choice space.

## What is deterministic

The event fixture declares activities, attendance, duration, allowed locations,
allowed starts, capacities, fixed assignments, and shared-resource conflicts.
The evaluator then:

1. Interpolates each location's temperature between timestamped observations.
2. Integrates degrees above the cohort's 38°C comparison threshold across the
   activity window.
3. Multiplies degree-hours per attendee by declared attendance to produce
   person-degree-hours.
4. Rejects assignments that violate capacity, fixed activity, allowed choice,
   same-location overlap, shared-resource conflict, or thermal-window rules.

The optimizer enumerates every combination in a stable order. It chooses the
feasible schedule with the lowest total person-degree-hours. Exact ties choose
the fewest changed activities, followed by a stable lexical schedule key. No
LLM proposes placements or calculates values in this prototype.

## Run and verify

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/festival`.

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build -- --webpack
```

## Limits

- The Phoenix thermal series and event plan are synthetic and clearly labeled.
- 38°C is an operational comparison threshold, not a health or safety limit.
- Attendance weighting is a transparent demo objective. It does not model
  individual exposure, shade, indoor conditions, movement, or health outcomes.
- Exact enumeration works because this fixture has a small finite choice space.
  A real festival with many activities should use constraint programming or a
  bounded optimizer while retaining this evaluator as the numerical source of
  truth.
- The optimizer treats thermal exposure as the primary objective. "Fewest
  changes" is a tie-break, not a weighted trade-off. A production planner should
  expose that policy as a user-selectable objective.
- All hard constraints are declared in code. Missing real-world constraints
  cannot be inferred from the output.

## Files

- `lib/festival/demo-plan.ts` — event, choices, and constraints
- `lib/festival/exposure.ts` — validation and exposure integration
- `lib/festival/optimizer.ts` — exact enumeration and tie-breaking
- `lib/festival/festival.test.ts` — evaluator and optimizer guarantees
- `app/festival/page.tsx` — static before/after evidence view
