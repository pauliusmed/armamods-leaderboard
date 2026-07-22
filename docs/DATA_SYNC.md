# Data sync, BattleMetrics API & stale UI

How live network data enters the site, what broke in July 2026, and how the UI behaves while the collector is paused.

See also: [walkthrough.md](../walkthrough.md) §4–7 · [PERFORMANCE.md](./PERFORMANCE.md) · [SERVER_UPTIME.md](./SERVER_UPTIME.md) · [CHANGELOG.md](../CHANGELOG.md) **v1.22.8**.

---

## Pipeline (happy path)

```
BattleMetrics API  →  scripts/collector.ts (GitHub Actions cron ~2h)
                   →  Cloudflare KV (TRENDING_KV)
                   →  Pages Functions /api/*
                   →  React UI
```

The browser **never** calls BattleMetrics. Lists, trending, and charts are KV snapshots.

| Piece | Location |
|-------|----------|
| Cron workflow | `.github/workflows/collector.yml` |
| Ingestion | `scripts/collector.ts` |
| BM client | `src/services/battlemetrics.ts` |
| Last sync timestamp | KV `cache:lastUpdate` / `cache:lastUpdate:arma3` |
| Health | `GET /api/health` → `checks[game].lastUpdate`, `staleHours`, `isStale` (>3h) |

---

## BattleMetrics API (required since ~2026-07-20)

BattleMetrics announced that **all** API requests need an authorized key backed by an **active paid subscription** (Basic ~$1/mo includes API Access).

| Before | After |
|--------|--------|
| Anonymous / free listing often worked | Unauthenticated → **403** (Cloudflare / BM) |
| `BATTLEMETRICS_API_KEY` optional | **Required** for collector (local + GitHub) |

Secrets:

1. Create a Personal Access Token on BattleMetrics (subscriber).
2. GitHub: `gh secret set BATTLEMETRICS_API_KEY`
3. Local: `.env` → `BATTLEMETRICS_API_KEY=…` (see `.env.example`)

Cloudflare Pages secrets do **not** need this key unless a Function calls BM directly (they do not today).

---

## Collector SWITCH

While there is no funded BM key, scheduled collects would only fail (403) and spam Actions.

**Gate:** `.github/workflows/collector.yml` → job `collector-gate`:

```yaml
# >>> SWITCH: change false → true when BM API key is funded <<<
run: echo "enabled=false" >> "$GITHUB_OUTPUT"
```

| `enabled` | Behaviour |
|-----------|-----------|
| `false` | `collect-*` / `trending-*` jobs **skip** (cron may still appear as a short green/skipped run) |
| `true` | Normal Reforger → Arma 3 collect → trending pipeline |

Manual `workflow_dispatch` is also gated by the same flag.

---

## Stale UI (v1.22.8)

When `/api/health` reports `isStale` (snapshot older than **~3 hours**):

| Surface | Behaviour |
|---------|-----------|
| `DataStaleBanner` | Amber bar under header + Support/Donate |
| Mods / Servers / Scenarios heroes | `Snapshot as of … · not live` |
| Trending | Stale note (or `meta.lastUpdated` when fresh) |
| Footer | Sync line → paused / last age |
| Mod & server detail **charts** | Empty state: “No chart data” / live sync paused (old curves hidden) |

Hook: `web/src/hooks/useDataFreshness.ts` (caches `/api/health` ~60s, dedupes in-flight).

Copy: `web/src/lib/siteCopy.ts` (`DATA_STALE_*`, `CHART_NO_DATA_*`).

When the collector runs successfully again and age &lt; 3h, notices disappear automatically.

---

## Fundraising goal

Live sync needs ~$1/mo BM Basic. The site frames this as a **community pool** (not a personal tip jar) in `web/src/lib/donation.ts`:

| Constant | Value |
|----------|--------|
| `DONATION_GOAL_USD` | **25** (~1 year of Basic for everyone) |
| `DONATION_RAISED_USD` | update manually when donations land |
| Voice | “Community Sync Fund” / “Chip in” / shared benefit |

Used by `DonationCard`, `SupportPage`, Layout CTA, stale banner, Config Audit donate banner.

---

## Re-enable checklist

1. Subscribe to BattleMetrics (Basic+) and create PAT.
2. `gh secret set BATTLEMETRICS_API_KEY`
3. Set collector-gate `enabled=true`, commit + push.
4. `gh workflow run "Arma Mods Collector"` (or wait for cron).
5. Confirm `/api/health` → `isStale: false` and UI banner gone.
