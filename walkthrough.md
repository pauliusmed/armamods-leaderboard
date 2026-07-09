# Project Walkthrough — Arma Mods Leaderboard

A technical walkthrough of the **reforgermods.com** platform: how data flows from
BattleMetrics through Cloudflare KV and the edge API to the React dashboard. This
document is aimed at an engineer reading the codebase for the first time. For the
math behind the rankings, see [`docs/ALGORITHM.md`](./docs/ALGORITHM.md).

---

## 1. What this project does

The official Arma / Reforger Workshop ranks mods by subscription count, which says
nothing about how many people actually play with a mod. This platform **supplements**
the workshop: it ranks mods and servers by **observed player activity** from
BattleMetrics (every two hours). Workshop answers *what the mod is*; we answer
*whether anyone is running it right now*.

The UI may show workshop preview thumbnails for quick recognition, but the core
value is telemetry — leaderboard, trending deltas, history charts, scenario popularity
by active mission, Reforger 1.7 config auditor, **console storage planning**
(modpack download sizes for PS5/Xbox), mod/server **favorites**, and **one-click mod config copy**.

It supports two games — **Reforger** (default) and **Arma 3** — served from the same
pipeline with game-suffixed keys.

---

## 2. System at a glance

```
BattleMetrics REST API
        │  every 2h (GitHub Actions cron)
        ▼
scripts/collector.ts  ──  ranks, trends, SQE scores, scenario leaderboard, history, co-deployment
        │  shards into ≤5MB chunks
        ▼
Cloudflare KV  (namespace TRENDING_KV)
        │  parallel Promise.all reads
        ▼
web/functions/api/[[path]].ts  ──  Hono edge API (Cloudflare Pages Functions)
        │  surgical string extraction (no full JSON.parse on large blobs)
        ▼
React 19 + Vite + Tailwind 4 + Recharts  (web/src)
```

The repository ships **two entrypoints**, and this is the single most important
thing to understand up front:

- `src/index.ts` — a **local-only Express proxy** that mirrors the production
  Worker for frontend development. It contains no business logic (37 lines).
- `web/functions/api/[[path]].ts` — the **real edge API** (1000+ lines). This is
  where all read paths live in production.

---

## 3. Repository layout

```
src/
  index.ts                 local dev proxy → production Worker
  services/battlemetrics.ts   BattleMetrics REST client (pagination + throttling)
scripts/
  collector.ts             core ingestion engine (collect | trending CLI)
  check-*.mjs, run-audit-local.mjs   ad-hoc diagnostics for the Reforger 1.7 patch
web/
  functions/api/
    [[path]].ts            Hono API gateway (edge)
    audit-config.ts        config auditor heuristics (Reforger 1.7)
    history-query.ts       maps ?days= → KV history key + slice
    _middleware.ts         request logging
  functions/lib/           shared helpers (mod-lookup, server-lookup, server-uptime-history,
                           scenario-ranking, storage-calc, workshop-fetch, …)
  src/
    api/client.ts          axios client with in-memory TTL cache
    components/            pages + ui (ModLeaderboardHead, FavoriteStarButton, …)
    hooks/                 useMods, useServers, useModFavorites, useServerFavorites, …
    lib/                   modFavorites, serverFavorites, siteCopy, serverUptimeChart, …
test/                      node:test (mod-lookup, server-uptime-history, storage-calc, …)
docs/                      ALGORITHM, SERVER_UPTIME, UI_FILTERS, PERFORMANCE, LIGHTHOUSE, …
.github/workflows/         ci, collector (cron), deploy
```

---

## 4. The data pipeline

### 4.1 Ingestion — `scripts/collector.ts`
Triggered by the `collector.yml` workflow on `cron: '0 */2 * * *'`. Two phases:

**`collect`** (run per game):
1. `BattleMetricsService.fetchAllServers()` paginates the BM API, respecting the
   120 req/min (keyed) / 60 req/min (anonymous) limits.
2. Servers are normalized — Reforger exposes `details.reforger.mods[]` and
   `details.reforger.scenarioName`; Arma 3 exposes `details.modIds[]` / `modNames[]`
   and `map · mission` as `scenarioName`.
3. Mod usage is aggregated into `serverCount` + `totalPlayers` per mod.
4. Mods are ranked: `overallRank = round((playerRank + serverRank) / 2)`.
5. **Co-deployment**: for each mod, the top 5 mods most often run alongside it are
   computed in memory and embedded directly into the mod object — **zero extra KV
   writes**.
6. **SQE scoring** (`runServerScoring`): snapshot score, EMA smoothing against the
   previous leaderboard, elite-rank inertia for the top 3, then ranks are assigned.
7. **Scenario leaderboard** (`buildScenarioRanking`): groups servers by `scenarioName`,
   sums players, computes avg fill %, picks top server by SQE rank, assigns `rank`
   by total players. Written to `cache:ranking:scenarios:{game}` (one KV write).
8. **Mod sizes & server modpack** (`attachModSizesFromKvCache`, `warmTopModSizesFromWorkshop`,
   `attachServerModpackSizes`): copies/scrapes workshop version sizes into
   `cache:mod-size:{game}:{id}`; computes `modpackEstimatedBytes` per server for
   the leaderboard and Storage Planner.
9. **Server uptime samples** — each history point records per-server `online` (hourly)
   or merged `on`/`n` (daily/weekly) for availability charts; `bmLastSeenAt` on
   server shards for “last seen online” hints. See [docs/SERVER_UPTIME.md](./docs/SERVER_UPTIME.md).
10. Everything is sharded into ≤5MB JSON chunks (`buildChunks`) and written to KV.

**`trending`** (run after collect):
Reads the previous history point, computes `trendScore = rankDelta × positionWeight
× activityMultiplier` (see §5), and writes `rising` / `falling` / `new` lists.

### 4.2 Storage — Cloudflare KV
All state lives in one KV namespace (`TRENDING_KV`). Keys per game (Reforger has no
suffix, Arma 3 uses `:arma3`):

| Key pattern | Contents |
|---|---|
| `cache:mods:{i}` + `:meta` | sharded mod list (rank, players, coDeployed) |
| `cache:servers:{i}` + `:meta` | sharded server list (with SQE fields + `scenarioName`) |
| `cache:ranking:servers:{game}` | top-200 SQE leaderboard |
| `cache:ranking:scenarios:{game}` | scenario leaderboard (rank, servers, players, top server) |
| `cache:server_sqe:{game}` | compact SQE index for API enrichment |
| `cache:stats`, `cache:lastUpdate` | global counts |
| `cache:trending:{daily\|weekly\|monthly}` | precomputed trending |
| `cache:mod-size:{game}:{MODID}` | workshop version download size (7d) |
| `cache:server_bm_last_seen:{game}` | last collector scan when each server was online |
| `history:{hourly\|daily\|weekly\|monthly\|yearly}:{game}:{i}` | sharded time series (mods + servers incl. uptime samples) |

Sharding exists because KV values are capped at 25 MB; 5 MB chunks keep individual
reads well within Worker CPU/memory limits.

### 4.3 Serving — `web/functions/api/[[path]].ts`
Hono app exported as a Pages Function. Read paths follow a common pattern:

1. Check the Cloudflare **Cache API** first (`caches.open(...)`); return on hit.
2. Read the relevant KV keys, **shards in parallel** via `Promise.all`.
3. For single-record lookups (mod/server by id), avoid `JSON.parse`-ing the whole
   shard: scan the raw text for the id, then slice the object out with
   `findMatchingBrace` / `splitJsonArray` / `extractModFromChunks` (mod-lookup).
   Only the target object is parsed.
4. Set `Cache-Control` and store the response with `waitUntil(cache.put(...))`.

### 4.4 Presentation — `web/src`
React 19 SPA. `src/api/client.ts` wraps axios with a 2-minute in-memory cache and
uses `AbortController` to cancel in-flight requests on route change. Charts use
Recharts.

**Workshop metadata layer** — see [docs/WORKSHOP_METADATA.md](./docs/WORKSHOP_METADATA.md) for full design.

**UI** (`src/lib/workshop.ts`, `src/components/ui/ModThumbnail.tsx`):
- `workshopPageUrl()` — outbound link to Reforger workshop or Steam (Arma 3).
- `modListThumbnailUrl()` — list rows use `GET /api/mods/:id/thumbnail/img?w=` (resized proxy, `IntersectionObserver` lazy load).
- `GET /api/mods` page slice includes cached `author`, `thumbnail`, `workshopStatus` — no per-row metadata JSON on leaderboard/trending.
- Detail/OG still resolve full CDN URL via `/api/mods/:id/thumbnail` or `/api/og/preview/mod/:id` (302).
- Letter fallback when no workshop preview exists.
- **`CopyModConfigButton`** — one-click `game.mods[]` snippet on leaderboard, trending, and mod/server detail.
- **`FavoriteModButton` / `FavoriteServerButton`** — ★ bookmarks (up to 20/game each, `localStorage`); pinned rows on leaderboard, trending, and `/servers`.
- **`ModLeaderboardHead`** — shared `<thead>` + `table-fixed` column widths; favorites and main list share one table (v1.22.1 alignment fix).
- **`GalleryLightbox`** — in-page workshop screenshot preview on mod detail (v1.21).
- **`CoDeployTable`** — mod detail co-deploy shows **shared server count**, not global leaderboard stats.
- **`siteCopy.ts`** — centralized user-facing strings (“network scan”, “live network data”) instead of vendor names in UI.
- **Server detail** — rank/players chart with rose offline bands (`ReferenceArea`); `BmLastSeenHint` on list/detail.
- **Mod leaderboard** — pagination inside table card; donation block below (not between table and page buttons).

**Edge** (`web/functions/lib/workshop-fetch.ts`):
- `ensureReforgerWorkshopMetadata()` — **one** workshop HTML fetch fills both `cache:og-image:*` (thumbnail URL) and `cache:mod-deps:*` (dependencies JSON) on cache miss.
- KV TTL 7 days for both keys. Image **bytes are not stored** — only the CDN URL string.

**Dependencies** (same module):
- Parsed from Next.js `__NEXT_DATA__` on the workshop page.
- `GET /api/mods/:id/dependencies` — author-declared deps, enriched with BM stats from KV.
- Distinct from **co-deployment** (collector, BM-only) — both shown on mod detail in `ModDataTable` rows.

**Social / OG**: `/api/og/preview/mod/:id` still 302-redirects crawlers to the cached CDN URL.

SEO/OG metadata uses `react-helmet-async`.

---

## 5. Core algorithms (summary)

Detailed derivations live in [`docs/ALGORITHM.md`](./docs/ALGORITHM.md).

- **Overall rank** — average of player-rank and server-rank, tie-broken by players.
- **Trending** — `rankDelta × (100/√rank) × log10(maxPlayers+1.1)`, filtered by a
  dynamic 0.5%-of-network significance threshold.
- **SQE (Server Quality & Efficiency)** —
  `snapshotScore = players×5 − modCount + uniquenessBonus`, smoothed with an
  **EMA (α = 0.10)**: 10% new snapshot, 90% history. Offline servers fade at
  10%/run (1−α). Top-3 from the previous leaderboard get a 5% ranking-only cushion
  to stabilize the #1–#3 positions.
- **Co-deployment** — O(servers × mods) association mining, results embedded into
  mod objects for free.
- **Scenario ranking** — groups live servers by BattleMetrics `scenarioName` (Reforger
  mission or Arma 3 `map · mission`). Rank `#1` = highest total players across all
  servers running that scenario. No EMA — scenarios are aggregate snapshots, not
  persistent entities. Shared logic: `web/functions/lib/scenario-ranking.ts`.

**UI navigation:** primary nav is Mods · Servers · Trending · **Scenarios** ·
**Tools** (dropdown: Config Audit, Get Hosting, **Console Mod Storage**).
Server detail links scenario name to `/scenarios?s={name}` and modpack size to
Storage Planner (`?main=`).

### Console modpack sizes & Storage Planner

Workshop **version download size** (not BM) drives console planning. See
[`docs/STORAGE_PLANNER.md`](./docs/STORAGE_PLANNER.md) for full design.

- **Collector** writes `modpackEstimatedBytes` on each server; warms top-300 mod
  sizes into `cache:mod-size:*`.
- **Mod leaderboard** — **Size** column (sortable).
- **Server list** — **Modpack** column, console fit badges (`≤25 GB` / `Heavy`),
  filters (PS5 / Xbox / vanilla).
- **Storage Planner** (`/storage-planner`) — multi-server union, auto-download vs
  manual delete lists, server-group suggestions, similar-server alternatives.
- **SEO landing** — `/arma-reforger-console-mod-storage`.

---

## 6. API surface

All under `/api`. Game is selected with `?game=reforger|arma3`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/stats` | global totals |
| GET | `/mods` | paginated/sorted/filtered mod list |
| GET | `/mods/:id` | single mod + the servers running it |
| GET | `/mods/:id/history` | mod time series (24h/7d/30d/1y/all) |
| GET | `/mods/:id/thumbnail` | JSON `{ url }` — Bohemia CDN thumbnail (KV 7d) |
| GET | `/mods/:id/dependencies` | workshop-declared required deps (Reforger; KV cache 7d) |
| GET | `/mods/:id/size` | workshop version download size (bytes) |
| GET | `/servers` | paginated server list |
| GET | `/servers/:id` | single server detail |
| GET | `/servers/:id/storage` | modpack size breakdown (per-mod bytes) |
| GET | `/servers/:id/history` | server rank/players + uptime (`uptimeRatio`, `mostlyOffline`) |
| GET | `/servers/ranking` | top-200 SQE leaderboard |
| GET | `/scenarios` | scenario leaderboard (KV; live fallback if key missing) |
| GET | `/scenarios/servers?name=` | servers running a given scenario |
| GET | `/trending/:period` | rising / falling / new |
| GET | `/diagnostics` | system health (shard counts, history range) |
| GET | `/og/preview/{mod,server}/:id` | 302 to cached workshop CDN URL (OG bots; same KV as thumbnails) |
| POST | `/audit/config` | Reforger config.json health audit |
| POST | `/storage/plan` | console storage plan (main + wanted servers, GB limit) |
| POST | `/storage/sizes` | batch mod size lookup |

---

## 7. Infrastructure & automation

- **Hosting**: Cloudflare Pages (frontend + Functions) and KV.
- **Collector cron**: `.github/workflows/collector.yml`, `0 */2 * * *`. Runs
  Reforger collect → Arma 3 collect → Reforger trending → Arma 3 trending, with
  dependencies so Arma 3 reuses leftover BM quota.
- **CI**: `.github/workflows/ci.yml` runs the test suite on PRs.
- **Deploy**: `.github/workflows/deploy.yml` publishes to Cloudflare.

KV writes are the scarce resource on the free tier (~1000/day, ~41/run at 24
runs/day). The collector is designed around this: SQE scores are computed before
the first server write to avoid a second pass, and co-deployment adds zero writes.

---

## 8. Local development

```bash
npm install                 # root deps
cd web && npm install       # frontend deps

npm run dev                 # local proxy mirroring the production Worker
cd web && npm run dev       # Vite dev server (frontend)
```

Env vars (see `.env.example`): `PORT`, `BATTLEMETRICS_API_KEY` (optional),
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `WORKER_URL`.

Manual data runs (need the Cloudflare vars):
```bash
npm run collect                 # Reforger collection
npm run collect:arma3           # Arma 3 collection
npm run trending                # Reforger trending snapshot
```

---

## 9. Testing

```bash
npm test
```

Covers the pieces where correctness is non-obvious: `findMatchingBrace` surgical
extraction, **`mod-lookup`** (co-deploy false-positive guard), EMA smoothing/clamping,
scenario aggregation (`buildScenarioRanking`), storage planner (`storage-calc`,
`server-set-analysis`, `server-modpack`), server uptime merge/classify
(`server-uptime-history`), audit-config heuristics, history-query resolution,
share-meta, and search matching.

---

## 10. Key engineering decisions

- **String-scan over full parse.** On hot detail endpoints, scanning raw shard text
  for an id and slicing out one object keeps Worker CPU well below the time limit
  that full `JSON.parse` of multi-MB blobs would hit.
- **Sharded, parallel reads.** `Promise.all` over shards instead of sequential gets
  removes the latency that previously caused 503s under load.
- **Compute-on-write.** Trending, SQE, scenario ranking, and co-deployment are all
  precomputed by the collector, so the edge API only reads — no per-request
  aggregation on the hot path (except a one-time live fallback for scenarios until
  the first post-deploy collector run).
- **EMA + elite inertia.** Smoothing prevents routine restarts and off-peak hours
  from reshuffling the leaderboard; the top-3 cushion avoids noisy #1–#3 flips
  while still letting a real challenger through.
- **Local proxy ≠ production API.** `src/index.ts` only mirrors the Worker so the
  frontend can develop against realistic data; it is intentionally logic-free.
- **On-demand workshop metadata.** Thumbnails and declared dependencies are scraped
  from the Reforger workshop on first request per mod (KV 7d), not by the collector.
  One HTML fetch fills both caches; the UI resolves CDN URLs via JSON and loads images
  directly — see [`docs/WORKSHOP_METADATA.md`](./docs/WORKSHOP_METADATA.md).
