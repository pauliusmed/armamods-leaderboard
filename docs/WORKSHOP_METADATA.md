# Workshop Metadata Layer

How the platform supplements BattleMetrics telemetry with **Reforger Workshop** data (thumbnails, declared dependencies) without duplicating the official workshop catalog.

---

## Two data sources

| Source | What it provides | Update cadence | Used for |
|--------|------------------|----------------|----------|
| **BattleMetrics** (collector) | Live players, servers, ranks, trending, co-deploy | Hourly when collector enabled + BM PAT present | Core leaderboard value |
| **Reforger Workshop** (on-demand scrape) | `og:image` thumbnail URL, author-declared dependencies | On first request per mod, then KV 7d | Recognition + install requirements |

Workshop metadata is **not** written by the collector. It is resolved by the Edge API when a user (or OG bot) requests a mod.

> **Research (2026-08-30):** official Bohemia Workshop API exists and works without
> auth — `api-ar-workshop.bistudio.com/workshop-api/api/v3.0/` (catalog + detail +
> batch by ids). The collector warm passes (`warmTopModSizesFromWorkshop`,
> `warmServerModpackModSizes`) now use it via `lib/workshop-api.ts` instead of
> per-mod HTML fetches (~50× fewer requests). The Edge HTML scrape below remains
> as fallback for per-request metadata. See
> [DATA_SOURCES_RESEARCH.md](./DATA_SOURCES_RESEARCH.md).

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
    → <img src="{CDN URL from data}">  (originalas; jokio resize)
    → IntersectionObserver — image fetch only when row nears viewport
```

**Detail / OG** use the same full URL or `/api/og/preview/mod/:id` (302).

**Image transformations (2026-09-28):** CF Images transformacijos pašalintos —
`/api/mods/:id/thumbnail/img` ir `/api/img/proxy` ištrinti, zonoje
`image_resizing=off`. Kaina (8 655 unikalių/mėn > 5k free) viršijo vertę.
Grąžinimas — tik su aiškiu savininko patvirtinimu ir be CF Images.
Detaliai — [COST_GUARDRAILS.md](./COST_GUARDRAILS.md).

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
| GET | `/mods` (page slice) | `author`, `thumbnail`, `workshopStatus` on each mod | List rows — no per-row metadata API |
| GET | `/mods/:id/thumbnail` | `{ data: { url } }` | Detail / legacy client path |
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
| `web/src/components/ui/ModThumbnail.tsx` | Lazy `<img>`; CDN URL from data (no resize) / `/og/preview` fallback |
| `web/src/lib/workshop.ts` | `workshopPageUrl()`, `modThumbnailUrl()` |
| `web/src/components/ui/CopyModConfigButton.tsx` | One-click `game.mods[]` snippet copy |
| `web/src/lib/modConfig.ts` | `formatModConfigSnippet()`, server modpack formatter |
| `web/src/api/client.ts` | `getThumbnailUrl`, `getDependencies` + client caches |
| `test/workshop-meta.test.ts` | Dependency HTML parser tests |

---

## What we deliberately do **not** do

- **Store image files** in R2/KV (only URL strings) — keeps cost and ToS risk low
- **Scrape all mods** on each collector run — would hit rate limits and KV write caps
- **Replace co-deploy with dependencies** — they answer different questions
- **Optimize/serve image bytes through CF Images** — pašalinta 2026-09-28; list krauna originalą lazy, full URL tik detail/OG

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

## Thumbnail sourcing — SUPERSEDED sprendimas (2026-08-20 → atšauktas 2026-09-28)

> ⛔ **Ši sekcija istorinė. Jos sprendimas BEVEIK SUVERSIANAS.**
> 2026-08-20 buvo priimta „laikyti Worker `cf.image` resize proxy".
> **2026-09-28 savininko sprendimu visos CF Images transformacijos pašalintos**
> (žr. [`COST_GUARDRAILS.md`](./COST_GUARDRAILS.md) § „Images transformations —
> pašalintos"). Šiame faile tai pat patvirtinta 64–68 eilutėse.
> **Dabartinė architektūra:** `GET /api/mods/:id/thumbnail/img` ir
> `GET /api/img/proxy` **ištrinti**, zonoje `image_resizing = off`, kodo nebeliko
> nė vieno `cf.image` / `/cdn-cgi/image` taško. Frontendas krauna originalus
> **tiesiogiai iš Bohemia CDN**. Gyvas sprendimas — žemiau.

**Tada (2026-08-20) — kodėl buvo pasirinkta proxy:** source of truth — kiekvieno
thumbnail source'as yra Bohemia CDN (`ar-gcp-cdn.bistudio.com`); KV saugome tik
**URL eilutę**, niekada ne paveikslų baitus. Du argumentai:

1. **Plaidumas.** Originalai dideli (~1280×1280, 14–84 KB), o eilutės rodo
   32–48 px avatarus. Proxy per `cf.image` sumažindavo iki ~1.7 KB — ~20×
   kliento payload sutaupoma.
2. **Stabilumas.** Worker sluoksnis pridėdavo edge-kašį (7 d.) kopiją + raidės
   fallback, jei Bohemia pakeitų arba blokotų URL.

**Tada atmesta:** tiesioginis Bohemia CDN hotlink (`ModThumbnail` → raw
`thumbnailUrl`) — atmesta dėl ~700–840 KB pirmo krovimo. **Šis atmetimas
apsiverstė 2026-09-28** ir dabar yra **priimta architektūra** (~2.4 MB mobilioji
regresija, priimta sąmoningai — `CHANGELOG.md` v1.23.45, `PLAN.md` v1.23.33
analizė). Thumbnailai lazy per `IntersectionObserver`; krovimo klaida → raidės
placeholder.

**Kas liko gyvas iš šios sekcijos:** „KV saugome tik URL, niekada ne baitus" —
tai dar galioja ir yra pagrindinis „What we deliberately do NOT do" argumentas.

**Kodėl transformacijos pašalintos:** 2026-09-28 account-wide mėnesio kaupiklis
rodė **8 655 unikalias** transformacijas (virš 5k free ribos), skaičius
struktūriškai augo su katalogu × pločiais. Tai buvo vienintelis realiai
mokamas resursų taškas projekte. Jei kada grįžtama — **tik su aiškiu savininko
patvirtinimu** ir be CF Images (dydžiai iš anksto R2, tiekiama iš edge cache).

---

## Related docs

- [PLAN.md](../PLAN.md) — product roadmap, Phase 2
- [walkthrough.md](../walkthrough.md) — full system overview
- [docs/ALGORITHM.md](./ALGORITHM.md) — co-deployment algorithm (BM, not workshop)
- [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) — console modpack sizes & planner
- [PERFORMANCE.md](./PERFORMANCE.md) — KV/edge/client resource usage & limits
