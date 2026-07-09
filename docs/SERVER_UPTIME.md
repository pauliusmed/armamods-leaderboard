# Server uptime history

Server detail charts show **rank**, **players**, and **offline periods** derived from collector scans — not a live ping monitor.

See also: [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) (shared `history:*` shards), [ALGORITHM.md](./ALGORITHM.md) § SQE History.

---

## Problem

A single missed scan (restart, BM lag) should not paint an entire day as offline. SQE EMA already smooths *ranking*; uptime history needs a separate rule for *availability display*.

## Data model

Each collector run (~2h) records one sample per server inside the shared history point:

```json
{
  "time": "2026-07-09",
  "mods": { "...": { "p": 100, "s": 5, "r": 3 } },
  "servers": {
    "serverId": {
      "rank": 12,
      "players": 48,
      "on": 5,
      "n": 6
    }
  }
}
```

| Field | Hourly | Daily / weekly / monthly |
|-------|--------|---------------------------|
| `online` | boolean — this scan only | — |
| `on` / `n` | — | online sample count / total samples in bucket |
| `rank` / `players` | peak values in bucket (same as before) | peak values |

**Online sample** (collector): `isBmServerOnline(bmStatus) || players > 0` — same signal as `bmLastSeenAt`.

### Aggregation

- **Hourly** — overwrite slot per run; store `{ rank, players, online }`.
- **Daily / weekly / …** — `mergeServerHistorySnapshot()` sums `on`/`n` and keeps peak rank/players when multiple runs land in the same bucket.

Implementation: `web/functions/lib/server-uptime-history.ts`, wired in `scripts/collector.ts`.

## Majority offline rule

```text
uptimeRatio = on / n
mostlyOffline = uptimeRatio < 0.5   // UPTIME_OFFLINE_THRESHOLD
```

| View | Resolution | Offline shading |
|------|------------|-----------------|
| 24H | hourly | per-point tooltip only (no day bands) |
| 1M | daily | rose `ReferenceArea` when day is mostly offline |
| 1Y | weekly | same for week buckets |

Example: 1 offline scan out of 12 in a day → ratio ≈ 92% → **not** marked offline.

Legacy history rows without `on`/`n`/`online` return `uptimeRatio: null` — chart works for rank/players; offline bands appear after new collector data accumulates.

## API

`GET /api/servers/:id/history?days=`

Resolved by `history-query.ts`:

| `days` | KV key | Slice |
|--------|--------|-------|
| 1 | `history:hourly` | last 24 |
| ≤31 | `history:daily` | last N days |
| 366 | `history:weekly` (+ monthly fallback) | 52 weeks |

Response points include:

```ts
{
  time: string;
  rank: number | null;
  players: number | null;
  uptimeRatio: number | null;
  mostlyOffline: boolean;
  online: boolean | null;
}
```

Parsed in `extractServerHistory()` via `parseServerHistoryFields()`.

## UI

`web/src/components/ServerDetail.tsx`:

- `buildOfflineBands()` → Recharts `ReferenceArea` (rose fill)
- Tooltip via `uptimeTooltipLabel()` in `web/src/lib/serverUptimeChart.ts`
- Glossary explains the &lt;50% scan rule

## Related: last seen online

`bmLastSeenAt` on server shards (`cache:server_bm_last_seen:{game}`) is the **latest** scan where the server was up — shown in list/detail via `BmLastSeenHint`. Uptime history is the **time series** of the same signal.

## Tests

```bash
npm test -- test/server-uptime-history.test.ts
```

Covers merge, classify, `buildOfflineBands`, and `parseServerHistoryFields`.
