# Architecture decision: KV-based time-series history

Why history lives in Cloudflare KV instead of D1: the shard layout, the point
format and the read strategies built on top of it.

## Problem

Using standard SQL (D1) for historical data in the Arma Reforger Leaderboard runs
into Cloudflare D1's free limits:

- SQL write limit: 100,000 per day.
- Every mod (~3,000) needs its own SQL row every hour.
- 3,000 mods × 24 h = 72,000 SQL writes per day for history alone, which leaves
  very little room for any other update.

## Decision: 100% KV-native architecture (0 SQL)

To stay clear of limits and keep reads fast, the project dropped the SQL (D1)
database entirely:

1. **No SQL at all.** Nothing is written to or read from D1. All operation limits
   are zero, so the project can grow without hitting a database ceiling.
2. **KV time-series (history).** Historical data is written hourly into master
   JSON packs:
   - `history:hourly`: last 24 hours at high resolution.
   - `history:daily`: last 31 days (peak aggregation with a sliding window).
   - `history:weekly`: last 52 weeks (peak per week, timestamp = Monday UTC).
   - `history:monthly`: last 12 months (1Y fallback until the weekly series fills).
   - `history:yearly`: last 5 years.
3. **Aggregated trending API.** Instead of SQL joins, trending compares two JSON
   points directly in KV, which saves hundreds of milliseconds per request.
4. **Staying under the 25 MB KV value limit** by automatic sharding (5 MB blocks).
5. **Shared mod and server history** (since v1.6.0). Server SQE ranks live in the
   same history point as mod statistics, which removes the separate
   `history:server_scores` blob and saves KV operations.

## KV data structure

```
cache:mods[:0..N]          — Mod list with ranks (sharded, 5 MB per block)
cache:mods:meta            — Shard metadata { total, chunks }
cache:servers[:0..N]       — Server list with SQE data (sharded, 5 MB per block)
cache:servers:meta         — Shard metadata
cache:stats                — Global counters { totalMods, totalPlayers, totalServers }
cache:lastUpdate           — ISO timestamp of the last refresh
cache:trending:daily       — 24 h trending, pre-calculated
cache:trending:weekly      — 7 d trending, pre-calculated
cache:trending:monthly     — 30 d trending, pre-calculated
cache:ranking:servers      — TOP 200 server leaderboard
cache:ranking:scenarios:{game} — Scenario leaderboard (rank, serverCount, totalPlayers, topServer)
cache:server_sqe:{game}    — Compact SQE index for API enrichment
cache:mods_search_index:reforger — Description search index (name+author+summary+desc snippet; collector warm)
cache:server_bm_last_seen:{game} — Last collector scan that saw the server online
cache:server_modset:{game} — Daily modlist fingerprint (serverId → sorted mod ids)
cache:og-image:*           — Workshop thumbnail CDN URL (on demand, 7 d)
cache:mod-deps:*           — Workshop dependency JSON (on demand, 7 d)

history:hourly:game[:0..N] — Mod + server history (12 points, hourly)
history:daily:game[:0..N]  — Mod + server history (31 points, daily peak)
history:modpack_diff:game[:0..N] — Sparse daily added/removed (30 d; see MODPACK_DIFF.md)
history:weekly:game[:0..N] — Weekly aggregation (52 points, 1Y chart)
history:monthly:game[:0..N]— Monthly aggregation (12 points, fallback)
history:yearly:game[:0..N] — Yearly aggregation (5 points)
```

Every history point has this shape:

```json
{
  "time": "2026-05-14",
  "mods": { "modId": { "p": 100, "s": 5, "r": 3 } },
  "servers": {
    "serverId": {
      "rank": 5,
      "players": 32,
      "online": true,
      "on": 5,
      "n": 6
    }
  }
}
```

- **Legacy** server entries may be a bare number (`"serverId": 5`); the API still
  accepts that form.
- **Uptime** (`online` hourly; `on`/`n` daily and above): see
  [SERVER_UPTIME.md](./SERVER_UPTIME.md) (v1.22+).

## API optimisation strategies

1. **Surgical JSON extraction.** Detail pages use `findMatchingBrace` with brace
   counting to cut a single object out of a large JSON string without a full
   `JSON.parse`.
2. **Mod lookup (`mod-lookup.ts`, v1.22.1).** `extractModFromChunks` looks for the
   full mod record (`overallRank` / `totalPlayers`) and skips `coDeployed`
   snippets inside other mods' JSON, so the mod detail rank matches the
   leaderboard.
3. **Text scanning.** History endpoints scan raw text with `indexOf` and skip the
   full parse, keeping CPU below 5 ms.
4. **Edge caching (Cache API).** Used on every endpoint with per-route TTLs
   (5 min to 1 h).
5. **Lazy chunk loading.** List endpoints load only the first block for the
   default view; the full payload is used for search only.

Full resource map, known limits and the `ServerLookup` optimisation:
[PERFORMANCE.md](./PERFORMANCE.md).

## Advantages

- **Edge-level speed.** KV is served from the edge, so users read from the
  nearest location instead of a distant SQL database.
- **No write errors.** No "database locked" failures, which were common while D1
  was in beta.
- **Unbounded growth.** A growing mod catalogue no longer affects capacity.
- **Lower KV budget.** Sharing server and mod history saves roughly two KV
  operations per collector run.

## Change history

- 2024-03-29: initial SQL → KV migration decision.
- 2026-05-13: peak aggregation, sharding, surgical JSON extraction.
- 2026-05-14: server history merged into mod history, removing the separate
  `history:server_scores` blob.
- 2026-06-30: scenario leaderboard (`cache:ranking:scenarios:{game}`), aggregated
  during the collector run; the API is read-only.
- 2026-07-09: server uptime samples (`on`/`n`/`online`) inside the shared
  `history:*` structure, enabling offline shading without extra KV keys.
- 2026-07-10: `mod-lookup.ts` finds the full mod object inside a shard instead of
  a co-deployment snippet.
