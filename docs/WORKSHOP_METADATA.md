# Workshop Metadata Layer

How the platform supplements BattleMetrics telemetry with **Reforger Workshop** data (thumbnails, declared dependencies) without duplicating the official workshop catalog.

---

## Two data sources

| Source | What it provides | Update cadence | Used for |
|--------|------------------|----------------|----------|
| **BattleMetrics** (collector) | Live players, servers, ranks, trending, co-deploy | Every ~2 hours | Core leaderboard value |
| **Reforger Workshop** (on-demand scrape) | `og:image` thumbnail URL, author-declared dependencies | On first request per mod, then KV 7d | Recognition + install requirements |

Workshop metadata is **not** written by the collector. It is resolved by the Edge API when a user (or OG bot) requests a mod.

---

## Thumbnail loading (current design)

### Problem (v1)

Early UI used `<img src="/api/og/preview/mod/:id">`. Each image request:

1. Hit our Worker
2. Received a **302 redirect** to Bohemia CDN
3. Then downloaded the image

On a list page with many mods this meant many Worker round-trips. The first request per mod could also trigger a **full workshop HTML scrape** to extract `og:image`.

### Solution (v2)

```
ModThumbnail (React)
    → GET /api/mods/:id/thumbnail  (JSON { url }, edge-cached 24h)
    → Client memory cache (7 days, deduped in-flight)
    → <img src="https://ar-gcp-cdn.bistudio.com/...">  (direct CDN, no redirect hop)
```

**We store the CDN URL in KV, not the image bytes.** This avoids R2 storage, copyright re-hosting, and extra bandwidth on our origin.

### Cache stack

| Layer | Key / TTL | Contents |
|-------|-----------|----------|
| KV | `cache:og-image:{game}:{MODID}` · 7 days | Bohemia/Steam CDN URL string |
| Edge Cache API | `armamods:mod_thumbnails` · `max-age=86400` | JSON thumbnail response |
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
| GET | `/mods/:id/thumbnail` | `{ data: { url } }` | UI `ModThumbnail` (direct CDN) |
| GET | `/mods/:id/dependencies` | `{ data: ModDependency[] }` | Mod detail dependency table |
| GET | `/mods/:id/size` | `{ data: { sizeBytes } }` | Mod detail + Storage Planner |
| GET | `/og/preview/mod/:id` | 302 → CDN URL | Discord, Twitter, OG bots |

All support `?game=reforger|arma3` (Reforger is fully supported; Arma 3 thumbnails/deps are limited).

---

## Key files

| File | Role |
|------|------|
| `web/functions/lib/workshop-fetch.ts` | Scrape, parse, KV cache, `ensureReforgerWorkshopMetadata` |
| `web/functions/lib/workshop-meta.ts` | Re-exports for tests / backward imports |
| `web/functions/lib/share-meta.ts` | OG share HTML; `resolveModPreviewImage` → workshop-fetch |
| `web/src/components/ui/ModThumbnail.tsx` | Client: JSON URL → direct `<img>` |
| `web/src/api/client.ts` | `getThumbnailUrl`, `getDependencies` + client caches |
| `web/src/lib/workshop.ts` | `workshopPageUrl()` outbound links |
| `test/workshop-meta.test.ts` | Dependency HTML parser tests |

---

## What we deliberately do **not** do

- **Store image files** in R2/KV (only URL strings) — keeps cost and ToS risk low
- **Scrape all mods** on each collector run — would hit rate limits and KV write caps
- **Replace co-deploy with dependencies** — they answer different questions
- **Batch thumbnail URLs in `/mods` list** — keeps list payload small; thumbnails load lazily per visible row

### When R2 self-hosting might make sense

Only if, after this architecture, CDN hotlinking is still too slow or blocked. That would be a separate phase (download on first resolve, serve from `*.reforgermods.com`).

---

## Related docs

- [PLAN.md](../PLAN.md) — product roadmap, Phase 2
- [walkthrough.md](../walkthrough.md) — full system overview
- [docs/ALGORITHM.md](./ALGORITHM.md) — co-deployment algorithm (BM, not workshop)
- [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) — console modpack sizes & planner
