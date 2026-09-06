# Project roadmap

**Status (2026-09-06):** Core platform is live at [reforgermods.com](https://reforgermods.com/). Shipped work lives in [CHANGELOG.md](CHANGELOG.md) — this file is only the short Current / Next view.

**Goal:** Supplement Reforger / Steam Workshop with **live engagement telemetry** (players, servers, trends). Workshop answers *what does this look like?*; this site answers *is anyone playing it right now?*

---

## Current

- Multi-game collector (Reforger / Arma 3) via BattleMetrics → GitHub Actions cron ~2h → Cloudflare KV shards
- Unified Hono edge Worker (`web/worker.ts`) + KV: serverId→shard indeksas (v1.23.25, INC-2026-09-06), precomputed default pages, surgical JSON extract
- React 19 UI: mod/server leaderboards, trending, scenarios, storage planner, favorites, uptime history, modpack diffs
- Frontend: visi 21 puslapis `React.lazy` + `DeferredSection` below-fold mounting (v1.23.26)
- CI + unit tests for ranking, lookup, storage planner, uptime, share meta, server index

Perf būsena ir matavimai: [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) (2026-09-06 sekcija), incidentai: [docs/INCIDENTS.md](docs/INCIDENTS.md).

---

## Next (prioritetas pagal poveikį)

### Performance — server detail (PSI 2026-09-06: mobile 71 / desktop 59)
- [x] **LCP duomenų inline'as** — `/server/:id` HTML atsakyme `<script>` su serverio JSON; React'as skaito iškart be API round-trip. DONE v1.23.27 (`7b9b590`) — permatuoti PSI
- [x] **A11y 94→100** — kontrastas (`text-gray-500/600` → `gray-400`) + heading tvarka (h4→h3). DONE v1.23.27 — permatuoti PSI
- [ ] Desktop TBT (~2,4 s) — tik jei reikės: sekcijų mount'as dalimis per `requestIdleCallback` arba lengvesnė chart biblioteka (vidutinis/didelis darbas) — permatuoti po inline'o
- [x] **Proceso taisyklė:** kiekviena nauja above-fold sekcija — PSI patikra prieš merge (2026-08-24 → 08-27 funkcijų banga suvalgė /server/* 97 → 62–71; žr. LIGHTHOUSE.md)

### Workshop / metadata
- [ ] **Fazė 2:** mod→serverių reverse indeksas `/mods/:id` pilnam efektyvumui (dabar batching po 4; KV schema + collector — grill būtinas)
- [ ] R2 self-host thumbnails only if Bohemia CDN hotlink fails
- [ ] Recursive / transitive dependency tree (depth > 1)
- [ ] Batch author / size / last-update warm for Arma 3 (Steam)
- [ ] Mod categorization (Survival, Roleplay, PvP, MilSim)

### Ops
- [ ] `cron-job.org` jobas saugo laikiną `gho_...` GitHub token'ą — pakeisti į ilgalaikį fine-grained PAT (INC-2026-08-27 TODO)
- [ ] Rankinis collector dispatch prieš paleidžiant — patikrinti `gh run list` (dubliai rašo į tuos pačius KV raktus lygiagrečiai; žr. INC-2026-09-06)

### Storage planner
- [ ] SEO: Search Console `noindex` for `/storage-planner` vs landing
- [ ] Precomputed server-similarity index (full network)
- [ ] Warm size coverage beyond top-300
- [ ] Arma 3 Steam workshop sizes in planner

### Product
- [ ] Scenario history / trending (extend shared `history:*` shards)
- [ ] Mod comparison (side-by-side)
- [ ] Discord/webhook alerts when a mod hits Trending
- [ ] Public read API / SDK for third-party sites
- [ ] Predictive trending / market-share views (exploratory)

---

## Notes

- TypeScript end-to-end; Cloudflare Workers + KV (Pages pašalintas 2026-08-24)
- Collector respects BattleMetrics rate limits; paid PAT required — [docs/DATA_SYNC.md](docs/DATA_SYNC.md)
