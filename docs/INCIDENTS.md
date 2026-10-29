# Incident reports

Register of operational incidents. Every entry contains a timeline, impact,
root causes and actions. Newest on top.

Format: `INC-YYYY-MM-DD-<short-slug>`.

---

## INC-2026-09-15 · collector timeout + KV 504

**Category:** data pipeline · **Impact:** medium (both snapshots were stale; the
collector never finished the Reforger chain) · **Status:** mitigated

### Root causes

1. As data volume grew, the Reforger collector exceeded `timeout-minutes: 15`;
   the dependent Arma 3 and trending jobs were skipped.
2. Cloudflare KV `PUT 504` was treated as final; retries covered only `429`.
3. The GitHub scheduler and the external fallback could create a duplicate full
   run, increasing KV write operations.

### Actions

| # | Action | Status |
|---|--------|--------|
| 1 | `collector-gate` snapshot freshness dedup (<75 min) | DONE |
| 2 | KV retry on `429`/`5xx`/network ×3 with backoff | DONE |
| 3 | Reforger timeout 15 → 25 min | DONE |
| 4 | PAT exposure reviewed with the owner — rotation not required | DONE (owner decision) |

---

## INC-2026-09-06 · edge Worker exceededMemory — server detail 503 storms

**Category:** edge · **Impact:** high (server detail pages loaded slowly or not at all; 75 errors/hour) · **Status:** closed (fix `6babe79` → 1.23.25)

### Timeline (EEST)

| Time | Event |
|---|---|
| (start unknown) | Data growth: server shards reached 16 (~80 MB for a full scan) — peak usage approached the 128 MB isolate limit gradually |
| 09-06 21:33 | A user reports "very slow loading" on `/server/40788168`; PSI report 58/100; Workers Observability: `/servers/40788168/storage`, `/mod-changes`, `/history` → 503, `outcome: exceededMemory` — three parallel requests within the same second (Lighthouse crawler) |
| 09-06 21:45 | A real visitor (Firefox, Vilnius): `/servers/40026751` ×1 plus `/servers/40392800` ×2 in the same second → all 503 exceededMemory. 75 errors / 0 successes in the window |
| 09-06 ~21:50 | Diagnosis: `ServerLookup` and the detail handlers load all 16 server shards in one `Promise.all` (~80 MB); ServerDetail calls 4 endpoints in parallel → the isolate exceeds 128 MB |
| 09-06 22:09 | Fix commit `6babe79` → push to `main` → automatic deploy |
| 09-06 22:14 | Production check: `/api/servers/40788168` 200 with `meta.indexFallback:true` (batched fallback); **5 parallel `/storage` requests — all 200** (the same scenario used to be a 503 storm) |
| 09-06 22:30 | Backup collector (`cron-job.org` at :30 UTC, run `34055115068`) on the new code — success in 12m34s; it wrote `cache:servers-index` |
| 09-06 22:55 | Check: `meta.indexFallback` is gone (the index path is active); the duplicate manual run was cancelled; **a burst of 12 parallel requests (4 endpoints × 5 servers) — all 200** (previously such a burst meant 503); an unknown id → 404 in 0.26 s with no scans |

### Impact

- The server detail APIs (`/servers/:id`, `/storage`, `/history`, `/mod-changes`) returned 503 in parallel waves — the page "loaded forever" and some sections stayed empty.
- Sequential requests did not reproduce it (which is why individual curl calls returned 200) — the failure depended on concurrency inside the isolate.

### Root causes

1. **Full scan to find one server** — `ServerLookup.loadChunks()` and the inline `/servers/:id` handler loaded every shard with `Promise.all` (~80 MB of text) before `findMatchingBrace` sliced it. A single request sat at the edge of the limit.
2. **Concurrency inside one isolate** — the ServerDetail page calls 4 endpoints at once, all following the same full-scan pattern; together they crossed 128 MB.
3. **Contributing factor:** data growth (7,636 servers → 16 shards) — the system crossed the limit gradually, without any code change.

### Actions

| # | Action | Status |
|---|--------|--------|
| 1 | Collector writes `cache:servers-index{suffix}` (serverId→shard, ~110 KB, +1 put per run) | DONE `6babe79` |
| 2 | `ServerLookup`: index path (1 shard, ~5 MB); unknown id → fast 404 without scans | DONE `6babe79` |
| 3 | Batched full-scan fallback (4 shards at a time, `console.warn` + `meta.indexFallback:true`) — zero downtime between a deploy and the first collector run | DONE `6babe79` |
| 4 | `/servers/:id` moved onto the shared `ServerLookup` (duplicate removed); `/mods/:id` batched by 4; `storage/plan` async `findById` with a 1-shard cache | DONE `6babe79` |
| 5 | Confirm the `indexFallback` marker disappears after a collector run (the index works) | DONE 09-06 22:55 — marker gone, burst 12×200 |
| 6 | **Phase 2:** mod→server reverse index for `/mods/:id` (currently batched only) | TODO (separate work, needs a design review) |
| 7 | Monitoring: Workers Observability — confirm `exceededMemory` events stopped | TODO (optional) |

---

## INC-2026-08-27 · GitHub scheduler skips 8 slots + external cron fallback

**Category:** data pipeline · **Impact:** medium (stale banner in the UI for ~7 h) · **Status:** closed (external fallback + manual run)

### Timeline (UTC)

| Time | Event |
|---|---|
| 08-27 10:43 | Manual `workflow_dispatch` — run ok in ~14 min (the last one before the incident) |
| 08-27 11:00 → 18:00 | **8 cron slots did not run** (`11:00`–`18:00`) — the GitHub Actions scheduler never delivered the `schedule` events (not `failure`; they simply did not happen) |
| 08-27 ~18:00 | `/api/health` → `staleHours=7.5 > 3` → `[STALE DATA]` banner (~7 h) |
| 08-27 18:28 | Manual `workflow_dispatch` — run ok in ~18 min; the banner disappears |
| 08-27 18:35 | The `cron-job.org` backup job is fixed and enabled |

### Impact

- The site showed the `[STALE DATA]` banner for ~7 h (`web/src/lib/siteCopy.ts` `DATA_STALE_BANNER`).
- Git history confirmed it: the last GitHub `schedule` event was 08-27 05:12; every later run was a manual `workflow_dispatch`.

### Root causes

1. **The GitHub Actions scheduler is unreliable** — `0 * * * *` (after INC-2026-08-26) can still skip hours; documented GA behaviour under load. 8 skipped slots ≈ 8 h stale (the 3 h threshold was exceeded).
2. **No external fallback existed** — the `cron-job.org` backup job was `enabled:false`, its URL pointed at a Worker webhook that no longer existed (`/api/webhook/collect` → 404, `lastStatus 4`), and the schedule was `0,4,8,12,16,20` in Vilnius time.

### Actions

| # | Action | Status |
|---|--------|--------|
| 1 | `cron-job.org` backup job fixed: `enabled:true`, URL → GitHub `workflow_dispatch` REST (`collector.yml`), `requestMethod: POST`, `extendedData.headers.Authorization: Bearer gh auth token`, schedule `UTC :30` (hourly, backing up GitHub's `:00`), `saveResponses:true` | DONE (verified: 19:30/20:30/21:30 `status=1`) |
| 2 | **RISK:** `cron-job.org` stores a temporary `gho_...` token — replace it with a long-lived fine-grained PAT (`Actions: Read/Write` on `pauliusmed/armamods-leaderboard`) | TODO |
| 3 | Stale alert (Discord `#status` when `staleHours>3`) | TODO (optional) |

---

## INC-2026-08-26 · collector skips + BattleMetrics 504

**Category:** data pipeline · **Impact:** medium (stale banner in the UI for ~5 h) · **Status:** closed (manual run)

### Timeline (UTC)

| Time | Event |
|---|---|
| 08-26 14:31 / 16:39 | Cron ok (slots late by +31–39 min) |
| 08-26 19:26 | Job `collect-arma3` **FAILED**: `HTTP 504: error code: 1106` from `api.battlemetrics.com` while paginating arma3 (`page[key]=500…`). 1106 = BattleMetrics' own Cloudflare edge origin hang. The Reforger part before it succeeded. |
| 08-26 22:31 | OK, but the 20:00 slot ran +2 h 31 min late |
| 08-26 22:00 → 08-27 02:00 | **Three cron slots did not run** (`22:00`, `00:00`, `02:00`) — GitHub Actions scheduler skips |
| 08-27 05:12 | OK (04:00 slot, +72 min) → KV `lastUpdate` 05:22–05:27 |
| 08-27 ~10:40 | `/api/health` → `staleHours=5.3 > 3` → `[STALE DATA]` banner for every visitor |
| 08-27 10:43 | Manual `workflow_dispatch` — run ok in ~14 min; the banner disappears |

### Impact

- The site showed the `[STALE DATA]` banner for ~5 h; data was roughly 4 hours older than usual.
- **No incident traces on the Worker side** (Workers Observability 08-26 18:30 → 08-27 11:30): only isolated bursts of 1–4 events on individual endpoints, no storms.
- The BattleMetrics quota and the remaining jobs were unaffected.

### Root causes

1. **BattleMetrics GET without retry** — the pagination requests in `src/services/battlemetrics.ts` have no backoff (backoff exists only for KV writes in `scripts/collector.ts:83`); one transient 504 fails the whole job.
2. **GitHub Actions scheduler skips** — `'0 */2 * * *'` slots can run +2–6 h late or not at all; documented GA behaviour under load.

**Contributing factors:** a 2 h cycle plus a 3 h stale threshold (`/api/health`) leaves a small error buffer — a single skipped slot already triggers the banner after about 4 h.

### Actions

| # | Action | Status |
|---|--------|--------|
| 1 | BattleMetrics GET retry ×3 with backoff (5xx/timeout only, not 4xx) `src/services/battlemetrics.ts:50` | DONE `4fa2b58→1.23.25` |
| 2 | Hourly cron (`0 * * * *`) `.github/workflows/collector.yml:12` — a skipped slot's "wave" is at most 1 h | DONE |
| 3 | (optional) stale threshold 3 h → 4.5 h | TODO (staying at 3 h — hourly cron is enough) |

A manual dispatch was performed while this register entry was written (impact cleared).
