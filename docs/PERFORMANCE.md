# Performance & resource usage

How the site uses Cloudflare KV, Edge cache, and client memory — including intentional trade-offs and known hot paths.

See also: [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) (KV sharding), [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) (lazy workshop scrape).

---

## Data flow (not “live DB”)

| Layer | Role |
|-------|------|
| **Collector** (`scripts/collector.ts`) | BattleMetrics → KV shards `cache:mods:*`, `cache:servers:*` |
| **Edge API** (`web/functions/api/[[path]].ts`) | Reads KV + optional workshop scrape → JSON |
| **Client** (`web/src/api/client.ts`) | In-memory cache (1–5 min) + in-flight dedupe |

UI never talks to BattleMetrics directly.

---

## Intentional trade-offs (by design)

Documented in [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md):

- **Lazy thumbnails** — `GET /api/mods/:id/thumbnail` per visible row (small list payload).
- **Lazy workshop status** — `GET /api/mods/:id/workshop-status` per row unless `mod.workshopStatus` already on the object.
- **On-demand author** — `cache:mod-author:*` filled on scrape/detail, not on every collector run.
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

---

## Known limitations (not yet fixed)

| Area | Issue | Severity |
|------|--------|----------|
| **Mod list filter/sort** | Any non-default view loads **all** mod shards server-side | Medium |
| **Server search API** | `?search=` on `/api/servers` loads **all** server shards | Medium |
| **Leaderboard rows** | Up to ~24× thumbnail + author + workshop-status requests per page (deduped client-side) | Medium |
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
