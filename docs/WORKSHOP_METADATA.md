# Workshop Metadata Layer

How the platform supplements BattleMetrics telemetry with **Reforger Workshop** data (thumbnails, declared dependencies) without duplicating the official workshop catalog.

---

## Two data sources

| Source | What it provides | Update cadence | Used for |
|--------|------------------|----------------|----------|
| **BattleMetrics** (collector) | Live players, servers, ranks, trending, co-deploy | Every ~2 hours when collector enabled + BM PAT present | Core leaderboard value |
| **Reforger Workshop** (on-demand scrape) | `og:image` thumbnail URL, author-declared dependencies | On first request per mod, then KV 7d | Recognition + install requirements |

Workshop metadata is **not** written by the collector. It is resolved by the Edge API when a user (or OG bot) requests a mod.

> **Research (2026-08-30):** official Bohemia Workshop API exists and works without
> auth — `api-ar-workshop.bistudio.com/workshop-api/api/v3.0/` (catalog + detail +
> batch by ids). It could replace the HTML scrape below. See
> [DATA_SOURCES_RESEARCH.md](./DATA_SOURCES_RESEARCH.md). No code change yet.

> **Ops:** BattleMetrics API requires a paid subscription key since ~2026-07-20.
> If the collector is gated off, leaderboard numbers freeze on the last KV write —
> [DATA_SYNC.md](./DATA_SYNC.md).

---

## Thumbnail loading (current design)

### Problem (v1)

Early UI used `<img src="/api/og/preview/mod/:id">`. Each image request:

1. Hit our Worker
2. Received a **302 redirect** to Bohemia CDN
3. Then downloaded the image

On a list page with many mods this meant many Worker round-trips. The first request per mod could also trigger a **full workshop HTML scrape** to extract `og:image`.

### Solution (v2 — superseded for list rows)

```
ModThumbnail (React)
    → GET /api/mods/:id/thumbnail  (JSON { url }, edge-cached 24h)
    → Client memory cache (7 days, deduped in-flight)
    → <img src="https://ar-gcp-cdn.bistudio.com/...">  (direct CDN, no redirect hop)
```

v2 removed the redirect hop but still issued **one JSON request per visible row** and loaded **full-resolution** CDN images (~1280×1280 for 32×32 display).

### Solution (v3 — current)

```
GET /api/mods?limit=&offset=   → page slice includes author, thumbnail URL, workshopStatus (KV only)
ModThumbnail (list)
    → <img src="/api/mods/:id/thumbnail/img?w=64">  (resized proxy, edge-cached 7d)
    → IntersectionObserver — image fetch only when row nears viewport
```

**Detail / OG** still use full URL or `/api/og/preview/mod/:id` (302) where quality matters.

**We store the CDN URL in KV, not the image bytes.** This avoids R2 storage, copyright re-hosting, and extra bandwidth on our origin.

### Cache stack

| Layer | Key / TTL | Contents |
|-------|-----------|----------|
| KV | `cache:og-image:{game}:{MODID}` · 7 days | Bohemia/Steam CDN URL string |
| Edge Cache API | `armamods:mod_thumbnails` · `max-age=86400` | JSON thumbnail response |
| Edge Cache API | `armamods:mod_thumbnails_img` · `max-age=604800` | Resized image bytes (when CF Image Resizing available) |
| Browser (`modsApi.getThumbnailUrl`) | in-memory · 7 days | Resolved CDN URL |
| CF fetch (scrape) | `cacheEverything` · 24h | Workshop HTML (during scrape only) |

### Fallback

If no `og:image` is found, the API returns the site default `og-image.png`. `ModThumbnail` treats that as “no thumbnail” and shows a **letter avatar** (first letter of mod name).

### OG / Discord

`/api/og/preview/mod/:id` still returns **302** for social crawlers. It uses the same KV URL via `resolveModThumbnailUrl()`.

---

## Unified workshop page fetch

`ensureReforgerWorkshopMetadata()` in `web/functions/lib/workshop-fetch.ts` fetches **one** Reforger workshop HTML page and, on cache miss, fills **both**:

- `cache:og-image:…` (thumbnail CDN URL)
- `cache:mod-deps:…` (JSON dependency list)

Opening mod detail (thumbnail + dependencies) therefore triggers at most **one** workshop scrape per mod per 7 days, not two.

**Version download size** uses the same HTML parser (`parseReforgerVersionSizeFromHtml`) but is stored separately in `cache:mod-size:{game}:{MODID}` (7d). The collector warms top-ranked mods and copies sizes into mod/server shards for the Storage Planner. See [STORAGE_PLANNER.md](./STORAGE_PLANNER.md).

---

## Declared dependencies

### Source

Reforger workshop pages embed structured JSON in Next.js `__NEXT_DATA__`:

```
props.pageProps.assetVersionDetail.dependencies[]
  → { asset: { id, name }, version, dependencies: [] }
```

Parsed by `parseReforgerDependenciesFromHtml()`.

### API

`GET /api/mods/:id/dependencies?game=reforger`

- Returns direct (depth-1) author-declared dependencies
- Enriched with BattleMetrics stats (`totalPlayers`, `overallRank`, …) via KV mod lookup
- KV cache 7d; edge cache 24h
- **Arma 3**: `supported: false`, empty list (Steam scrape not implemented)

### UI

Mod detail shows two **distinct** sections:

| Section | Meaning |
|---------|---------|
| **Required Dependencies** | Workshop — technical must-haves |
| **Frequently Deployed Together** | BattleMetrics — statistical co-occurrence on servers |

Co-deploy is computed in the collector (`scripts/collector.ts`) with **zero extra KV writes** (embedded in mod shards). It must not be labeled as “dependencies”.

---

## API endpoints (workshop-related)

| Method | Path | Response | Use |
|--------|------|----------|-----|
| GET | `/mods` (page slice) | `author`, `thumbnail`, `workshopStatus` on each mod | List rows — no per-row metadata API |
| GET | `/mods/:id/thumbnail` | `{ data: { url } }` | Detail / legacy client path |
| GET | `/mods/:id/thumbnail/img?w=` | Image bytes or 302 | List `ModThumbnail` (resized) |
| GET | `/mods/:id/dependencies` | `{ data: ModDependency[] }` | Mod detail dependency table |
| GET | `/mods/:id/size` | `{ data: { sizeBytes } }` | Mod detail + Storage Planner |
| GET | `/mods/:id/workshop-status` | `{ data: { status, checkedAt } }` | UI badge — available / unavailable / unknown |
| GET | `/og/preview/mod/:id` | 302 → CDN URL | Discord, Twitter, OG bots |

All support `?game=reforger|arma3` (Reforger is fully supported; Arma 3 thumbnails/deps are limited).

---

## Key files

| File | Role |
|------|------|
| `web/functions/lib/workshop-fetch.ts` | Scrape, parse, KV cache, `ensureReforgerWorkshopMetadata` |
| `web/functions/lib/workshop-meta.ts` | Re-exports for tests / backward imports |
| `web/functions/lib/share-meta.ts` | OG share HTML; `resolveModPreviewImage` → workshop-fetch |
| `web/functions/api/[[path]].ts` | `attachCachedListFields()` — embed list metadata from KV |
| `web/src/components/ui/ModThumbnail.tsx` | Lazy `<img>`; list uses `/thumbnail/img?w=` |
| `web/src/lib/workshop.ts` | `workshopPageUrl()`, `modListThumbnailUrl()` |
| `web/src/components/ui/CopyModConfigButton.tsx` | One-click `game.mods[]` snippet copy |
| `web/src/lib/modConfig.ts` | `formatModConfigSnippet()`, server modpack formatter |
| `web/src/api/client.ts` | `getThumbnailUrl`, `getDependencies` + client caches |
| `test/workshop-meta.test.ts` | Dependency HTML parser tests |

---

## What we deliberately do **not** do

- **Store image files** in R2/KV (only URL strings) — keeps cost and ToS risk low
- **Scrape all mods** on each collector run — would hit rate limits and KV write caps
- **Replace co-deploy with dependencies** — they answer different questions
- **Store full-size CDN images on list pages** — list uses resized proxy; full URL only on detail/OG

### List metadata embedding (v1.21+)

`GET /api/mods` attaches cached `author`, `thumbnail`, and `workshopStatus` for the **current page slice only** (KV reads, no workshop scrape). This removes ~3×N per-row API calls on leaderboard/trending load while keeping the global mod payload small.

### When R2 self-hosting might make sense

Only if, after this architecture, CDN hotlinking is still too slow or blocked. That would be a separate phase (download on first resolve, serve from `*.reforgermods.com`).

---

## Workshop availability (removed / delisted mods)

Mods deleted from Reforger Workshop still appear in BattleMetrics telemetry until servers drop them. That decline often shows up as **Falling** trending — a different signal from workshop removal.

| Status | Meaning | KV TTL |
|--------|---------|--------|
| `available` | Workshop HTML contains a real `asset` record | 7 days |
| `unavailable` | HTTP 404 or page without asset data | 48 hours |
| `unknown` | Not yet checked, or transient fetch error | (not cached) |

- KV key: `cache:workshop-status:{game}:{MODID}` → `{ status, checkedAt }`
- API: `GET /api/mods/:id/workshop-status`
- Mod detail also includes `workshopStatus` + `workshopStatusCheckedAt`
- UI: **Nebe Workshop** badge on leaderboard/trending rows; banner on mod detail; Workshop CTA disabled when unavailable
- List API embeds `workshopStatus` when cached — `useWorkshopStatus` skips fetch when prop is present
- Shorter TTL on `unavailable` so mods that return to Workshop are re-checked within ~2 days

---

## Thumbnail sourcing & cost decision (2026-08-20)

**Source of truth:** every mod thumbnail originates from Bohemia's CDN
(`ar-gcp-cdn.bistudio.com`). We store only the **URL string** in KV, never the
image bytes (see "What we deliberately do NOT do"). The recurring question — *"we
already get the images from Arma/Bohemia's site, why re-serve them through our
Worker?"* — has two answers:

1. **Bandwidth.** The raw CDN originals are large (~1280×1280, 14–84 KB) while list
   rows render 32–48 px avatars. The proxy resizes via Cloudflare `cf.image` down to
   ~1.7 KB — roughly a 20× client payload saving vs. hotlinking the original.
2. **Stability & fallback.** The Worker layer adds an edge-cached (7 d) copy plus a
   letter-avatar fallback if Bohemia changes or blocks the URL, so a CDN change
   never breaks the UI.

**Decision — keep the Worker `cf.image` resize proxy (current design).**
We evaluated moving thumbnail resizing to Cloudflare edge **Image Transformations**
(`/cdn-cgi/image/...`, no Worker) to remove ~24 Worker invocations per list view.
**Rejected:** the Transformations product is a paid SKU we chose not to enable. The
existing Worker proxy already uses `cf.image` resizing, so this keeps the current
(accepted) per-image resizing cost while preserving the tiny 1.7 KB payload.

**Alternative considered & rejected:** hotlink Bohemia's CDN directly
(`ModThumbnail` → raw `thumbnailUrl`, zero Worker / zero transform cost). Rejected
to avoid the ~700–840 KB first-load payload that full-resolution originals imply.
The proxy's resizing is the cheaper option *for the client* even though it costs *on
our side*.

> Net: we deliberately pay for `cf.image` resize so end users download ~1.7 KB
> thumbnails instead of ~35 KB originals. The no-cost path exists (direct CDN
> hotlink) but was declined in favour of smaller client payloads.

---

## Related docs

- [PLAN.md](../PLAN.md) — product roadmap, Phase 2
- [walkthrough.md](../walkthrough.md) — full system overview
- [docs/ALGORITHM.md](./ALGORITHM.md) — co-deployment algorithm (BM, not workshop)
- [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) — console modpack sizes & planner
- [PERFORMANCE.md](./PERFORMANCE.md) — KV/edge/client resource usage & limits
