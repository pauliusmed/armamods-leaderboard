# Cost guardrails — Cloudflare resource policy

The project has to stay efficient with paid resources. This page records the
limits for each metered Cloudflare product and the only places in the code that
are allowed to spend them. New paid-operation points are added only with the
owner's approval (**Images transformations were removed on 2026-09-28**, see
below).

## Images transformations — removed

**Policy (owner decision, 2026-09-28): CF Images transformations are not used in
this project.** No `cf.image` or `/cdn-cgi/image` call remains in the code, and
the zone has `image_resizing = off` as a kill switch, so even bot traffic cannot
generate transformations.

History: on 2026-09-09 new transformation points were rejected and two legacy
endpoints (`/api/mods/:id/thumbnail/img`, `/api/img/proxy`) were kept behind a
width allowlist. That did not hold: on 09-28 the account-wide monthly counter
showed **8,655 unique** transformations (above the 5k free limit, ~240/day after
the Pages project was deleted), and the number grows structurally with catalogue
size × widths. Both endpoints were **deleted**, and the frontend now loads
originals directly from the Workshop CDN — a deliberate ~2.4 MB mobile
regression, analysed in v1.23.33. Thumbnails lazy-load through
`IntersectionObserver`, and a failed load falls back to a letter placeholder.

If optimisation ever comes back, it requires **explicit owner approval** and must
not use CF Images: pre-generate sizes into R2 from the collector and serve them
from edge cache. Cloudflare Images "variants" do not fit, because originals live
in the Workshop CDN rather than in CF Images storage.

**Browser caching (2026-11-10).** The CDN sends no `Cache-Control`, so repeat
visits relied on heuristic freshness and conditional requests. The service worker
now caches `ar-gcp-cdn.bistudio.com/image/*` with `CacheFirst` (90 days, 150
entries), and the gallery grid uses the CDN `thumb` variant. `/api/*` stays
network-only. No server-side image proxy was added: Workers Caching already runs
before the Worker, and a second proxy would add requests and a CDN hop without
reducing the bytes a new client must download.

Remaining rules:

- **`workers_dev = false`** (`web/wrangler.toml`, 2026-09-09) — the workers.dev
  subdomain is disabled. The only public site is **reforgermods.com** (zone DNS);
  no pages.dev or workers.dev duplicates are recreated.
- The old Pages project `armamods-leaderboard.pages.dev` was **destroyed on
  2026-09-09** — it served old code and generated roughly 20k transformations per
  period. Do not reconnect it.

## Workers CPU

**Policy: average < 10 ms CPU per request; total < ~500k ms/day.**

> ⚠️ **The limit has been unrealistic since 09-28.** Latest measurement
> (2026-11-20, current deploy `046dc30f`): **~880k ms/day, 21.1 ms/request average**,
> p50 2.4 ms, p90 36.8 ms, p99 394 ms, p99.9 1,073 ms, 41.7k invocations/24 h.
> Per-request CPU is **down** from the 09-30 figure (61 ms) because Workers Caching
> kept routing cheap repeats to the edge and only misses reach the Worker.
>
> **The monthly quota is the number that matters.** Workers Paid includes
> **30M ms CPU/month**. November 2026 usage reached **26.58M ms in 19.5 days**
> (957k invocations, 113 errors), which projects to **~41M ms = 138 % of quota**
> at the current rate. Rolling windows disagree by design — 1 d → 90 %,
> 7 d → 77 %, 14 d → 98 % — because of early-month crawl storms. **Overage costs
> $0.02 per extra 1M ms, so ~$0.20/month: this is a resilience signal (the 128 MB
> RAM wall, `exceededMemory`), not a money problem.**
>
> **Why, and why it matters for interpretation:** the 09-28 deploy (Workers
> Caching) cut Worker invocations by ~3.9× (50k → 17k per 24 h). Only cache misses
> reach the Worker now — the expensive requests, not the cheap ones. The average
> therefore rises mechanically while the actual cost falls.
>
> **Where the real headroom is:** the CPU counter is the only metric close to a
> free limit — **30M ms/month, currently 24.3M = 81 %**. KV reads are 2.6M/month,
> **26 %** of 10M, which is comfortable. The whole bill is ≈ $5/month (Workers
> Paid base) with $0 overage; tripling traffic would add roughly $4/month.
> **Optimisation is needed for resilience and the 128 MB RAM wall, not for money.**
>
> ⚠️ **Do not confuse the request counters.** Two different numbers:
> - **Worker invocations:** 17k/24 h ≈ **510k/month = 5 %** of the 10M/month
>   Workers request quota. This is the work `worker.ts` actually does.
> - **Zone HTTP requests:** ~230k/day ≈ **6.9M/month** — everything that reaches
>   `reforgermods.com`, including static assets that **never touch the Worker**.
>   **Do not compare this with the Workers request quota.** Which of the two is
>   billed (if either) is unclear, see the documentation contradiction below.
>
>   Cloudflare documentation **contradicts itself** here:
>   `workers/platform/pricing` says "*Requests to static assets are free and
>   unlimited*", while `workers/cache` says "*When caching is enabled, every
>   request to your Worker is charged at the standard Workers request rate,
>   including requests that are normally free: static asset requests*". **The
>   actual bill is $0** (the 2026-09-30 deploy passed with no overage), so there
>   is no basis for conclusions from the 6.9M or 510k figures. Watch the billing
>   page, not the zone.
> - **Cache HITs are still billed** at the standard request rate, but **CPU is
>   free** on them (only misses and bypasses cost CPU). That is why the 09-28
>   deploy saved CPU without changing the request quota.
>
> **Concrete unclaimed candidate:** CPU is burned not by KV reads but by scanning
> the *text* of a 5 MB shard — `findMatchingBrace` (`server-lookup.ts`) is a
> character-by-character JS loop over 5 MB, plus `chunkText.includes()` and a
> `JSON.parse` per shard. This shows up as the ~900–1,092 ms p99/max — the
> 2026-11-20 measurement still lands there (p99 394 ms, p99.9 1,073 ms). No
> tickets opened yet: replacing the loop with indexed `indexOf` needs a dedicated
> PR and full tests (brace matching is sensitive to braces inside strings and
> escapes), so it is deliberately **not** bundled with unrelated work.

- Largest sources (09-30, p95 per path): `/server/:id` **376 ms**,
  `/api/servers/:id/mod-changes` **181 ms**, `/api/servers/:id/storage` 114 ms,
  `/arma3/server/:id` 48–93 ms. `/mod/*`, `/api/mods/*/thumbnail`,
  `/api/og/preview/*` — 3–9 ms (cheap).
  (`/api/mods/:id/thumbnail/img` **no longer exists** — deleted 2026-09-28, see
  the first section; an earlier revision of this document still listed it here.)
- Before 09-28 the largest sources were `mod-changes` (~36 %; the cold path
  parsed all 12 modpack ring chunks per request) and `history` (~12 %; it read
  every shard). ~56 % of those requests came from SEO/AI crawlers (Bytespider,
  AhrefsBot, Reflectionbot) rendering the SPA. **That 56 % was harmful only
  because Workers Caching did not exist yet — every crawler request reached the
  Worker.** After 09-28 the same crawlers are served from edge cache (94 % HIT)
  and cost no CPU, so the old figure must not be reused to justify new bot rules.
- Guardrails: `robots.txt` with `Disallow: /api/`; the WAF rule
  `armamods-api-bot-guard` blocks SEO/AI crawlers on `/api/*` before the Worker
  (Googlebot and Bingbot are exempt and receive prerendered HTML). **Verified
  2026-11-20: this scope is correct and sufficient** — crawler storms on static
  assets are 94 % cache HIT and cost no CPU, so extending the rule to `/assets/*`
  would not reduce CPU (see the traps section below).
- In code: the modpack ring is cached per isolate version
  (`loadModpackDiffRing`); mod/server history reads from the tail with
  `historyCutoffPrefix` instead of every chunk; `mod-changes` responses have a 6 h
  TTL; the share prerender looks servers up through `servers-index`
  (`ServerLookup`, v1.23.47) instead of ~16 sequential shards.
- **New history or ring readers must use tail-stop** (tail chunks plus a
  `firstPointTime` cutoff). Per-request `JSON.parse` of large rings or scanning
  every shard is not allowed.
- Monitoring: Observability `$workers.cpuTimeMs` grouped by `$metadata.trigger`
  (sum and count as separate queries — combining them returns an empty
  aggregate); GraphQL `workersInvocationsAdaptive` by `scriptName`.

## KV (trending_snapshots)

**Policy: reads < 10M/month (free tier), target < 5M/month.**

- `/api/mods` non-default fields (author/thumbnail/workshopStatus) are read from a
  single aggregated `cache:bundle:modfields:reforger` key (v1.23.32) instead of
  ~22k per-mod keys.
- **The collector used to be the largest read generator** (09-16 audit): per-mod
  size and author reads over a ~22k list on every full run → ~45–50K reads/run
  (~33M/month, ~$12.50/month). v1.23.40 introduced the aggregated
  `cache:bundle:modsizes:<game>` (1 read + 1 write per run) and took authors from
  the modfields bundle. **Measured 09-17 (15 h window): 728K → 102K reads/day**
  (~3.1M/month, $0), meeting the < 5M target. Per-mod keys are still written for
  Worker fallbacks; looping reads of them are only allowed for a one-off
  bootstrap when a bundle is missing.
- **Measured 09-30 (24 h): 85,817 reads/day** (~2.6M/month, **26 %** of the 10M
  free limit) → **$0 overage**. Before the 09-28 deploy it was ~156k–269k/day;
  Workers Caching cut it by ~53 %. Average **5.05 reads per Worker invocation**.
- **Why this barely matters financially:** KV reads are free up to 10M/month and
  26 % is used. Every further "saving" has no monetary value — it matters only as
  a **proxy for CPU** (kv.get → await → parse) and as a signal of an inefficient
  path.
- **09-30 read distribution (1 % trace sampling, ~130 KV spans):**
  `cache:servers:<shard>` **38 %** · `cache:mods:meta` **32 %** ·
  `cache:mod-size:*` 12 % · og-image/history/lastUpdate ~10 % ·
  `cache:mod-alias:*` **2.3 %**.
- **Rejected "optimisations" on 09-30 (by measurement, not by code audit):**
  - *mod-sizes bundle fast path* (`applySizesFromBundle` in
    `resolveModSizesBatch`) — would save ~12 % of reads but add ~550 KB of
    `JSON.parse` per 5 min per isolate (~43 CPU-s/day, ~5 % of the CPU budget).
    **Negative net. Not opened.**
  - *alias 301 after `caches.default.match()`* (`worker.ts` ~2560) — 2.3 % of
    reads. Not worth a dedicated fix.
  - **Contradicting fact:** the code audit claimed "60–220 reads per
    `/api/servers/:id/storage` request", but the **measured average of 5.05
    reads/invocation** refutes it — leaderboard rows already carry `sizeBytes`, so
    the per-mod loop in `workshop-fetch.ts:846` is effectively unreachable.
    **Measure, do not trust the code.**
- New per-mod key "ventilation" (loops with `kv.get` per mod) is not allowed when
  adding features: consider a bundle first.
- Known phase 2 (not optimised yet): mod detail server chunk scan (~15 reads) and
  history shard scanning (~28 reads). **09-17: the full-scan history path
  `fetchModHistoryPoints` (worker.ts) was proven to cause `exceededMemory` — 19
  errors on 09-16 (5 + 14 within single minutes, when several parallel history
  requests in the same isolate together exceed 128 MB).** The fix is to read only
  tail shards for the requested `days` range, since chunks are ordered in time.

## D1

Armamods does not use D1 today (`armamdos` database, 0 rows read). If it is used
in the future, `EXPLAIN QUERY PLAN` is mandatory before deploy to confirm index
usage — a lesson from the basketballmanager incident of 37B rows read.

## Reading analytics: two traps that faked a crisis

Both were hit during the 2026-11-20 audit and each one, if trusted, would have
sent work in the wrong direction. **Always split by `requestSource` before
believing a status-code table.**

### Trap 1 — Cache API `504` is not a user-facing timeout

Account-level `httpRequestsAdaptiveGroups` showed **21,580 × 504** on
`reforgermods.com` in 24 h — 8.8 % of all responses. That looks like an outage.

It is not. Splitting by `requestSource`:

| `requestSource`       | 504  | meaning                                    |
| --------------------- | ---- | ------------------------------------------ |
| `eyeball`             | **0** | real visitors — never saw a timeout       |
| `edgeWorkerCacheAPI`  | 21,580 | Cloudflare's own `caches.default.match()` record |

Every 21,580 of them carried `cacheStatus = miss` (15,495) or `stale` (4,578).
The 504 is an **instrumentation marker for a cache lookup miss**, not an HTTP
response handed to anyone. Real eye-observation is the only column that describes
the user experience: `eyeball` had 0 × 504, 10 × 503 (`exceededMemory`), and
**88 % cache HIT**.

The same miss-marker pattern means **do not read Cache API 200/204 as success
rates either** — a `204` there is a miss on a route that answered no-content.

### Trap 2 — bot traffic is mostly free

`docs/COST_GUARDRAILS.md` used to fear SEO/AI crawlers, and 2026-11-13 looked
alarming: **355,971 AhrefsBot requests** in one day, `/assets/*` hammered.

The CPU is not there. AhrefsBot across 24 h: 66,341 requests, of which
**62,199 (94 %) were cache `hit`**. Cache HITs are billed as requests but cost
**no CPU**, so a crawl storm raises the zone request counter without touching the
metric that is actually near its limit. 2026-11-01 (161k AhrefsBot) and 11-13
were both storms that ran through HIT.

**Consequence: widening the WAF bot guard to static assets is not justified by
CPU.** It stays as it is (`docs/SEO.md` protects the Googlebot/Bingbot render
path). The WAF rule `armamods-api-bot-guard` blocking crawlers on `/api/*` is the
correct and sufficient scope.

### The one real finding — `cache.put` 413

2,824 Cache API responses returned **413** with `cacheStatus = dynamic`, on
`/server/:id` and `/mod/:id` pages. Per the [Cache API docs](https://developers.cloudflare.com/workers/runtime-apis/cache/),
`cache.put` returns 413 when `Cache-Control` forbids caching **or** the response
is too large. The affected pages still serve `200` with 16 KB to the visitor, so
impact is zero; the cost is that those pages are never cacheable and re-enter the
cold path. The exact cause (size vs. a header such as `Vary`) was **not**
determined — do not guess it. Priority: low.

## Monitoring

- Daily KV/Workers/D1 usage: GraphQL `kvOperationsAdaptiveGroups`,
  `workersInvocationsAdaptive`, `d1AnalyticsAdaptiveGroups` (token in `.env`).
- Monthly unique Images transformations (to confirm it stays at 0): GraphQL
  `imagesUniqueTransformations`.
- **Monthly CPU against the 30M ms quota** — the only metric near a free limit.
  GraphQL `workersInvocationsAdaptive` filtered by `scriptName`, window from the
  first of the month; project the rate to 30.4 days.
- **Always add `requestSource` to a `dimensions` list** when reading HTTP
  analytics. Without it, Cache API miss markers and worker subrequests are
  indistinguishable from visitor traffic (see the traps above).
- Workers Observability telemetry API
  (`/accounts/:id/workers/observability/telemetry/query`) needs a token with the
  observability scope; a token that only reads GraphQL analytics gets **403**.
  Use GraphQL for the numbers and the dashboard for event-level inspection.
