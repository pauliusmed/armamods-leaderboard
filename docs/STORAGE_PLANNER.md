# Storage Planner & Console Modpack Sizes

Console players (PS5, Xbox) have a fixed Workshop storage budget. Mod **count** is a poor proxy — a 72-mod WCS realism server can be ~25 GB while a 17-mod RP server might be tiny. This feature adds **download size telemetry** and planning tools on top of BattleMetrics mod lists.

**Live routes:**
- SEO landing: `/arma-reforger-console-mod-storage`
- Tool: `/storage-planner`
- Server list filters: `/servers` → `CONSOLE_FILTER`

Reforger only for sizes (workshop scrape). Arma 3 server list works; size/planner not yet supported.

---

## Console storage limits (UI presets)

| Platform | Default budget | `storageProfile` preset |
|----------|----------------|-------------------------|
| PlayStation 5 | **25 GB** | `ps5` |
| Xbox Series X | 40 GB | `xbox-x` |
| Xbox Series S | 20 GB | `xbox-s` |
| Custom | user-defined | `custom` |

PS5 was corrected from an early 30 GB assumption to **25 GB** (official Workshop allocation). Profiles stored in `localStorage` (`armamods:storage-profile:reforger`) migrate 30 → 25 automatically.

---

## Size data pipeline

### Priority when resolving a mod's `sizeBytes`

1. **Leaderboard KV** — `sizeBytes` on mod objects in `cache:mods:{i}` (copied from cache each collector run)
2. **`cache:mod-size:{game}:{MODID}`** — workshop scrape, 7-day TTL
3. **Live workshop scrape** — only for single-mod API (`GET /api/mods/:id/size`), not batch planner

Parser reads Reforger workshop HTML (`Version size` in `<dt>/<dd>`, `VersionSize` in embedded JSON, legacy text blobs). See `web/functions/lib/workshop-fetch.ts`.

### Collector (`scripts/collector.ts`)

Each run:

1. `attachModSizesFromKvCache` — copies existing `cache:mod-size:*` into mod records
2. `warmTopModSizesFromWorkshop` — scrapes workshop for **top 300** ranked mods missing cache
3. `attachServerModpackSizes` — per server:
   - `modpackKnownBytes` — sum of known mod sizes
   - `modpackEstimatedBytes` — extrapolates when some mods lack sizes (average of known)
   - `modpackCoverage` — fraction of mods with a known size

These fields are written into server shards and exposed on `GET /api/servers`.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/mods/:id/size` | Single mod download size (cache → optional live scrape) |
| GET | `/api/servers/:id/storage` | Full modpack breakdown for one server |
| POST | `/api/storage/plan` | Compare installed proxy vs wanted servers + limit GB |
| POST | `/api/storage/sizes` | Batch size lookup (workshop fetch; planner uses KV-only mode) |

### `POST /api/storage/plan` body

```json
{
  "game": "reforger",
  "mainServerId": "<id>",
  "wantedServerIds": ["<id1>", "<id2>"],
  "availableGb": 25
}
```

**`mainServerId`** — modpack treated as *already on disk* (proxy for auto-download delta).  
**`wantedServerIds`** — union of modpacks the player wants to play (deduplicated).

Response includes `analysis`: `wantedUnion`, `toDownload`, `canRemove`, `fits`, `bytesOver`, etc.

---

## Storage Planner UI (`/storage-planner`)

Three-step wizard (profile in `localStorage`):

1. **Platform** — preset + available GB
2. **Installed library (proxy)** — server you are on now (for *To download* delta)
3. **My servers** — multi-select; shared mods count once in combined total

### Server list loading

- On open, planner fetches up to **5000** servers from `GET /api/servers?full=1` (KV cache written by collector — not live BattleMetrics).
- Saved selections (`mainServerId`, `wantedServerIds`) persist in `localStorage`; **server names** are cached there too for instant labels.
- If a saved ID is not in the bulk list, the client calls `GET /api/servers/:id` (KV surgical lookup). Failure → **Not in network** (server removed from collector / offline), not infinite Loading.
- Empty browse list with selections still showing Loading usually means **API/KV empty** (local dev without collector) or **stale IDs** — clear selection and pick from search.

### Results layout (no duplicate blocks)

1. **Hero cards** — Combined modpack · Free space · To download · Status (FITS / OVER LIMIT)
2. **Server groups** (if ≥2 servers) — mod families (WCS+RHS, CIE, …), warnings, fitting subsets when over limit
3. **Less download / delete hassle** — similar servers with smaller stack (`findStorageAlternatives`)
4. **Safe to remove** — manual cleanup (mods not in any selected server)
5. **Need to download** — auto-fetched when joining

### Key client modules

| Module | Role |
|--------|------|
| `web/functions/lib/storage-calc.ts` | Union, dedupe, fit check, removable/download lists |
| `web/functions/lib/server-set-analysis.ts` | Cluster servers by mod overlap; suggest fitting subsets |
| `web/functions/lib/server-storage-similarity.ts` | Recommend similar servers with lower extra GB |
| `web/src/lib/storageProfile.ts` | Console presets + localStorage |
| `web/src/lib/serverModpack.ts` | Console fit status for server list |

### Mental model for players

| Action | Console behaviour | Planner section |
|--------|-------------------|-----------------|
| Join server | Game **auto-downloads** missing mods | **Need to download** |
| Out of space | Player **manually deletes** mods | **Safe to remove** |
| Multiple servers | Union of all modpacks must fit budget | **Combined modpack** + **Server groups** |

If **main server** has almost no overlap with wanted servers (e.g. Narcos proxy + WCS targets), *To download* will look like the full stack — set step 2 to the server you actually have installed.

---

## Server list integration (`/servers`)

Separate from SQE rank (quality/popularity):

- **Modpack** column — estimated download size (desktop `lg+`; also under **Mods** on mobile)
- **Console fit badge** — `Vanilla` · `≤25 GB` · `Heavy` (vs profile/filter limit)
- **CONSOLE_FILTER** — All · Vanilla only · Fits PS5 25 GB · Fits Xbox X/S (via `ListFilterBar` — [UI_FILTERS.md](UI_FILTERS.md))
- Sort by **MODPACK_SIZE**

Servers with unknown sizes are excluded from strict “fits” filters.

### Server detail mod stack (`/server/:id`)

- Per-mod **download size** (from `GET /api/servers/:id/storage`)
- **Size-tier filter** (Heavy ≥500 MB, etc.) to find storage hogs before switching servers
- Same `ListFilterBar` as leaderboards — see [UI_FILTERS.md](UI_FILTERS.md)
- CTA → Storage Planner with `?main={serverId}`

---

## Algorithms (summary)

### Union & fit (`analyzeStoragePlan`)

- `wantedUnion` = deduplicated mods across all wanted servers
- `toDownload` = wanted mods not in main server's modpack
- `canRemove` = main mods not in wanted union
- `fits` = `estimateTotalBytes(wantedUnion) ≤ availableBytes`

### Server groups (`analyzeServerSets`)

- Cluster selected servers with ≥65% Jaccard mod overlap
- Label clusters from mod name tags (WCS, RHS, CIE, …)
- When over limit: enumerate subsets (≤10 servers) that fit; suggest largest fitting set

### Similar servers (`findStorageAlternatives`)

For each wanted server, search network candidates (client: loaded server list) with:

- ≥45% mod overlap with reference server
- Lower *extra* bytes vs current installed + other wanted servers
- ≥50 MB savings

---

## Tests

```bash
npm test
```

- `test/storage-calc.test.ts` — size parsing, plan analysis
- `test/server-set-analysis.test.ts` — clustering, fitting subsets
- `test/server-storage-similarity.test.ts` — alternative recommendations
- `test/server-modpack.test.ts` — console fit filters

---

## Known limitations

- **Coverage** — only mods with cached/scraped sizes count precisely; estimates use average mod size
- **Installed proxy** — no direct console API; user picks a BM server as “what I have”
- **Similar servers** — MVP searches loaded server pool (up to ~5000), not a precomputed similarity index
- **Arma 3** — no workshop size scrape in planner yet

---

## Related docs

- [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) — thumbnail & dependency scrape (shared fetch path)
- [ALGORITHM.md](./ALGORITHM.md) — SQE / trending (orthogonal to storage fit)
- [CHANGELOG.md](../CHANGELOG.md) — release notes (v1.18.0+)
