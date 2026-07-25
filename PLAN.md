# Project roadmap

**Status (2026-07):** Core platform is live at [reforgermods.com](https://reforgermods.com/). Shipped work lives in [CHANGELOG.md](CHANGELOG.md) — this file is only the short Current / Next view.

**Goal:** Supplement Reforger / Steam Workshop with **live engagement telemetry** (players, servers, trends). Workshop answers *what does this look like?*; this site answers *is anyone playing it right now?*

---

## Current

- Multi-game collector (Reforger / Arma 3) via BattleMetrics → GitHub Actions cron ~2h → Cloudflare KV shards
- Hono edge API on Cloudflare Pages Functions (caching, surgical JSON extract, workshop metadata on demand)
- React 19 UI: mod/server leaderboards, trending, scenarios, storage planner, favorites, uptime history, modpack diffs
- CI + unit tests for ranking, lookup, storage planner, uptime, share meta

See [walkthrough.md](walkthrough.md) and [docs/README.md](docs/README.md).

---

## Next (optional)

### Workshop / metadata
- [ ] R2 self-host thumbnails only if Bohemia CDN hotlink fails
- [ ] Recursive / transitive dependency tree (depth > 1)
- [ ] Batch author / size / last-update warm for Arma 3 (Steam)
- [ ] Mod categorization (Survival, Roleplay, PvP, MilSim)

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

- TypeScript end-to-end; Cloudflare Pages + Workers + KV
- Collector respects BattleMetrics rate limits; paid PAT required — [docs/DATA_SYNC.md](docs/DATA_SYNC.md)
