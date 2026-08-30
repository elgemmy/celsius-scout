# FortyGuard snapshot data

`raw/phoenix-2026-08-18/` contains sanitized completed results from eleven
time-specific `tcm` heatmap activities at 100 m resolution. Each file includes
the request geometry, capture timestamp, activity ID, returned polygons, tile
temperatures, and aggregate statistics. It contains no API key.

`phoenix-2026-08-18-manifest.json` records the cohort window and SHA-256 hashes
of every request and completed result. The mapper validates the raw files and
joins observations only by stable `tile_id`; it does not infer missing values or
temporal order from range aggregates.

Run `npm run capture:fortyguard` while the local Next.js server is running to
reuse completed files and submit only missing hourly layers. Replacing the
pinned area or date requires updating the capture configuration and recording
that scope decision in `docs/DECISION-LOG.md`.
