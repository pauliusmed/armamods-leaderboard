# Data Sources Research — BattleMetrics Alternatives

Status: **P0b implemented** · Date: 2026-08-30 · Owner: collector/research

**Updated 2026-09-30:** the collector's **warm passes** now use the official
Workshop API (`api-ar-workshop.bistudio.com/workshop-api/api/v3.0/`,
`web/functions/lib/workshop-api.ts`, ~50× fewer requests). See
[WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md).

**What is not finished yet:** `workshop-fetch.ts` **is still alive** — it keeps the
HTML parsers and a real `fetch()` to `reforger.armaplatform.com/workshop/{id}`
(Bohemia *pages*, not the image CDN); `storage-service.ts` →
`resolveModSizesBatch` **still uses the same `workshop-fetch.ts` scraper** when a
size is not known yet (Worker side). The accurate status is therefore:
**collector top-mod and server-modpack warm passes moved to the official API; the
Worker-side scraper path is still alive.**

Research into whether BattleMetrics alternatives exist for Reforger / Arma 3
telemetry. High-level conclusions and recommendations. **The technical analysis
(endpoints, auth flow, competitor research) is kept confidential — not committed,
see `docs-private/`.**

---

## Background

- The collector currently takes servers only from BattleMetrics
  (`src/services/battlemetrics.ts:52` — `api.battlemetrics.com/servers?filter[game]=…`).
- Since ~2026-07-20 BattleMetrics requires a **paid subscription key** (see [DATA_SYNC.md](./DATA_SYNC.md)).
- The question: can the dependency on BM be reduced by separating mod metadata
  from server telemetry.

---

## Summary

| Data group | Sources | Verdict |
|------------|---------|---------|
| **Mod metadata** (size, author, dependencies, versions, gallery, dates) | Official Bohemia Workshop data layer (no auth) | ✅ **Works, worth using instead of HTML scraping** |
| **Server telemetry** (player counts, mods on servers, ranking) | BM (primary) + Bohemia lobby runtime (future) | ⚠️ BM fallback; runtime needs a prototype |
| **Server lobby** (full: region, queue, mods) | Bohemia game runtime API | ⚠️ Needs a prototype plus Bohemia permission |
| **Player names** | Server collaboration (opt-in mod / RCON) | ❌ Not globally available without auth |

**BM's role after the research:** not the only source, but a **fallback**, a
comparison source and the history, until a 24/7 runtime collector is proven.

---

## 1. Mod metadata — official Workshop data layer (P0b)

The official Bohemia Workshop data layer (no key) returns the full mod catalogue
and detail objects with versions, dependencies, scenarios, licences, authors,
gallery and dates. **Batch lookup** returns up to 50 mods by id in one request.

The current `web/functions/lib/workshop-fetch.ts` scrapes
`reforger.armaplatform.com/workshop/<id>` HTML (Next.js `__NEXT_DATA__` + regex).
The official layer gives **the same plus more**, structured and more reliably:

| Feature | HTML scrape (now) | Official layer |
|---------|-------------------|----------------|
| Size | regex from HTML | direct field ✓ |
| Author | `__NEXT_DATA__` parse | `author` ✓ |
| Description | `summary`/`description` | `summary`/`description`/`license` ✓ |
| Gallery | `previews`/`screenshots` parse | `previews` + `screenshots` ✓ |
| Dates | parse | `createdAt`/`updatedAt` ✓ |
| Dependencies | `__NEXT_DATA__` parse | `dependencies[]` ✓ |
| Status (available) | 404 / HTML sniff | HTTP 404 / `blocked`/`unlisted` ✓ |
| Version history | ✗ | `versions[]` ✓ |
| Scenarios | ✗ | `scenarios[]` ✓ |
| Batch lookup | ✗ (one HTML per mod) | `ids[]` up to 50 ✓ |

The collector's `warmTopModSizesFromWorkshop` and `warmServerModpackModSizes`
(`scripts/collector.ts`) make one HTTP request per mod; with batching that is up to
50× fewer.

---

## 2. Server telemetry — BM fallback plus a future runtime

### Today

- **BM** — the only working server telemetry source (player counts, mods on
  servers, ranking). It costs a paid key.

### Future (P2 research, not now)

- The Bohemia game runtime API (lobby) returns richer data (region, queue, mods,
  cross-platform), but requires:
  - a **continuous or periodic collector** in an Enfusion runtime environment
    (not necessarily the full graphical game in a menu window — a prototype has
    to prove that),
  - **proof of stability** (auth session lifetime is undocumented),
  - **written Bohemia permission** for a commercial service.
- Until that is proven, BM remains primary.

### A2S (Steam server query)

- An **enrichment layer** for already-known hosts, not a primary source.
- Practical test (8 servers): A2S_INFO answered for 1/8 (and only on a different
  port); A2S_PLAYER — 0/8 names. The rest timed out (closed/NAT).
- Reforger does not use Steam master server discovery.

---

## 2b. What we do NOT get (data gap vs the Bohemia lobby)

Our current source (BM) plus A2S **does not provide** these Bohemia lobby fields
that a third-party collector has. The gap exists until we have Bohemia runtime
access.

| Data | BM | A2S | Bohemia lobby (their collector) | Consequence for us |
|------|----|-----|-------------------------------|--------------------|
| Server **FPS** | ❌ | ⚠️ sometimes | ✅ | We lack it; does not rank mods — low value |
| Player **names** | ❌ | ❌ (0/12) | ✅ | We lack them; not product value |
| **Queue** size | ❌ (total only) | ❌ | ✅ | We lack it separately |
| **Region / ping site** | ⚠️ region? | ❌ | ✅ `pingSiteId` | Partial |
| **Cross-platform** (PC/XBL/PSN) | ❌ | ❌ | ✅ `supportedClients` | We lack it |
| **Direct join code** | ❌ | ❌ | ✅ `directJoinCode` | We lack it |
| **Host type** (CommunityDs) | ❌ | ❌ | ✅ `hostType` | We lack it |
| **lastChanged** | ❌ | ❌ | ✅ | We lack it |
| Mods on the server | ✅ | ❌ | ✅ | **We have it** (BM) ✓ |
| Player count | ✅ | ⚠️ | ✅ | **We have it** (BM) ✓ |
| Server name / map | ✅ | ⚠️ | ✅ | **We have it** (BM) ✓ |

**Important:** the missing fields (FPS, names, queue, cross-platform, direct join,
host type) are **Bohemia lobby raw data**, reachable only through the same auth
path as names (§3, §Recommendations). They **cannot** be obtained:
- through BM (it does not expose these fields),
- through A2S (unreliable — FPS only sometimes, names 0/12),
- through the Workshop API (mod metadata only).

**Does this block the product? No.** Mod statistics (whose value is ranking and
mod popularity) rest on **mods, player counts and server counts** — all of which
we have from BM. FPS/names/queue are server-page niceties, not the mod signal.

**How the gap would close (future):**
- a Bohemia runtime prototype (would guarantee lobby fields; names unclear),
- Bohemia permission (roster plus all fields),
- an opt-in server mod (FPS, names — only for our own or partner servers).

---

## 3. Player names

| Method | Third-party servers | Needs permission | Reliability |
|--------|---------------------|------------------|-------------|
| Bohemia lobby / Room | ✅ | — | Shows only the player **count**, not names |
| A2S_PLAYER | For some | ❌ | Unreliable: often no response / no names |
| RCON `#players` | ❌ | ✅ RCON key | High |
| **Server Enfusion mod** | ❌ | Server installs the mod | **Highest** |

**The optimal combination:**
1. Try A2S_PLAYER for public servers (best effort, low priority).
2. If that fails → show the player count only.
3. Offer server owners an opt-in **"verified server" mod** or read-only RCON.
   The official PlayerManager provides `GetPlayers()`, `GetPlayerName()`, `GetPlatformKind()`.
4. **Show names live only, never store them long** — personal data (privacy policy).

Names are not the core value of the mod statistics product — **deferred**.

### Public evidence from a third-party site (2026-08-30, no auth)

Their public page/JS reveals these facts (their own published content):

- **Detail page text:** *"Server discovery data is retrieved from the backend
  used by Arma Reforger and cached briefly; player counts are near-live."* → discovery
  comes from the Bohemia backend through their collector; the cache is short-lived.
- **`server-detail.js` comment:** *"the browser never calls Bohemia directly"* →
  every upstream call happens in their backend, not in the browser.
- **Names section (`/players`):** *"Live player names are fetched on demand and are not
  stored"* plus `fetchedAt` shown to the user and `available:false` → "Live player data is
  unavailable". That indicates a **live, on-demand** roster from their collector.
- Practical test: `/players` returned **a full 128+9** (a limit of 10 was an earlier
  wrong conclusion — it came from our own `slice(0,10)`).

**What it proves:** their names come through their own backend→Bohemia collector; the
data is live. **What it does not prove:** the exact auth mechanism of their collector
(runtime game / private HTTP client / Bohemia permission) — their public content does
not reveal it. Their "not affiliated" statement does not mean permission is absent.

### Additional evidence — their fields and liveness (2026-08-30)

**Bohemia-specific fields in their server data:**
`pingSiteId` (london), `directJoinCode`, `hostType` (CommunityDs), `supportedClients`
(PC/XBL/PSN), `present`, `visible`, `lastChanged`, `queueMax`, `fps` (40).
These fields are part of the Bohemia lobby `Room` object — neither A2S nor BM
provides them. That is a strong signal that they read the Bohemia lobby through a
client-context request.

**Collection frequency (from `activity`):**
`samples24h: 939` ≈ a **~92 s interval**; `samples7d: 3014` ≈ ~3.3 min on average.
That indicates continuous snapshot collection from Bohemia.

**Proof of a live roster (26 s test):**
Comparing two `/players` calls 26 s apart: `queue` 6→4 and the set of names
changed — `hillnut`/`Louie2024` left, `mivaniec`/`Oliminator_99` joined.
`fetchedAt` was "now" (0–13 s delta). That is an on-demand, **live** roster from
their collector→Bohemia — not a cache, not A2S (A2S_PLAYER was 0/12 in our test).

**What it means for us:** their method is confirmed to be the Bohemia lobby through
their collector, but the exact auth mechanism remains their secret. We cannot
replicate it without EULA risk or Bohemia permission.

---

## Recommendations

**BM's role:** fallback, comparison and history. Do not build the most important
features on BM alone.

### Priority: P0b (Workshop API) is done; history already works

**BM snapshot history is ALREADY being collected** (hourly/daily/weekly on the
hourly cycle) — that yields firstSeen, trend and activity. A more frequent snapshot
is not a priority (see P0a below).

### P0a — BM server snapshot history (DEFERRED — a more frequent snapshot is not needed)

The existing KV history (hourly/daily/weekly/monthly/yearly, collector hourly)
already provides firstSeen, trend and activity. **A more frequent snapshot (every
5–15 min) is NOT NEEDED** — decision of 2026-08-30. The R2 research is recorded as a
future proposal:

**R2 as history storage (research conclusion, not implemented):**
- R2 free tier: 10 GB, 1M Class A / month (writes), 10M Class B (reads).
- **Per-server objects every hour would exceed the limit** (120k/day ≈ 3.6M/month) — do NOT do it.
- **One aggregated object per snapshot** (the whole moment, ~220 KB) — only 24/day, never
  exceeds the limit; it would unlock 5-minute snapshots without limits.
- Migration means rewriting the edge read logic — only when a real need appears
  (a finer 24 h curve, or a more precise trend).

### P0b — ✅ DONE (2026-08-30, source confirmed 2026-09-30)

2. ✅ **HTML scraping replaced by the official Workshop layer** — `web/functions/lib/workshop-api.ts`
   (catalog + detail + batch by ids), used by `warmTopModSizesFromWorkshop` and
   `warmServerModpackModSizes` instead of per-mod HTML (`~50×` fewer requests).
3. ⬜ **Remaining:** API: add `source`, `observedAt`, `stale` to distinguish sources.

### Deferred

4. **Names** — not product value.
5. **Bohemia lobby runtime prototype** — an experiment, not a business assumption.

### P4 — long-term advantage

6. **Opt-in server telemetry mod/agent** (Enfusion REST event batches) —
   verified server analytics. Data a competitor cannot easily have without the
   server community's consent.

### Legal boundary

- The Arma Reforger EULA forbids reverse engineering network services and commercial
  use of the game without permission. Comply: **do not** copy auth tokens, **do not**
  replicate unpublished backend endpoints, **do not** redistribute mod files.
- Metadata indexing plus links is lower risk, but for a commercial API it is worth
  obtaining written Bohemia approval (Business & Licensing).
- Player ID/name history can be personal data — aggregate it or store it briefly.
- This is not legal advice.

---

## Related documents

- [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) — the current scrape layer
- [DATA_SYNC.md](./DATA_SYNC.md) — BM paid API, collector
- [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) — the "Direct Enfusion Telemetry" vision (line 94)
- [ALGORITHM.md](./ALGORITHM.md) — ranking logic
- `docs-private/` — confidential technical analysis (not committed)
