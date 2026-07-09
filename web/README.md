# Frontend (`web/`)

React 19 SPA for [reforgermods.com](https://reforgermods.com) — mod/server leaderboards, trending, scenarios, storage planner, and config audit.

Production API: Cloudflare Pages Functions in `functions/api/[[path]].ts` (not the root `npm run dev` proxy).

## Commands

```bash
npm install          # from web/
npm run dev          # Vite dev server (default :5173)
npm run build        # tsc + production bundle → dist/
npm run preview      # serve dist locally
```

Root repo tests (`npm test` from project root) cover shared logic under `functions/lib/` and `test/`.

## Structure

```
src/
  components/       pages (ModList, ServerList, ModDetail, …) + ui/
  hooks/            useMods, useServers, useModFavorites, useServerFavorites, …
  lib/              favorites, siteCopy, modConfig, serverUptimeChart, …
  api/client.ts     axios + in-memory TTL cache
functions/
  api/              Hono edge API (production)
  lib/              mod-lookup, server-lookup, storage-calc, …
```

## Key UI patterns (v1.22.1)

| Feature | Files |
|---------|--------|
| Mod favorites | `modFavorites.ts`, `useModFavorites`, `FavoriteModButton` |
| Server favorites | `serverFavorites.ts`, `useServerFavorites`, `FavoriteServerButton` |
| Shared ★ button | `FavoriteStarButton.tsx` |
| Mod table headers | `ModLeaderboardHead.tsx` + `SortableTh` (`mirrorBar` on Share) |
| Filters toolbar | `ListFilterBar.tsx` + `modListFilters.ts` |
| Owned copy | `siteCopy.ts` (no vendor names in primary UI) |
| Config copy | `CopyModConfigButton`, `modConfig.ts` |
| Server uptime chart | `serverUptimeChart.ts` + Recharts `ReferenceArea` on `ServerDetail` |

See [docs/UI_FILTERS.md](../docs/UI_FILTERS.md) and [walkthrough.md](../walkthrough.md).

## Environment

Frontend reads API from same origin in production. Local dev: root `npm run dev` proxy or set `WORKER_URL` in root `.env`.
