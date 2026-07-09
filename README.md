# 🛡️ Full-Stack Data Visualization & Edge-Native Leaderboard Platform
### High-Performance Mod Tracking, Analytics & Scalable Ranking System for Arma Community

[![Tech Stack](https://img.shields.io/badge/Architecture-Edge--Native-orange.svg)](https://reforgermods.com)
[![Lighthouse Performance](https://img.shields.io/badge/Lighthouse_Performance-100_(desktop)_%7C_98_(mobile)-brightgreen.svg)](docs/LIGHTHOUSE.md)
[![Lighthouse SEO](https://img.shields.io/badge/Lighthouse_SEO-100-brightgreen.svg)](docs/LIGHTHOUSE.md)
[![System Type](https://img.shields.io/badge/System-Distributed_Caching-blue.svg)]()
[![License](https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

A production-grade, highly-optimized data aggregation and visualization platform built to overcome the limitations of the official Arma Workshop. By analyzing active multiplayer server environments and player metrics, the system calculates real-time popularity index, retention, and community trends.

---

## 🚀 Key Engineering & Architectural Highlights

### 1. Low-Overhead Co-Deployment Analytics
* **Problem**: Storing custom co-occurrence matrices for hundreds of mods in a serverless key-value store would exponentially increase Cloudflare KV transaction counts and storage costs.
* **Solution**: Developed a memory-optimized in-memory analytics engine inside the data collector. It calculates the top 5 co-deployed mods (frequently deployed together) and injects this metadata directly into pre-existing mod data shards.
* **Result**: Implemented complex graph-like association rule mining with **exactly zero (0) additional KV read or write operations**.

### 2. Exponential Moving Average (EMA) Server Scoring
* **Problem**: Traditional leaderboards cause rapid ranking drops during routine server restarts, leading to inaccurate metrics.
* **Solution**: Implemented an Exponential Moving Average (EMA) smoothing algorithm ($\alpha = 0.10$) for server score calculation. This weights historical performance at 90% and live statistics at 10%.
* **Result**: Eliminates rating fluctuations during maintenance, preventing false rank decays and providing a highly stable community index.

### 3. Distributed Sharding & Surgical JSON Extraction
* **Problem**: Cloudflare KV values are limited to 25MB and parsing huge JSON blobs on every request exceeds Worker CPU time limits (50ms).
* **Solution**: 
  - **Dynamic Sharding**: Mod data is distributed across multiple 5MB shards (sized optimized to avoid KV limits).
  - **Surgical Text Extraction**: Developed `findMatchingBrace`—a low-level string-scanning algorithm that slices target JSON objects directly out of raw text buffers.
* **Result**: Bypasses memory-heavy `JSON.parse` overhead, reducing global edge API latency (average ~10-15ms for cached responses).

### 4. Rich SEO & OpenGraph Engine
* **Dynamic Hydration**: Using `react-helmet-async` on React 19 to deliver context-aware Title, Description, and Rich Snippets.
* **Metadata Integrity**: Automatic rich embeds generation for Discord, Twitter/X, and search engines.

### 5. Workshop Metadata Supplement (not BattleMetrics)
* **Problem**: BattleMetrics has no mod thumbnails or declared dependencies; the official workshop has no live player telemetry.
* **Solution**: On-demand Reforger workshop scrape in Edge Workers — one HTML fetch caches thumbnail CDN URL + dependency list in KV (7d). List pages embed cached `author` / `thumbnail` / `workshopStatus` in `GET /api/mods`; row images use a resized `/thumbnail/img?w=` proxy with lazy viewport loading.
* **Result**: Workshop recognition + install requirements without duplicating the catalog or storing image files. See [docs/WORKSHOP_METADATA.md](docs/WORKSHOP_METADATA.md).

### 6. Scenario Leaderboard (Mission Popularity)
* **Problem**: Server lists show per-node `scenarioName`, but there was no view of which missions/scenarios dominate the network.
* **Solution**: Collector aggregates servers by `scenarioName` after SQE scoring and writes a compact ranking to `cache:ranking:scenarios:{game}`. Edge API serves `GET /api/scenarios`; drill-down via `GET /api/scenarios/servers?name=`.
* **Result**: One KV write per collector run, no client-side aggregation of 5000 servers. UI at `/scenarios` with **Tools** dropdown nav (Config Audit, Hosting, **Console Mod Storage**).

### 7. Console Storage Planner & Modpack Sizes
* **Problem**: PS5/Xbox players have ~25 GB Workshop space; mod count does not reflect download weight (WCS+RHS stacks vs vanilla). Switching servers forces manual deletes; shared mods (RHS, WCS) must be deduplicated.
* **Solution**: Workshop version sizes → KV `cache:mod-size:*`; collector attaches `modpackEstimatedBytes` per server; **Storage Planner** (`/storage-planner`) compares installed proxy vs wanted servers; server list shows modpack GB + console fit filters.
* **Result**: Console players see fit/over-limit before joining; server leaderboard exposes size as a dimension separate from SQE rank. See [docs/STORAGE_PLANNER.md](docs/STORAGE_PLANNER.md).

### 8. Server Uptime History & Majority-Scan Safeguard (v1.22+)
* **Problem**: Server history charts showed rank/players only; a brief restart could misleadingly imply a full day offline if naïvely bucketed.
* **Solution**: Collector stores an **online sample** per run in shared `history:*` shards (`on`/`n` for daily/weekly, `online` for hourly). Days/weeks are marked offline only when **&lt;50%** of scans saw the server up.
* **Result**: Server detail charts overlay rose offline bands on rank/players; tooltip shows uptime % or hourly scan status. See [docs/SERVER_UPTIME.md](docs/SERVER_UPTIME.md).

### 9. Client-Side Favorites (v1.22+)
* **Problem**: Players revisit the same mods and servers across list, trending, and detail — no lightweight bookmarking without accounts.
* **Solution**: `localStorage` favorites (up to 20 per game each for mods and servers), ★ on rows and detail, pinned blocks on leaderboard/trending/servers (page 1, default filters).
* **Result**: Zero backend cost; instant recall. Shared `FavoriteStarButton` component.

### 10. One-Click Mod Config Copy (v1.21+)
* **Problem**: Server owners paste `game.mods[]` blocks manually from workshop pages.
* **Solution**: `CopyModConfigButton` on mod leaderboard, trending, mod detail, and full modpack copy on server detail (`formatModConfigSnippet`).
* **Result**: Clipboard-ready `config.json` fragments with correct `modId` + `name` indent.

### 11. Surgical Mod Lookup (`mod-lookup.ts`, v1.22.1)
* **Problem**: `extractModFromChunks` could match a mod ID inside another mod's `coDeployed` array, returning a snippet without `overallRank` — mod detail showed `#-` while the list showed the correct rank.
* **Solution**: Scan all occurrences; return only **full** mod records (`overallRank` or `totalPlayers` present). Case-insensitive ID match.
* **Result**: Reliable `GET /api/mods/:id` for top mods co-deployed everywhere. Tests: `test/mod-lookup.test.ts`.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph "External Data Layer"
        BM[BattleMetrics API / Game Servers]
    end

    subgraph "Serverless Edge Infrastructure (Cloudflare)"
        CRON[Cloudflare Cron Trigger] --> |every 2h| COL[Data Scraper / TS Engine]
        COL --> |Co-deployment Analytics / EMA Scoring| COL
        COL --> |Chunking & Sharding| KV[(Cloudflare KV Store)]
        
        API[Hono Edge API / Workers] --> |Parallel Read Promise.all| KV
        API --> |Surgical Text Extraction| API
        API --> |Global Edge Caching| User((End User))
    end

    subgraph "Reactive Presentation Layer"
        WEB[React 19 / Tailwind 4 / Recharts] --> |Optimized Axios with Cache TTL| API
    end
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Architectural Intent |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Recharts, TypeScript | Interactive telemetry, lightning-fast HMR, modular UI. |
| **Backend & API** | Hono, Node.js, Cloudflare Workers | Edge-native API microservices, ultra-low TTFB, Serverless runtime. |
| **Infrastructure** | Cloudflare Pages, Cloudflare KV, Cron Triggers | Multi-region edge deployment, resilient distributed storage. |
| **Data Scraping** | TypeScript, Axios, BattleMetrics REST API | Automated hourly data pipeline, ingestion, and validation. |

---

## 📉 Core Performance Optimization Strategies

### ⚡ Global API Edge Caching
Every static asset and expensive API route utilizes Cloudflare's Cache API with optimized Cache-Control headers. The browser acts as a secondary cache layer (TTL: 1-60m), ensuring navigation is instant and 0% edge CPU overhead is wasted on repeated queries.

### ⚡ Parallel KV Batching (`Promise.all`)
Rather than sequentially loading mod shards (which previously caused 503 gateway timeouts under heavy load), the API executes asynchronous concurrent fetches, processing massive data pools parallelly at the edge.

### ⚡ Defensive State & Race Condition Prevention
Implemented global `AbortController` cancellation in React. Rapid views switching instantly aborts unresolved network tasks, guaranteeing zero UI memory leaks and correct rendering of temporal data.

### ⚡ Lighthouse / PageSpeed (production, Jul 2026)

Mod leaderboard at `https://reforgermods.com/` — [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https://reforgermods.com/) lab scores after v1.21 list-metadata optimizations:

| | Desktop | Mobile (Slow 4G) |
|--|---------|------------------|
| Performance | **100** | **98** |
| Accessibility | 98 | 94 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

TBT improved from **970 ms → 0 ms** (desktop) by collapsing ~72 per-row API calls into one `GET /api/mods`. Full before/after metrics, re-run commands: [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md).

---

## 🛠️ Local Development & Deployment

### Prerequisites
- Node.js (v20+ recommended)
- Cloudflare Wrangler CLI (`npm i -g wrangler`)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pauliusmed/armamods-leaderboard.git
   cd armamods-leaderboard
   ```

2. **Install Core & Client Dependencies**
   ```bash
   npm install
   cd web && npm install
   cd ..
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
    ```env
    PORT=3000
    BATTLEMETRICS_API_KEY=your_api_key_here
    CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
    CLOUDFLARE_ACCOUNT_ID=your_id
    WORKER_URL=https://api.reforgermods.com
    ```

4. **Launch Local Services**
   * **Backend Local Proxy Script**:
     ```bash
     npm run dev
     ```
     *(Note: This runs the local developer proxy script. The actual API gateway is implemented using Cloudflare Pages Functions located in `web/functions/api/[[path]].ts`, which execute serverless at the edge in production or via Wrangler locally).*
   * **Frontend Server**:
     ```bash
     cd web && npm run dev
     ```

---

## 🧪 Verification & Testing
To ensure the integrity of the math scoring models and surgical parser:
```bash
npm test
```
*Tested areas: `findMatchingBrace` surgical logic, `mod-lookup` co-deploy false-positive guard, EMA ranking decay, SQE bonus clamping, scenario aggregation (`buildScenarioRanking`), storage planner math, server uptime history (`server-uptime-history`), audit-config, history-query, share-meta, search-match.*

**Docs:** [walkthrough.md](walkthrough.md) (system overview) · [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) (PageSpeed scores) · [docs/ALGORITHM.md](docs/ALGORITHM.md) (ranking math) · [docs/STORAGE_PLANNER.md](docs/STORAGE_PLANNER.md) · [docs/SERVER_UPTIME.md](docs/SERVER_UPTIME.md) · [docs/UI_FILTERS.md](docs/UI_FILTERS.md) · [docs/WORKSHOP_METADATA.md](docs/WORKSHOP_METADATA.md) · [docs/PERFORMANCE.md](docs/PERFORMANCE.md) · [docs/ARCHITECTURE_DECISION.md](docs/ARCHITECTURE_DECISION.md) · [docs/README.md](docs/README.md) (index) · [CHANGELOG.md](CHANGELOG.md) (release notes through **v1.22.2**).

## 📝 License & Contact
Copyright © 2026 Paulius Medžiukevičius. Distributed under the [Creative Commons CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) License. 
For inquiries or collaborations, please reach out via GitHub or [LinkedIn](https://www.linkedin.com/in/paulius-medziukevi%C4%8Dius-003586168/).


