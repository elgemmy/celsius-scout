# Demo video script (3:30–4:00)

Fits the 2–5 minute submission video. Record at 1080p with the pointer visible.

**Setup:** `git checkout main && git pull origin main && npm run dev`  
Open `http://localhost:3000`, Historical Snapshot on, hard-refresh, map zoom **1×** so all ten tiles show. Do not open How ratings work until the close.

## 0:00–0:25 — Hook

**VO:** “A city average gives you one number. Celsius Scout asks a better question: what kind of thermal *player* is each block?”

**Camera:** Title, **Historical Snapshot**, window **18 Aug · 10:00–20:00**, **100 m**, **10 profiles**, threshold **38°C**.

**VO:** “This is not live weather. It’s a pinned FortyGuard capture. The tiles are real 100-metre polygons. The city picture underneath is a stage.”

## 0:25–0:50 — The Combine

**VO:** “We call it the Phoenix Combine. On this day almost every tile ran the same marathon. Peaks sit within a tenth of a degree. We’re not hunting a rainforest. We’re hunting a *tell*.”

**Camera:** Slow scroll-zoom on the map, hover a couple of tiles, land on **041 / Peak Captain**.

## 0:50–1:25 — Thermal fraud

**Click:** mission **Thermal fraud**.

**VO:** “Fraud here means the average hides the peak — not that the data is fake.”

**Camera:** Card (HP, sparkline, PEK / STA). Pan to **Scout report**: peak-to-mean gap **0.782°C**, peak **41.901°C**, mean **41.119°C**, tool `find_biggest_thermal_fraud()`.

## 1:25–1:55 — Different twins

**Click:** **Different twins**. Click each highlighted tile so the card swaps.

**VO:** “Similar means, different players. Persistence, recovery, chaos, and peak time change the story.”

## 1:55–2:35 — Ask the Scout

**Type/click:** **Find an underrated cool location.** → **Run brief**.

**VO:** “Natural language, same engine. The model may choose a tool. Code still owns every number.”

**Camera:** Wait for the report + executed tool (likely `find_underrated_cool_location`). If it stays deterministic, that’s fine — say: “If the model is out, the deterministic scout runs the same tool so the demo never dies.”

## 2:35–3:10 — The Average Is Lying

**Scroll** to that panel.

**VO:** “Same engine, one sentence: this snapshot is nearly spatially uniform. Tile means differ by about three hundredths of a degree. That *proves* the captured-data path. It does not pretend Phoenix is a jungle of microclimates.”

**Optional 5 sec:** switch **Synthetic Demo** — “Demo is the practice pitch, labeled synthetic, for when we need Furnaces and Oases on the same board.” Switch back to Snapshot.

## 3:10–3:40 — Close

**VO:** “Celsius Scout turns FortyGuard hyperlocal temperature into something you can draft, inspect, and prove. Scout a pattern. Open the card. Read the tool. That’s the pick.”

Hold on map + Peak Captain. Cut.

## Recording notes

- Stay on **Historical Snapshot** for the story; Demo is only a 5-second honesty beat.
- Don’t promise health, safety, or “this block is dangerous.”
- Don’t call the aerial photo “satellite.”
- If Comfort is “Unavailable,” that’s correct (temperature-only snapshot).
- Target **1080p**, pointer visible, no music under the numbers.
