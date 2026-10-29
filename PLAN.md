# Project roadmap

**Status (2026-09-06):** Core platform is live at [reforgermods.com](https://reforgermods.com/). Shipped work lives in [CHANGELOG.md](CHANGELOG.md) — this file is only the short Current / Next view.

**Goal:** Supplement Reforger / Steam Workshop with **live engagement telemetry** (players, servers, trends). Workshop answers *what does this look like?*; this site answers *is anyone playing it right now?*

---

## Current

- Multi-game collector (Reforger / Arma 3) via BattleMetrics → GitHub Actions cron hourly (`0 * * * *`) → Cloudflare KV shards
- Unified Hono edge Worker (`web/worker.ts`) + KV: serverId→shard index (v1.23.25, INC-2026-09-06), precomputed default pages, surgical JSON extract
- React 19 UI: mod/server leaderboards, trending, scenarios, storage planner, favorites, uptime history, modpack diffs
- Frontend: all 21 pages are `React.lazy` plus `DeferredSection` below-fold mounting (v1.23.26)
- CI + unit tests for ranking, lookup, storage planner, uptime, share meta, server index

Performance status and measurements: [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) (2026-09-06 section), incidents: [docs/INCIDENTS.md](docs/INCIDENTS.md).

---

## Next (prioritised by impact)

### Performance — server detail (PSI 2026-09-07: desktop 89, a11y 98 — was 59 / 94)
- [x] **LCP data inlining** — a `<script>` with the server JSON in the `/server/:id` HTML response; React reads it immediately without an API round-trip. DONE v1.23.27 (`7b9b590`) — **re-measured: desktop TBT 2 380→220 ms, LCP 1.2 s, SI 1.3 s, score 89**
- [x] **A11y** — contrast plus glossary heading order. DONE v1.23.27 — **94→98**; 1 audit item left
- [ ] **A11y 98→100** — one item left: "heading elements not in sequential order" (find the remaining spots in other components)
- [ ] **Mobile PSI measurement** — owner to run (expected >90)
- [ ] Desktop TBT remainder (220 ms) — no longer blocks the score; not relevant
- [x] **Process rule:** every new above-fold section ships with a PSI check before merge (the 2026-08-24 → 08-27 feature wave took /server/* from 97 to 62–71; see LIGHTHOUSE.md)

### Workshop / metadata
- [ ] **Phase 2:** mod→server reverse index for `/mods/:id` (currently batched by 4; KV schema plus collector — design review required)
- [ ] R2 self-host thumbnails only if Bohemia CDN hotlink fails
- [ ] Recursive / transitive dependency tree (depth > 1)
- [ ] Batch author / size / last-update warm for Arma 3 (Steam)
- [ ] Mod categorization (Survival, Roleplay, PvP, MilSim)

### Ops
- [ ] The `cron-job.org` job stores a temporary `gho_...` GitHub token — replace it with a long-lived fine-grained PAT (INC-2026-08-27 TODO)
- [ ] Manual collector dispatch before a run — check `gh run list` (duplicates write to the same KV keys in parallel; see INC-2026-09-06)

### Storage planner
- [ ] SEO: Search Console `noindex` for `/storage-planner` vs landing
- [ ] Precomputed server-similarity index (full network)
- [ ] Warm size coverage beyond top-300
- [ ] Arma 3 Steam workshop sizes in planner

### Product
- [ ] Scenario history / trending (extend shared `history:*` shards)
- [ ] Mod comparison (side-by-side)
- [ ] Discord/webhook alerts when a mod hits Trending
- [ ] Public read API / SDK for third-party sites
- [ ] Predictive trending / market-share views (exploratory)

---

## Notes

- TypeScript end-to-end; Cloudflare Workers + KV (Pages removed 2026-08-24)
- Collector respects BattleMetrics rate limits; paid PAT required — [docs/DATA_SYNC.md](docs/DATA_SYNC.md)
