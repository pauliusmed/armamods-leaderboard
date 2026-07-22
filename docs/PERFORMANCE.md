# Performance & resource usage

How the site uses Cloudflare KV, Edge cache, and client memory — including intentional trade-offs and known hot paths.

See also: [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) (KV sharding), [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) (lazy workshop scrape), [LIGHTHOUSE.md](./LIGHTHOUSE.md) (PageSpeed / Lighthouse scores).

---

## PageSpeed summary (production)

`https://reforgermods.com/` mod leaderboard — lab scores **2026-07-09** after v1.21 optimizations:

| | Desktop | Mobile |
|--|---------|--------|
| Performance | 100 | 98 |
| Accessibility | 98 | 94 |
| Best Practices / SEO | 100 / 100 | 100 / 100 |

Baseline (pre v1.21): desktop Performance **70** (TBT 970 ms), mobile **84**. Details and re-run steps: [LIGHTHOUSE.md](./LIGHTHOUSE.md).

---

## Data flow (not “live DB”)

| Layer | Role |
|-------|------|
| **Collector** (`scripts/collector.ts`) | BattleMetrics → KV shards `cache:mods:*`, `cache:servers:*` |
| **Edge API** (`web/functions/api/[[path]].ts`) | Reads KV + optional workshop scrape → JSON |
| **Client** (`web/src/api/client.ts`) | In-memory cache (1–5 min) + in-flight dedupe |

UI never talks to BattleMetrics directly.

**Paused sync:** BM requires a paid API key (since ~2026-07-20). While the collector
gate is off or KV age &gt; 3h, the UI serves the last snapshot and shows stale notices —
see [DATA_SYNC.md](./DATA_SYNC.md).

---

## Intentional trade-offs (by design)

Documented in [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md):

- **List metadata** — `author`, `thumbnail`, `workshopStatus` embedded in `GET /api/mods` page slice (KV only); rows skip per-item API when present.
- **Lazy thumbnail bytes** — list rows load `/api/mods/:id/thumbnail/img?w=` on viewport (`IntersectionObserver`), not full CDN originals.
- **On-demand author** — `cache:mod-author:*` filled on scrape/detail; list uses embedded author when cached.
- **Default mod list** — only **chunk 0** of `cache:mods` (rank view).
- **Full mod shards** — loaded when search, activity filter, or non-default sort is active ([ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) § Lazy Chunk Loading).

---

## Optimizations (implemented)

### `ServerLookup` — one shard read per request

`web/functions/lib/server-lookup.ts`

- **`ServerLookup.create(kv, game)`** loads all server shards **once**.
- **`findById`** scans in-memory text (surgical JSON extract).
- Used by **`POST /api/storage/plan`** for main + all wanted servers (was N× full KV reload).
- Single-ID routes (`GET /api/servers/:id`, storage breakdown) still use one load per request.

### Mod search — two-pass author resolution

`GET /api/mods?search=`

1. Filter by **name + id** only (no KV author reads).
2. If **zero hits** and game is Reforger → `attachCachedAuthors` on full list, then filter including **author**.

Author-only queries still cost O(mods) KV reads; name/id queries avoid that path.

### Client server list cache

`serversApi.getList` client TTL **5 minutes** (aligned with edge `Cache-Control` on `/api/servers`).

### Storage planner UI

See [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) § Server list loading — 5000 servers bulk, `localStorage` name cache, failed ID handling.

### Mod list — embedded metadata (v1.21+)

`attachCachedListFields()` in `web/functions/api/[[path]].ts`:

- For each mod in the **current page slice**, reads KV for `cache:mod-author`, `cache:og-image`, `cache:workshop-status` (parallel).
- Response includes `author`, `thumbnail`, `workshopStatus` — **one** `GET /api/mods` replaces ~72 row-level JSON calls (24 rows × 3).

### Thumbnail resize proxy

`GET /api/mods/:id/thumbnail/img?w=64|128|256`:

- Resolves CDN URL from KV, then serves via **Cloudflare Image Resizing** when available.
- Falls back to **302** to CDN if resizing is unavailable.
- Edge-cached 7 days; `modListThumbnailUrl()` builds client URLs.

### Route code-splitting

Heavy routes (`ModDetail`, `ServerDetail`, Storage Planner, Audit, Dependency Blockers) are `React.lazy()` in `App.tsx` — smaller initial JS bundle for list pages.

### Mod favorites (client-only, v1.22+)

`web/src/lib/modFavorites.ts` — no KV/API; up to 20 mod IDs per game in `localStorage`. Zero edge cost.

### Server favorites (client-only, v1.22.1+)

`web/src/lib/serverFavorites.ts` — same pattern for server IDs; pinned block on `/servers` page 1 with default filters. Missing favorites resolved via `GET /api/servers/:id` (`usePinnedFavoriteServers`).

### Mod detail lookup (`mod-lookup.ts`, v1.22.1)

`extractModFromChunks()` in `web/functions/lib/mod-lookup.ts` — avoids returning `coDeployed` snippet objects when resolving `GET /api/mods/:id`. Shared with co-deploy enrichment in the detail handler.

### Server uptime in history shards (v1.22+)

Collector adds `online` / `on` / `n` per server in `history:*` without extra KV keys. API enriches `GET /servers/:id/history` via `parseServerHistoryFields`. Details: [SERVER_UPTIME.md](./SERVER_UPTIME.md).

### Browser hints

`index.html` includes `preconnect` to `ar-gcp-cdn.bistudio.com` for faster CDN handshakes on detail/OG paths.

---

## Known limitations (not yet fixed)

| Area | Issue | Severity |
|------|--------|----------|
| **Mod list filter/sort** | Any non-default view loads **all** mod shards server-side | Medium |
| **Server search API** | `?search=` on `/api/servers` loads **all** server shards | Medium |
| **Thumbnail resize** | Without CF Image Resizing, `/thumbnail/img` 302s to full CDN size | Medium |
| **Leaderboard rows** | ~24 resized image requests per page (lazy, viewport-gated) — no per-row author/status JSON | Low |
| **Planner + /servers** | Each page fetch up to 5000 servers (mitigated by 5 min client cache) | Low |
| **ServerDetail similar** | Similar servers computed from **top 100** list fetch only | Low |
| **No per-server KV index** | `findServerById` still scans shard text (one load, not O(1) key) | Low |

Future improvement: collector-written `cache:server-by-id:{game}:{id}` for O(1) lookup.

---

## Related tests

```bash
npm test
```

- `test/server-lookup.test.ts` — `findServerInChunks`
- `test/search-match.test.ts` — `matchesModSearchByNameOrId`
- `test/storage-calc.test.ts` — planner math
- `test/server-uptime-history.test.ts` — uptime merge, offline bands
- `test/mod-lookup.test.ts` — full mod record vs co-deploy snippet
- `test/mod-config.test.ts` — config snippet formatting
