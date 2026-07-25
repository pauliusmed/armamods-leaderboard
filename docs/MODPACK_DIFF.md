# Server modlist change tracking

Daily diffs of each server’s installed mod IDs — **Added / Removed** on the server detail page.

See also: [DATA_SYNC.md](./DATA_SYNC.md) · [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) · [CHANGELOG.md](../CHANGELOG.md) **v1.22.12**.

---

## Behaviour

1. Collector runs (~2h). On the **first successful run of each UTC day**, after server shards are written:
   - Load previous fingerprint `cache:server_modset:{game}`
   - Diff each server’s current mod IDs vs previous day
   - Append a sparse day blob to `history:modpack_diff:{game}` (only servers with non-empty added/removed)
   - Write the new fingerprint
2. Retention: **30 days** (ring `slice(-30)`).
3. UI: server detail → **Mod Changes** with **7D / 30D** calendar windows.
4. First day after deploy only **bootstraps** the fingerprint — no diffs until the next UTC day.

## Incomplete BattleMetrics listings

If the current listing is empty while the previous had mods, or drops below **30%** of a previous set of ≥10 mods, that server is **skipped** for that day (avoids false mass-removes).

## KV keys

| Key | Contents |
|-----|----------|
| `cache:server_modset:{game}` | `{ date, servers: { serverId: string[] } }` — sorted mod ids |
| `history:modpack_diff:{game}:{i}` + `:meta` | Ring of `{ time, servers: { id: { a, r } } }` |

`a` / `r` = `{ id, name }[]`. Empty days / unchanged servers are omitted.

Writes: a few KV puts **once per game per day** (not per server).

## API

```
GET /api/servers/:id/mod-changes?game=reforger|arma3&days=7|30
```

```json
{
  "data": [
    {
      "date": "2026-07-25",
      "added": [{ "id": "…", "name": "…" }],
      "removed": [{ "id": "…", "name": "…" }]
    }
  ],
  "meta": { "days": 7, "retention": 30, "tracking": true, "daysAvailable": 12 }
}
```

`tracking: false` until the first history shard exists.

## Out of scope (later)

Trending Intel tab for network-wide “most added / removed” — separate from Rising/Falling rank churn.
