# Performance & resource usage

How the site uses Cloudflare KV, Edge cache, and client memory — including intentional trade-offs and known hot paths.

See also: [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) (KV sharding), [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) (lazy workshop scrape), [LIGHTHOUSE.md](./LIGHTHOUSE.md) (PageSpeed / Lighthouse scores).

---

## PageSpeed summary (production)

**2026-09-06 — server detail pages** (`/server/:id`, after INC-2026-09-06 and v1.23.25–26): mobile **71** (TBT 250 ms, LCP 6.3 s — SPA plus API round-trip), desktop **59–60** (TBT ~2.4 s). Inlining the LCP data is planned. Details: [LIGHTHOUSE.md](./LIGHTHOUSE.md) (2026-09-06 section).

**Historical** — `https://reforgermods.com/` mod leaderboard, lab scores **2026-07-09** after v1.21:

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
| **Collector** (`scripts/collector.ts`) | BattleMetrics → KV shards `cache:mods:*`, `cache:servers:*` + **precomputed hot pages** (`cache:page:*:reforger:default`, `cache:mods_search_index:reforger`) |
| **Edge API** (`web/worker.ts`) | Reads KV → JSON. Default views (`/api/mods?sort=overall&dir=asc`, `/api/servers?limit=200`) hit **1 shared precomputed key** (compute-at-write); non-default (search/sort/filter) uses Cache API + sharded read |
| **Client** (`web/src/api/client.ts`) | In-memory cache (1–5 min) + IndexedDB (`persistentCache`, stale-while-revalidate) + in-flight dedupe |

UI never talks to BattleMetrics directly.

**Paused sync:** BM requires a paid API key (since ~2026-07-20). While the collector
gate is off or KV age &gt; 3h, the UI serves the last snapshot and shows stale notices —
see [DATA_SYNC.md](./DATA_SYNC.md).

---

## Intentional trade-offs (by design)

Documented in [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md):

- **List metadata** — `author`, `thumbnail`, `workshopStatus` embedded in `GET /api/mods` page slice (KV only); rows skip per-item API when present.
- **Lazy thumbnail bytes** — list rows load the CDN original only when the row nears the viewport (`IntersectionObserver`); image transformations were removed on 2026-09-28 (larger bytes, $0 transformations) — see `COST_GUARDRAILS.md`.
- **On-demand author** — `cache:mod-author:*` filled on scrape/detail; list uses embedded author when cached.
- **Default mod list** — **precomputed** during the collector run (`cache:page:mods:reforger:default`, `web/functions/lib/precomputed-pages.ts`; 1 KV read, global to every PoP). Fallback — chunk 0 plus 75 workshop field reads.
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

### Mod list — embedded metadata (v1.21+, bundle since v1.23.32)

`attachCachedListFields()` in `web/worker.ts`:

- Since **v1.23.32** the fields are read from **one aggregated key**, `cache:bundle:modfields:reforger` (~1 KV read per request; the collector rewrites it every run) — previously there were 2–3 per-mod keys per mod (`cache:mod-author`, `cache:og-image`, `cache:workshop-status`), which cost ~50–200 reads per request on the non-default path.
- Per-mod keys remain only as a **fallback** (cold bundle, or before the first collector run after a deploy).
- Response includes `author`, `thumbnail`, `workshopStatus` — **one** `GET /api/mods` replaces ~72 row-level JSON calls (24 rows × 3).
- Policy and limits — [COST_GUARDRAILS.md](./COST_GUARDRAILS.md): new per-mod `kv.get` "ventilation" over lists is forbidden.

### Mod list — precomputed pages (v1.23.24, shared warm-up)

`web/functions/lib/precomputed-pages.ts` — `cache:page:*:*`.

- `GET /api/mods` default view (`sort=overall&dir=asc`) — collector precompute (first 4×24 with `author/thumbnail/workshopStatus`; 1 KV read, global). Fallback — the live collection path plus a `[PRECOMPUTE] miss` log.
- `GET /api/servers` default view (`limit=200`) — a single key.
- `PRECOMPUTED_TTL_SECONDS = 7200`; the Cache API remains for the non-default path.

---

### Thumbnail bytes (no resize since v1.23.45)

`/api/mods/:id/thumbnail/img` and `/api/img/proxy` were deleted (2026-09-28) — CF
Images transformations cost more than they delivered. `ModThumbnail` loads the CDN
original (URL from the list payload) or 302s through `/api/og/preview/mod/:id`;
a load error falls back to a letter placeholder. Gallery/lightbox use
`image.url` directly. Regression: larger bytes on first load (see
[COST_GUARDRAILS.md](./COST_GUARDRAILS.md)).

### Route code-splitting (v1.23.26 — all pages)

**All 21 pages** are `React.lazy()` chunks in `App.tsx` (only `Layout` and `StatusState` stay in the index bundle). Before v1.23.26 the large list pages (`ModList`, `ServerList`, `TrendingPage`, hosting pages, `StatusPage`, `ScenarioList`, `SupportPage`, `PrivacyPolicyPage`) were direct imports — every page downloaded and executed the code of every other page (PSI "Reduce unused JavaScript" ~99 KiB).

### Below-fold mounting (`DeferredSection`, v1.23.26)

`ui/DeferredSection.tsx` — `IntersectionObserver` (rootMargin 400px) plus a `minHeight` placeholder (CLS protection). `ServerDetail` below-fold sections (Similar Deployed Servers, Mod Changes, the Installed Mod Stack table) mount only when the viewport approaches them — boot does not create a thousand DOM elements. Usage: decide on conditional content before calling it (`length > 0 ? <DeferredSection> : null`), otherwise the placeholder stays empty.

**Known limit:** desktop PSI (almost no CPU slowdown) still reports ~2.4 s TBT — the largest remaining React render commit (~820 ms) plus above-fold Recharts drawing. The LCP fix is inlining server data into the HTML (planned; see the 2026-09-06 section of [LIGHTHOUSE.md](./LIGHTHOUSE.md)).

### Charts (Recharts) — direct import for critical path

`ModDetail` `Performance Timeline` imports `Recharts` **directly** (not `React.lazy`). `React.lazy` caused chunk hash mismatch after deploy → empty chart for all users until hard refresh (`ChunkLoadError` + `width(-1) height(-1)`). Keep `Recharts` in the main mod-detail chunk; `ServerDetail` chart may stay lazy (its chunk is stable). See `walkthrough.md` §10.

### Fonts

`main.tsx` imports only 6 fonts (Barlow 400/500/700/900 + JetBrains 400/700); `latin-ext` removed (14→6). `vite.config.ts` transforms `@fontsource` `font-display: swap` → `optional` (CLS 0.17→0.008). `index.css` fallback `@font-face` with `size-adjust`/`ascent-override`. `index.html` has no `preconnect` to `ar-gcp-cdn.bistudio.com` (unused preconnect removed after Lighthouse).

### PowerShell file edits

`Get-Content`/`Set-Content` without `-Encoding UTF8` corrupts `—` → `â€"` (mangled em-dash, `minus` → `âˆ'`). Use the `Edit` tool or `node fs` with `utf8` — never PowerShell for file edits.

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
| **Thumbnail bytes** | No resizing (transformations removed 2026-09-28): rows load CDN originals; lazy + placeholder mitigate | Medium |
| **Leaderboard rows** | ~24 CDN original image requests per page (lazy, viewport-gated) — no per-row author/status JSON | Low |
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
