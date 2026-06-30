# 🗺️ Project Roadmap: Arma Mods Leaderboard

This document outlines the strategic vision, current implementation status, and future technical milestones for the platform.

---

## 🎯 Strategic Vision

**The Goal**: To supplement the official Reforger / Steam Workshop with **live engagement telemetry** (players, servers, trends) — not to replace workshop browsing. Workshop answers *“what does this mod look like?”*; this platform answers *“is anyone actually playing it right now?”*

---

## 🏗️ System Architecture (Current)

- [x] **Data Ingestion**: Multi-game (Reforger/Arma 3) collector with BattleMetrics API integration.
- [x] **Storage Layer**: Sharded Cloudflare KV (JSON-based) to bypass 25MB limits.
- [x] **API Layer**: High-performance Hono-based Edge API with global caching.
- [x] **Frontend**: Reactive React 19 dashboard with client-side caching.
- [x] **Scenario leaderboard**: Collector → KV `cache:ranking:scenarios:{game}`; `/scenarios` UI + Tools nav dropdown.

---

## 🚀 Phase 1: Performance & Stability [COMPLETED]

- [x] **Edge Caching**: Implemented Cloudflare Cache API for <10ms TTFB.
- [x] **Ultra-Optimization**: String-based JSON scanning to reduce Worker CPU usage by 80%.
- [x] **Sharding Engine**: Automated sharding for large history datasets.
- [x] **Dynamic Trending**: Implemented logarithmic trend scoring.
- [x] **Ultra-Optimization Overhaul**: Implemented lazy chunk loading and text-based KV scanning to save Workers calls and prevent OOM errors.
- [x] **Data Integrity Overhaul**: Implemented history sanitization, de-duplication, and backfilling bug fixes.
- [x] **Automated Quality Controls**: Integrated Node-native Unit Tests suite and GitHub Actions CI pipeline.
- [x] **Observability & Diagnostics Page**: Created the public System Status page displaying KV sharding health, edge latency, and ingestion telemetry.

---

## 🚧 Phase 2: Metadata Enrichment [IN PROGRESS]

- [x] **Workshop thumbnails (UI)**:
  - [x] `ModThumbnail` → `/api/mods/:id/thumbnail` (JSON CDN URL) → direct Bohemia CDN load.
  - [x] KV stores **URL only** (7d), not image bytes; letter fallback when missing.
  - [x] Unified scrape with dependencies (`workshop-fetch.ts`).
  - [x] OG/social still uses `/api/og/preview/mod/:id` (302).
  - [ ] R2 self-hosting (only if CDN hotlink proves insufficient).
- [x] **Workshop dependencies (Reforger, on-demand)**:
  - [x] `/api/mods/:id/dependencies` — direct deps from workshop `__NEXT_DATA__`, KV cache 7d.
  - [x] Mod detail UI: „Required Dependencies“ vs „Frequently Deployed Together“ (BM co-deploy).
  - [ ] Recursive / transitive dependency tree (depth &gt; 1).
- [x] **Scenario leaderboard**:
  - [x] `scenarioName` per server (BM: Reforger mission / Arma 3 map·mission).
  - [x] Collector aggregation + `GET /api/scenarios` + drill-down `/api/scenarios/servers`.
  - [x] UI `/scenarios`, server detail deep-link `?s=`, nav **Tools** dropdown.
  - [ ] Scenario history / trending (future — would extend shared `history:*` shards).
- [ ] **Arma Workshop Scraper (batch metadata)**:
  - [ ] Author, file size, last update (collector-side enrichment, not per-page scrape).
  - [ ] Categorization (Survival, Roleplay, PvP, MilSim).
- [ ] **Mod Comparison Tool**: Side-by-side performance analytics for multiple mods.
- [ ] **User Alerts**: Discord/Webhook notifications for mod developers when their mods hit "Trending".

### UX principle (workshop supplement)

| Workshop provides | We provide |
|-------------------|------------|
| Screenshots, description, subscribe | Live players & server count |
| Static popularity (likes/subs) | Rank, trend delta, market share |
| Download / install | “Is it deployed right now?” confirmation |

Thumbnails are **recognition aids** only — telemetry remains the primary value.

**Technical detail:** [docs/WORKSHOP_METADATA.md](docs/WORKSHOP_METADATA.md) — thumbnail pipeline, dependency scrape, cache layers, co-deploy vs dependencies.

---

## 🔭 Phase 3: Advanced Analytics [PLANNED]

- [ ] **Predictive Trending**: Using historical patterns to predict the next "big thing" in the modding scene.
- [ ] **Market Share Analysis**: Visualizing mod ecosystem dominance across different game versions.
- [ ] **API for Developers**: Publicly available SDK for other sites to pull mod rankings.

---

## 📝 Technical Notes

- **Language**: TypeScript (End-to-End).
- **Environment**: 100% Serverless (Cloudflare Pages + Workers).
- **Compliance**: Adhering to BattleMetrics API rate limits via custom throttling logic.
