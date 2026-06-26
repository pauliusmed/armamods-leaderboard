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
value is telemetry — leaderboard, trending deltas, history charts, and a Reforger
1.7 config auditor.

It supports two games — **Reforger** (default) and **Arma 3** — served from the same
pipeline with game-suffixed keys.

---

## 2. System at a glance

```
BattleMetrics REST API
        │  every 2h (GitHub Actions cron)
        ▼
scripts/collector.ts  ──  ranks, trends, SQE scores, history, co-deployment
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
  functions/lib/           shared helpers (share-meta, search-match)
  src/
    api/client.ts          axios client with in-memory TTL cache
    components/            pages (ModList, ServerList, ModDetail, ServerDetail, …)
    hooks/                 useMods, useServers
    lib/                   site links, audit labels, parseServerConfig
test/                      node:test unit tests (findMatchingBrace, EMA, audit, …)
docs/                      ALGORITHM.md, architecture decisions, case study
.github/workflows/         ci, collector (cron), deploy
```

---

## 4. The data pipeline

### 4.1 Ingestion — `scripts/collector.ts`
Triggered by the `collector.yml` workflow on `cron: '0 */2 * * *'`. Two phases:

**`collect`** (run per game):
1. `BattleMetricsService.fetchAllServers()` paginates the BM API, respecting the
   120 req/min (keyed) / 60 req/min (anonymous) limits.
2. Servers are normalized — Reforger exposes `details.reforger.mods[]`, Arma 3
   exposes `details.modIds[]` / `modNames[]`.
3. Mod usage is aggregated into `serverCount` + `totalPlayers` per mod.
4. Mods are ranked: `overallRank = round((playerRank + serverRank) / 2)`.
5. **Co-deployment**: for each mod, the top 5 mods most often run alongside it are
   computed in memory and embedded directly into the mod object — **zero extra KV
   writes**.
6. **SQE scoring** (`runServerScoring`): snapshot score, EMA smoothing against the
   previous leaderboard, elite-rank inertia for the top 3, then ranks are assigned.
7. Everything is sharded into ≤5MB JSON chunks (`buildChunks`) and written to KV.

**`trending`** (run after collect):
Reads the previous history point, computes `trendScore = rankDelta × positionWeight
× activityMultiplier` (see §5), and writes `rising` / `falling` / `new` lists.

### 4.2 Storage — Cloudflare KV
All state lives in one KV namespace (`TRENDING_KV`). Keys per game (Reforger has no
suffix, Arma 3 uses `:arma3`):

| Key pattern | Contents |
|---|---|
| `cache:mods:{i}` + `:meta` | sharded mod list (rank, players, coDeployed) |
| `cache:servers:{i}` + `:meta` | sharded server list (with SQE fields) |
| `cache:ranking:servers:{game}` | top-200 SQE leaderboard |
| `cache:stats`, `cache:lastUpdate` | global counts |
| `cache:trending:{daily\|weekly\|monthly}` | precomputed trending |
| `history:{hourly\|daily\|weekly\|monthly\|yearly}:{game}:{i}` | sharded time series |

Sharding exists because KV values are capped at 25 MB; 5 MB chunks keep individual
reads well within Worker CPU/memory limits.

### 4.3 Serving — `web/functions/api/[[path]].ts`
Hono app exported as a Pages Function. Read paths follow a common pattern:

1. Check the Cloudflare **Cache API** first (`caches.open(...)`); return on hit.
2. Read the relevant KV keys, **shards in parallel** via `Promise.all`.
3. For single-record lookups (mod/server by id), avoid `JSON.parse`-ing the whole
   shard: scan the raw text for the id, then slice the object out with
   `findMatchingBrace` / `splitJsonArray`. Only the target object is parsed.
4. Set `Cache-Control` and store the response with `waitUntil(cache.put(...))`.

### 4.4 Presentation — `web/src`
React 19 SPA. `src/api/client.ts` wraps axios with a 2-minute in-memory cache and
uses `AbortController` to cancel in-flight requests on route change. Charts use
Recharts.

**Workshop metadata layer** — see [docs/WORKSHOP_METADATA.md](./docs/WORKSHOP_METADATA.md) for full design.

**UI** (`src/lib/workshop.ts`, `src/components/ui/ModThumbnail.tsx`):
- `workshopPageUrl()` — outbound link to Reforger workshop or Steam (Arma 3).
- `ModThumbnail` calls `GET /api/mods/:id/thumbnail`, caches the CDN URL client-side (7d), then loads the image **directly from Bohemia CDN** (no per-image 302 through the Worker).
- Letter fallback when no workshop preview exists.

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
| GET | `/servers` | paginated server list |
| GET | `/servers/:id` | single server detail |
| GET | `/servers/:id/history` | server rank/players time series |
| GET | `/servers/ranking` | top-200 SQE leaderboard |
| GET | `/trending/:period` | rising / falling / new |
| GET | `/diagnostics` | system health (shard counts, history range) |
| GET | `/og/preview/{mod,server}/:id` | 302 to cached workshop CDN URL (OG bots; same KV as thumbnails) |
| POST | `/audit/config` | Reforger config.json health audit |

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
extraction, EMA smoothing/clamping, audit-config heuristics, history-query
resolution, share-meta, and search matching.

---

## 10. Key engineering decisions

- **String-scan over full parse.** On hot detail endpoints, scanning raw shard text
  for an id and slicing out one object keeps Worker CPU well below the time limit
  that full `JSON.parse` of multi-MB blobs would hit.
- **Sharded, parallel reads.** `Promise.all` over shards instead of sequential gets
  removes the latency that previously caused 503s under load.
- **Compute-on-write.** Trending, SQE, and co-deployment are all precomputed by the
  collector, so the edge API only reads — no per-request computation, cacheable.
- **EMA + elite inertia.** Smoothing prevents routine restarts and off-peak hours
  from reshuffling the leaderboard; the top-3 cushion avoids noisy #1–#3 flips
  while still letting a real challenger through.
- **Local proxy ≠ production API.** `src/index.ts` only mirrors the Worker so the
  frontend can develop against realistic data; it is intentionally logic-free.
- **On-demand workshop metadata.** Thumbnails and declared dependencies are scraped
  from the Reforger workshop on first request per mod (KV 7d), not by the collector.
  One HTML fetch fills both caches; the UI resolves CDN URLs via JSON and loads images
  directly — see [`docs/WORKSHOP_METADATA.md`](./docs/WORKSHOP_METADATA.md).
