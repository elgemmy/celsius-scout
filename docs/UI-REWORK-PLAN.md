# Celsius Scout UI rework plan

Two-hour visual and information-architecture pass. No new product loop, no extra
pages, no component library, no live basemap. Stay inside `app/layout.tsx`,
`app/globals.css`, `components/celsius-scout.tsx`, and `components/heat-grid.tsx`.

The live page at `/` (Observed default, 2026-08-30) confirms the diagnosis below.

---

## 1. Inventory

Single page. One `main.app-shell`. Information is a long vertical stack; the
numbered scouting loop only starts after a poster and a metadata bar.

| Surface | Markup | What it currently does |
| --- | --- | --- |
| Header | `header.site-header` | Three-column grid: `.wordmark` (skewed lime bars + CELSIUS**SCOUT**), `.header-status` (“Deterministic core · LLM-ready”), `.text-link` to `#how-it-works`. |
| Intro | `section.intro` | Eyebrow “THERMAL INTELLIGENCE, SCOUTED”; `h1` “Every block has a *thermal character.*” with the italic on its own line; `.intro-copy` sells drafting/exposing/inspecting. |
| Cohort bar | `section.cohort-bar` | `.demo-badge` OBSERVED SNAPSHOT (teal) or SYNTHETIC PREVIEW (lime); cohort name + source label; `.cohort-controls` Observed / Demo; `.cohort-facts` locations, window, threshold, resolution/ratings. |
| Missions | `aside.mission-rail` inside `.scout-workspace` | Eyebrow “01 / PICK A BRIEF”. Four `.mission-button`s in array order: Coolest five, Thermal fraud, Different twins, Fastest recovery. Default active is Thermal fraud (`useState("thermal-fraud")`), so the first button is never the default. `.ask-scout` textarea prefilled with “Find an underrated cool location.” plus “Run agent brief”. `.mission-note` about LLM vs code. |
| Map | `section.map-panel` + `HeatGrid` | Eyebrow “02 / SCAN THE COHORT”, title “Phoenix board”, `.map-key` “Mission picks”. `.thermal-map` (760/570) with a fictional road/water SVG underlay, ten absolute `.map-plot` buttons, N marker, min–max legend, caption about footprints. |
| Card | `section.card-panel` + `ScoutCard` | Eyebrow “03 / INSPECT THE PICK”. `.cohort-rank` shows the archetype. Card: HP, OBSERVED/SYNTHETIC badge, decorative sun/mountain portrait, location name, archetype chip, sparkline, six percentile stats, percentile disclaimer. `.card-explanation` repeats the archetype paragraph. |
| Evidence | `section.evidence-panel` | Full-width slab under the workspace. Left: “SCOUT REPORT / THERMAL FRAUD” + prompt + result. Center: three `.evidence-facts`. Right: executed `tool()` name(s). Multi-select only gets `.selection-strip` chips. |
| Average | `section.average-panel` | Lime-tinted “DERIVED EXPERIENCE / THE AVERAGE IS LYING”. Broad mean, local range, exposure share. |
| Ratings guide | `section.ratings-guide#how-it-works` | Eight-cell glossary (HP, Peak, Stamina, Recovery, Comfort, Chaos, Surprise, RAW) plus three claim-boundary notes. |
| Method strip | `section.method-strip` | Data honesty (Observed vs Demo) and interpretation limits. |

### Current information flow

1. Poster identity (header + intro) — scouting metaphor in copy, not in the board.
2. Provenance (cohort bar) — this is the only place the data mode is unmistakable.
3. Brief → board → card (three-column `.scout-workspace`, numbered 01/02/03).
4. Proof (evidence slab, *below* the card).
5. Sermon (Average Is Lying).
6. Appendix (ratings guide + method strip).

State that drives highlights: `activeMission.selectedIds` unless the user clicks
a tile (`manualSelection`) or the agent returns location ids. The card always
shows one location (`selectedId` or the mission’s first pick). The map can
highlight many. Evidence switches among mission facts, inspection facts, and
the last agent evidence triple.

Default Observed board on load: Thermal fraud → Phoenix 100m Tile 41 selected →
card “The Balanced Operator”, HP 70, peak 41.9°C, Comfort “—”. Evidence facts:
time-weighted mean 41.1°C, peak 41.9°C, peak − mean **0.8°C**. Average panel:
local range **41.1–41.1°C**, span **0.0°C**, 100% of tile-hours above 38°C. All
ten map labels print **41.9°**.

---

## 2. Diagnosis

The engine is a scouting product. The interface is a dark analytics poster that
happens to contain a card. A new user does not understand the player-scouting
metaphor in 15 seconds because the first 15 seconds are a 7-rem headline, not a
brief, a board, and a jersey.

### Hierarchy

- `.intro h1` is `clamp(3rem, 6.3vw, 7.15rem)` / `line-height: .86` /
  `font-weight: 720` with `.intro h1 em { display: block }`. Combined with
  `.intro` padding `clamp(42px, 6vw, 86px) 0 42px`, the workspace starts well
  below the fold on a 1440×900 laptop. GOAL.md’s 15-second test is failed by
  type size, not by missing copy.
- Header status “Deterministic core · LLM-ready” is an engineering heartbeat.
  The scout does not walk into a combine and read runtime architecture.
- The actual loop (mission → selected tiles → card → tool name) is correctly
  numbered 01/02/03, then immediately undercut: evidence is a fourth unlabeled
  band, Average Is Lying is a fifth product, ratings guide is a sixth. Too many
  complete-looking surfaces after the one interaction that matters.
- Mission list order fights the demo script. `missionsFor()` leads with Coolest
  five; the default state is Thermal fraud. Presenter has to skip button 01 to
  start the three-minute path.
- `.ask-scout` is always-on, same visual weight as the four briefs. “Prefer one
  complete interaction over several inactive controls” is already being broken
  in the rail.

### Type

- `body` declares `font-family: Inter, ui-sans-serif, …` in `app/globals.css`.
  `app/layout.tsx` loads **no font**. Live HTML has no `next/font` class, no
  Google Fonts link, no `@font-face`. Inter is never fetched. The page renders
  in system UI sans. The only intentional voice is Georgia on `.intro h1 em`,
  and that voice is locked to the poster, not the card names.
- Non-standard weights: `.intro h1` `font-weight: 720`; `.ask-scout button`
  `font-weight: 850`; `.guide-code` `font: 850 .52rem/1`. Browsers snap these
  to 700. The “designed” bold never exists even if Inter is later loaded
  without a 800/900 cut.
- Microcopy is unreadable as a scouting artifact: `.plot-id` `clamp(.43rem…)`,
  `.card-stats small` `.41rem`, `.card-footer` `.41rem`, `.spark-meta` `.42rem`,
  `.map-legend` `.49rem`, `.evidence-facts span` `.5rem`, `.tool-trace code`
  `.52rem`. A presenter cannot point at peak − mean 0.8°C from two meters away.
- Everything that should feel like a dossier (eyebrows, badges, tool names)
  already uses `ui-monospace`, but the system mono is not paired with a loaded
  display face, so the page is “small gray labels on dark teal,” not “scout
  report + player card.”

### Map readability (10 × 100 m tiles, not a city heatmap)

This is not “too many tiles” in count — the mapper selects ten spatially
distributed polygons from a 42-cell capture. It is a board that was styled for
chunky named demo parcels (`width: 15%; height: 18%`, no `clipPath`) and then
fed 100 m footprints.

Concrete failures in `HeatGrid` + `.map-plot`:

- **Identical degree labels, contradictory color.** Every Observed plot’s
  `<strong>` is `41.9°` (`toFixed(1)` of `features.peakTemperatureC`). Tone
  classes still span `--cool` through `--extreme` because `mapTone(scores.peak)`
  percentiles a sub-tenth-degree spread. Tile 00 is `--extreme`, Tile 06 is
  `--cool`, both say 41.9°. That is a heat dashboard that cannot be read, not a
  scouting board.
- **Islands on a fake city.** `mapGeometry` places ~12.9% × 14.3% clipped
  rectangles with 5% padding in the bounds. Large empty underlay. `.map-road`,
  `.map-road-wide`, `.map-water`, `.map-contours` are decorative Bezier fiction
  (`LIMITATIONS.md` already admits this). Roads do not relate to tiles, so the
  eye reads “sticker sheet,” not “district.”
- **Playful transforms fight 100 m geometry.** `.map-plot { transform: rotate(-1deg); }`
  and `:nth-child(3n) { transform: rotate(1.2deg); }` plus
  `border-radius: 5px 12px 7px 10px` and a `repeating-linear-gradient` stripe
  (`::after`) are demo-parcel theater. Clipped FortyGuard polygons plus rotation
  make a regular grid look drunk and steal contrast from the tone fill.
- **Selection is a 1px→3px border swap.** `.map-plot.is-selected` sets
  `border: 3px solid var(--lime)` against a default 1px border. That changes
  the box, shifts neighbors, and still loses to fill color. Hover
  `transform: translateY(-2px) rotate(0)` un-rotates only on hover, not when
  selected. Mission picks are supposed to be the story; they are a thin lime
  ring.
- **No player identity on the chip.** Visible text is a 3-digit `.plot-id`
  (`000`…`041`) and the same peak. Archetype, HP, and the actual location name
  (“Phoenix 100m Tile 41”) live only on the card. You cannot scout from the
  board.
- **`preserveAspectRatio="none"`** on `.map-underlay` lets the fake streets
  squash independently of the percentage-positioned plots.
- Hit targets are currently ~90×80px on a 700px-wide map, acceptable. On
  `max-width: 520px` they collapse toward ~46px with `.plot-id { font-size: .4rem }`.
  `clip-path` plus rotation plus the 3px selected border is the accessibility
  and tap-target risk, not the desktop size.

Do not add the other 32 captured cells. Ten is the right scout roster. Make
those ten read as a roster.

### Card collectability

`ScoutCard` already has the right *slots*: foil (`.card-holo`), edition badge,
HP, archetype, sparkline, six ratings, “FORTYGUARD × CELSIUS SCOUT”. It does
not behave like an object you would keep.

- Default Observed pick (Thermal fraud / Tile 41) uses
  `ARCHETYPE_ACCENTS["balanced-operator"] = "#a9b7b4"`. The first card in the
  demo is the gray one.
- `.card-portrait` is a generic sun-disc + mountain path. It does not use
  `location.sparkline`. The actual thermal signature is a 46px chart under the
  name. The art is clip-art; the evidence is a footnote.
- Player name is `Phoenix 100m Tile 41` at 1.45rem. Jersey energy is the
  overlapping `.card-location-code` (“041”) at the bottom of the fake landscape.
  Lean into the number; the verbose mapper name is a caption, not a hero.
- Six `.card-stats` cells at `.46rem` / `.41rem`. Observed Comfort is “—” /
  “Unavailable” — a missing sticker in the most visible 2×3 grid. It must stay
  labeled unavailable; it should not look like a broken pixel.
- `.card-holo` is `opacity: .11` + `mix-blend-mode: screen` + 24px repeating
  lines. Invisible in practice.
- Card is `max-width: 370px` centered in `.card-panel { background: #0b1b1f }`.
  It sits in a hole instead of floating as a collectible over the board.
- `.card-explanation` restates the archetype paragraph the evidence panel will
  say again. Duplicate proof, zero punch.

### Mission theatricality

- Kickers (`Draft` / `Expose` / `Compare` / `Find`) are the most scouting-native
  words on the page and are `.52rem`.
- Inactive `.mission-button` is `background: rgba(255,255,255,.025)` — a
  settings row. Active lime fill is the strongest state in the UI; it is
  wasted on a 13px-padded list item next to a textarea.
- Trailing `↗` on every brief implies navigation. Nothing navigates.
- Fastest recovery is a real tool and should stay. It should not visually
  outrank the three-minute path.
- `.mission-note` (“LLM-compatible, evidence-bound”) is more engineer-voice
  competing with “run this brief.”

### Evidence punch

The three-minute script’s money shot is: selected tile, card, **mean, peak,
peak-to-mean gap**, executed tool `find_biggest_thermal_fraud()`. Those three
numbers currently live in `.evidence-facts strong` at `clamp(.72rem, .9vw, .9rem)`
in a third of a three-column slab *under* the workspace. Tool name is `.52rem`
teal `<code>`. On Observed the gap is 0.8°C — already a quiet fact — set in
quiet type. No comparison bar, no “this is the call,” no jersey of the pick.

`.mission-result h2` repeats the prompt in ~1.1rem muted-adjacent text. The
report does not look like a report; it looks like a dashboard footer.

### Mobile

- `max-width: 1220px` moves `.card-panel` to `grid-column: 1 / -1` and puts the
  card in column 2. The 01/02/03 table collapses; card detaches from map.
- `max-width: 820px` stacks mission → map (`order: 2`) → card (`order: 3`).
  Correct for “pick a brief first,” but the intro headline is still
  `clamp(3.2rem, 13vw, 6rem)`, so the brief is not on screen.
- `max-width: 520px`: `.header-status { display: none }`; `.text-link` uses
  `font-size: 0` with only the ↗ visible (the “How ratings work” name is gone
  for screen and for sighted users who get an orphan arrow); `.mission-list`
  becomes two columns and `.mission-number { display: none }`. Thermal fraud is
  even harder to find. `.cohort-bar` loses radius and becomes a full-bleed
  stripe, which is fine; the 2×2 mission pad is not.

### What 15 seconds currently sells

A large italic “thermal character,” a teal OBSERVED badge, and a dark grid.
Not a player. Not a brief. Not a pick you could argue about.

---

## 3. Keep list

Do not break these. Restyle around them.

- **The loop:** series → features → cohort scores → archetype → scouting tools
  → grounded explanation. Still one page. Still `runMission` / `inspect` /
  `askScout`.
- **Observed default, Demo fallback.** `.cohort-controls` Observed / Demo,
  `switchCohort`, default `cohorts[0]` (FortyGuard snapshot).
- **Labels:** OBSERVED SNAPSHOT vs SYNTHETIC PREVIEW; card edition
  OBSERVED vs SYNTHETIC; map caption “Returned FortyGuard 100 m polygon
  footprints” vs “Synthetic point fixture…”; `.method-strip` honesty sentence
  with `snapshotId`. Comfort remains “Unavailable” on the temperature-only
  snapshot and must stay labeled as such.
- **Tool names:** `find_biggest_thermal_fraud`, `find_similar_average_different_behavior`,
  `find_coolest_lineup`, `find_fastest_recovery`, `inspect_location`, plus the
  underrated-cool agent path. Keep rendering `tool()` from structured results.
- **Numeric grounding:** every number on the card, map, evidence, and Average
  panel still comes from `analyzeCohort` / scouting helpers / agent evidence.
  No copy that invents a cooler mean or a larger fraud gap.
- **Claim boundaries:** Heat Pressure is 50% Peak + 50% Stamina, not health.
  Surprise is local deviation. “Fraud” means average masking. Ratings are
  in-cohort percentiles. No medical, causal, or intervention-effect language.
  Ratings guide and method strip stay on the page (they can be visually
  quieter; they cannot disappear).
- **Ask preset:** textarea default remains “Find an underrated cool location.”
- **Selection state machine:** mission multi-select vs single card vs agent
  ids vs manual inspect. Lime mission-pick meaning stays “these tiles are in
  the brief.”
- **Deterministic offline Demo.** Font loading must be `next/font` self-hosted
  (build-time), not a runtime Google CSS request.
- **A11y already present:** `aria-pressed` on plots and missions, `aria-live`
  on evidence, `aria-label`s on plots/card, lime `focus-visible`,
  `prefers-reduced-motion` kill switch.

---

## 4. Two-hour plan

### Must-do — first 45 minutes (highest visual/IA leverage)

This block is the 15-second test and the three-minute path. If time dies here,
ship this anyway.

1. **Load type in `layout.tsx`.** `next/font/google`: Inter (400/500/700/800)
   as `--font-sans`, a display serif (Instrument Serif *or* Fraunces, italic
   400) as `--font-display`, IBM Plex Mono (500/700) as `--font-mono`. Put
   classNames on `<html>`. Point `body` / `.intro h1 em` / `.card-identity h2` /
   eyebrows at CSS variables. Delete fake weights 720 and 850 (use 800).
   Self-hosted fonts keep runtime Demo offline.
2. **Collapse the poster so the board is in the first viewport** (1440×900).
   Cut `.intro` padding to ~20–28px. Drop `h1` to roughly `clamp(2.1rem, 3.6vw, 3.4rem)`,
   one line plus a short italic — not a two-line 7-rem billboard. Move
   `.intro-copy` to a single 40ch line under the title. Header status becomes
   a scouting pulse (“PHOENIX COMBINE · 100 m”) not “LLM-ready.”
3. **Reorder briefs to the demo path** in `missionsFor()`: Thermal fraud →
   Different twins → Coolest five → Fastest recovery. Keep default
   `thermal-fraud`. Numbers 01–04 will then match the script. Restyle
   `.mission-button` as a dossier row: big kicker, title at ~1rem, no ↗.
   Active = lime ticket. Ask box stays, but as a secondary “or write a brief”
   block with less padding and a quieter button.
4. **Make the map a roster, not a sticker sheet.**
   - Kill `.map-plot` rotation and the irregular radius. Square/4px radius.
     Selected uses `outline` / `box-shadow`, **not** a thicker border (no
     layout shift).
   - Dim `.map-road` / `.map-water` (opacity ~.25–.35, thinner strokes) so
     tiles are the figure.
   - Tile face: code + **Heat Pressure** (or archetype short name), peak °C
     as the small label. Stop leading with a duplicated 41.9°.
   - Mission picks get a lime nameplate (code + name) and sit above unselected
     tiles (`z-index`). Unselected tiles desaturate slightly so the brief
     reads at a glance.
   - Keep tone fills, but they are now background to HP, not the only signal.
5. **Card as the object.** Move `Sparkline` into `.card-portrait` (the series
   *is* the art; delete the mountain path and sun-disc). Jersey: code at
   display size, mapper name as the caption, archetype as a color bar. HP
   large and lime/accent. Raise foil to a visible edge. Stats: 2×3 stays, type
   up to ~.7rem value / .6rem label; Comfort “Unavailable” as an explicit
   void cell, not an em dash. Card gets a real drop shadow and a 2px accent
   edge so it reads as a physical card over `.card-panel`.

### Should-do — next 45 minutes

6. **Evidence as the report, not a footer spreadsheet.** One row: left, the
   call in 1.6–2rem type (the three facts, especially peak − mean / behavior
   gap / captain score); right, a stamped `tool()` at ~.9rem. Result sentence
   stays under the call, one paragraph. `.selection-strip` chips for twins and
   coolest five become the “lineup” under the call. Keep `aria-live`.
7. **Average Is Lying as a closing poster, not another dashboard.** Bigger
   three numbers, quieter intro. Do **not** rewrite the 0.0°C Observed span
   into a more exciting number. If copy changes, only stop promising “the
   scout keeps the distribution visible” when the active cohort’s
   `spatialMeanRangeC` is 0 — still the same engine fields.
8. **Ratings guide / method strip recede.** Keep every definition and claim
   boundary. Reduce `.ratings-guide-intro h2` from `clamp(1.7rem, 3vw, 3rem)`
   toward ~1.5rem; four-column grid can stay. This is the appendix, not act
   two. Header link label must remain visible (undo `font-size: 0` on
   `.text-link`).
9. **Mobile 820/520.** Keep mission → map → card order. Shrink intro further.
   Restore mission numbers on small screens; single-column briefs, min 44px
   height. Map: drop the N ornament if it collides; keep legend. Tile
   nameplates only on selected ids so 46px chips stay tappable. Do not use
   `font-size: 0` to hide link text.
10. **Type scale sweep in CSS.** Floor body-adjacent labels at `.62rem`.
    Eyebrows can stay small if they use loaded mono at 700. Lime/orange/teal
    stay; increase ink contrast (`--muted` is #91a2a2 on #071518 — bump
    toward #b7c4c1 for sentences the presenter reads aloud).

### Won't-do before submit

- New routes, accounts, persistence, chat thread, or a second page for ratings.
- Mapbox / satellite / street-view / extra 32 tiles / real Phoenix basemap.
- New component library, Tailwind, shadcn, animation libraries.
- Changing formulas, archetypes, cohort membership, or recapturing FortyGuard.
- Invented neighborhood names for Observed tiles (Tile 041 is the jersey).
- Mission-dependent map coloring (too easy to break selection meaning).
- Festival Tetris, extra missions, decorative mascots, 3D card flip.
- Replacing the deterministic agent fallback or the ask-box default prompt.
- Pixel-perfect dark-mode tokens or a full design system.

---

## 5. Visual direction

Stay inside the existing CSS architecture: `:root` tokens, the same class names,
the same grid regions. No new library. One allowed extra: font variables from
`layout.tsx`.

### Palette

Keep the night-combine canvas.

| Token | Role after rework |
| --- | --- |
| `--canvas #071518` / `--panel #0d2024` | Board table. |
| `--ink #f4f1e8` | Primary reading. |
| `--lime #d9ff5a` | Briefs, selection, HP callouts, focus. The “scout marker.” |
| `--teal #50d7be` | Observed badge, executed tool, live pulse. |
| `--orange #ff713b` | Furnace / hot accent; card foil when the archetype is hot. |
| Archetype accents (existing map) | Card edge + sparkline only. Do not recolor the whole page per pick. |

Turn down the body orange/teal radial wash so the card and lime selection are
the chromatic events. Keep the noise `body::before` at low opacity; it is the
one “print stock” gesture that already works.

### Type pairing

- **Inter** — UI, facts, buttons, Average numbers.
- **Instrument Serif (italic) or Fraunces** — `h1` italic, card player name,
  Average title. This is the “character” voice, moved off the poster and onto
  the jersey.
- **IBM Plex Mono** — eyebrows, badges, tile codes, `tool()`, edition stamps.

Line-height on display ~0.95; never again 7-rem / 0.86 in the hero.

### Card as a collectible object

A 370px-class portrait card that could be a PNG screenshot in the demo:

1. Foil edge + edition stamp (OBSERVED / SYNTHETIC) + `SCOUT / 10`.
2. Art window = hourly sparkline filling the portrait, peak dot on the max.
3. Jersey code (`041`) big; location name in serif; archetype bar in accent.
4. HP as the overall rating with the existing “relative to cohort” line.
5. Six-stat grid as the back-of-card ratings, Comfort void labeled.
6. Footer: “Ratings = cohort percentiles” + FortyGuard lockup.

Shadow: `0 24px 50px rgba(0,0,0,.45)`. Panel around it darker and emptier so
the card is the figure.

### Map as a scouting board

A table of plots on a quiet field, not a GIS widget and not a sticker bomb.

- Underlay = faint district texture, almost a clipboard.
- Ten plots axis-aligned, footprint-clipped if present, no rotation.
- Unselected: tone fill at ~80% opacity, code visible.
- In-brief: lime frame + nameplate + full opacity.
- Inspected (the card’s location): lime frame plus a corner pip so multi-pick
  missions still show *which* card you are holding.
- Legend stays peak °C min–max; that is honest even when the range is tiny.

### Mission rail as a brief selector

A vertical ticket strip. One heading: “Pick a brief.” Four stacked tickets
with index, kicker, title. Active ticket is lime on ink-dark. The ask form is
a ruled box under a hairline: “Or write a brief.” Submit is lime but smaller
than an active ticket. LLM disclaimer shrinks to one mono line.

---

## 6. File-level change list

`app/page.tsx` does not need to change unless font class plumbing is easier
there — it should not be. Do not touch `lib/`, mappers, or routes.

### `app/layout.tsx`

- Import `Inter`, display serif, `IBM_Plex_Mono` from `next/font/google`.
- `subsets: ['latin']`, explicit weights, `display: 'swap'`, CSS variables
  (`--font-sans`, `--font-display`, `--font-mono`).
- Apply variable classes on `<html>`. Keep `lang="en"` and current metadata
  (title/description already scouting-correct).

### `app/globals.css`

- `body` font-family uses `var(--font-sans)` then the existing fallback stack.
- New utilities only if necessary: `--font-display` / `--font-mono` on the
  classes that already exist (`.intro h1 em`, `.card-identity h2`, `.eyebrow`,
  `.plot-id`, `.demo-badge`, `.tool-trace code`, `.card-location-code`).
- Intro, header, cohort-bar: smaller, tighter, first-viewport math.
- `.mission-button` ticket treatment; quieter `.ask-scout`.
- `.map-plot` un-rotate, stable outline selection, nameplate class,
  desaturate unselected, dim underlay strokes.
- `.scout-card` foil, shadow, portrait-as-spark, larger identity type, void
  Comfort cell.
- `.evidence-panel` from 3 equal columns of micro-type to call + stamp.
- `.average-panel` number scale up; `.ratings-guide` scale down.
- Fix `.text-link` mobile (`font-size: 0` must go). Restore `.mission-number`
  on small screens; single-column `.mission-list`.
- Replace 720/850 weights. Floor micro type. Keep
  `@media (prefers-reduced-motion: reduce)` as-is.

### `components/celsius-scout.tsx`

- Reorder `missionsFor()` array to Thermal fraud, Different twins, Coolest
  five, Fastest recovery. Do not rename tools, kickers, or prompts.
- Header status copy; shorter intro markup (same words, fewer forced line
  breaks). Optional: show `selectedLocation.code` as the visible jersey in
  the card identity; keep `name` as the accessible/`<p>` caption.
- `ScoutCard`: sparkline in the portrait; drop sun-disc/mountain SVG; Comfort
  void class when `percentile === null`.
- Evidence markup: wrap the three facts for scale; keep labels/values from
  `visibleEvidence`; keep `agentReport.trace` tool list.
- Mission buttons: drop the decorative ↗; add a selected-count or the kicker
  as the ticket stub.
- Do not change `inspect`, `runMission`, `askScout`, cohort switch, or
  grounding copy in `.method-strip` / `RatingsGuide` except type wrappers.

### `components/heat-grid.tsx`

- Accept or derive a display line beyond peak °C: pass `code` (already) and
  add optional `heatPressure` and/or `name` on `MapLocation` (extend the
  interface; `toViewLocation` already has both).
- Render nameplate for `selectedIds` (code + truncated name).
- Add `is-picked` vs unselected class if CSS needs desaturation.
- Do not remove `aria-label` peak-temperature wording; extend it with HP
  (“… Heat Pressure 70”).
- Leave the underlay SVG in place; CSS will quiet it. No new tileset.
- Keep `aria-pressed`, `onSelect`, legend min/max.

---

## 7. Demo-script alignment

The three-minute path must get *easier to point at*, not more steps.

| Clock | Script | After rework, the camera should see |
| --- | --- | --- |
| 0:00–0:25 identity | City average vs thermal player; Observed 100 m; Demo switch | Header pulse + compact title **and** the workspace already on screen. Teal OBSERVED SNAPSHOT + Observed/Demo toggle in the cohort bar. Do not add a new identity screen. |
| 0:25–1:00 Thermal fraud | Run the brief; tile, card, mean, peak, gap, tool name | Brief 01 is Thermal fraud and already active (lime ticket). Map nameplate on Tile 041. Card sparkline is the art. Evidence call shows **41.1 / 41.9 / 0.8°C** at display size and `find_biggest_thermal_fraud()` as a stamp. Say the 0.8°C line honestly; type size does the drama the delta cannot. |
| 1:00–1:35 Different twins | Both tiles; behavior-distance; click each card curve | Brief 02. Two lime nameplates. `.selection-strip` as a two-player lineup. Switching tiles only swaps the card sparkline (now huge) — the “curve changes” beat is finally visible. |
| 1:35–2:10 Agent | “Find an underrated cool location.” Mode + tool | Ask box is the secondary control **directly under** the tickets, still prefilled. Evidence eyebrow already switches to `DETERMINISTIC AGENT` / `LLM AGENT`. Tool stamp updates. No extra chrome. |
| 2:10–2:40 Average Is Lying | Broad mean, local range, share above threshold | One scroll. Three poster numbers. On Observed, 41.1–41.1°C will look like a fact, not a failed widget — if the presenter wants spread, they already have the Demo switch from 0:00. Do not add a fifth mission. |
| 2:40–3:00 close | Discoverable, explainable, selection | Card still in frame if possible; no detour into the eight-cell glossary. “How ratings work” remains a skippable appendix. |

Coolest five stays brief 03, used if the underrated ask is skipped or as a
one-click lineup. Fastest recovery stays brief 04, not in the spoken three
minutes.

---

## 8. Risks

A rushed restyle can break the honest core faster than it can save the
metaphor.

- **Selection state.** `selectedIds` is a union of mission ids, manual single
  id, and agent-extracted ids. CSS that assumes “one selected tile” will hide
  twins and the coolest five. Nameplates and lime frames must key off
  `selectedIds.includes`, not `selectedId ===`. The card’s location needs a
  second pip so a five-pick lineup still shows which jersey is in hand.
- **Observed vs synthetic labeling.** Badge classes `.demo-badge` /
  `.is-observed` and `dataBadge` OBSERVED/SYNTHETIC must survive any edition-
  stamp restyle. Demo copy cannot look like FortyGuard. Observed cannot lose
  “historical snapshot / 100 m.”
- **Comfort / unavailable metrics.** Styling null as empty will look like a
  bug on the default snapshot. The void cell has to say Unavailable.
- **Map hit targets.** `clip-path` already shrinks the clickable polygon.
  Adding nameplates, outlines, or `pointer-events` on overlays can make
  unselected tiles untappable or double-fire. Keep the `<button class="map-plot">`
  as the only clickable; nameplate `pointer-events: none`. Do not restore
  rotation. Do not thicken borders. Test tap on a 520px width.
- **Identical Observed peaks.** If someone “fixes” color by mapping tone to
  rounded 41.9°C, every tile goes the same color and the board dies the other
  way. Keep percentile/HP differentiation; change the **label hierarchy**.
- **Average 0.0°C span.** Prettifying that panel without acknowledging the
  number will look like a lie. No fake distribution graphics.
- **Accessibility.** Do not reuse `font-size: 0`. Do not drop `aria-pressed`,
  plot `aria-label`s, evidence `aria-live`, or lime `focus-visible`. Clip-path
  buttons already have weak visible focus if outline is clipped — use
  `outline-offset` on the unclipped box or a `box-shadow` that is not clipped
  (`overflow: visible` on selected).
- **Fonts vs offline Demo.** Runtime must not request fonts.google.com. If
  `next/font` build fails in a no-network CI, fall back to local files; do not
  add a CDN `<link>`.
- **`color-mix` and `mix-blend-mode`.** Already in production CSS; raising
  holo opacity can make text unreadable. Put foil on `::after`, keep type
  above with `z-index`.
- **Scope bleed.** Touching `lib/` to “make Observed more dramatic” is out of
  bounds for this pass and would invalidate tests, the demo script’s honesty
  line, and the claim boundary.

Ship criterion: a stranger can, in 15 seconds, see a brief, a marked tile,
and a player card, and in three minutes can run Thermal fraud → twins →
underrated ask → Average Is Lying without hunting. Everything else is
appendix.
