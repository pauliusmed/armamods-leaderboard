# Contributing to Arma Mods Leaderboard

Thank you for your interest in improving the project! This document provides guidelines for contributing to the repository.

## 🛠️ Development Workflow

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**:
   - Root: `npm install`
   - Web: `cd web && npm install`
3. **Type check + build** — **both** configs, `web/` has its own `package.json` and its own `tsconfig`s:

   ```bash
   npx tsc --noEmit                 # root config — neturi web/**
   npm run build --prefix web       # tsc -b && vite build — CI gate + deploy gate
   ```

   ⚠️ **`npx tsc --noEmit` vienas NEPAKANKA.** Root `tsconfig.json` neturi `web/**`;
   `web/tsconfig.app.json` turi `erasableSyntaxOnly: true` ir `include: ["src",
   "functions/api/audit-config.ts"]`, bet į programą patenka **visas importo grafas**
   iš `src/`. Failas, kurio niekas neimportuoja iš `src/`, yra **ne tikrinamas
   niekada** — 2026-09-30 incidentas (`erasableSyntaxOnly` TS1294) praėjo pro žalią
   PR su vien tik `npx tsc --noEmit` ir numetė auto-deploy'ą (`CHANGELOG.md` v1.23.48/49).

4. **Local dev**: `npm --prefix web run dev` (Vite, `web/vite.config.ts` jau
   proxy'ina `/api` → `reforgermods.com`). Root `npm run dev` yra **deprecated**
   Express proxy (`src/index.ts`) — nenaudoti.
5. **Lint** (jei keiti `web/`): `npm --prefix web run lint`. **Žinojimas:** ši
   komanda dabar krenta dėl **pre-existing** klaidos
   (`web/src/hooks/usePinnedFavoriteMods.ts:38`, `react-hooks/set-state-in-effect`).
   **Nefiksuok jos** — tai užregistuota užduotis, ne tavo pakeitimas
   (`AGENTS.md`: pre-existing lint klaidų neatlysime).
6. **Tests**: `npm test` (root, **37** failų) ir `npm --prefix web test` (vitest)
   prieš atidarant PR. CI dabar paleidžia tik `test/utils.test.ts` iš root — **tai
   nėra pakankama**, visus testus paleidžiate lokaliai. Key suites:

| Area | Module | Test file |
|------|--------|-----------|
| Mod lookup | `web/functions/lib/mod-lookup.ts` | `test/mod-lookup.test.ts` |
| Server uptime | `server-uptime-history.ts` | `test/server-uptime-history.test.ts` |
| Storage planner | `storage-calc.ts`, `server-set-analysis.ts` | `test/storage-*.test.ts`, `test/server-modpack.test.ts` |
| Scenarios | `scenario-ranking.ts` | `test/scenario-ranking.test.ts` |
| Config copy | `mod-config.ts` | `test/mod-config.test.ts` |
| History API | `history-query.ts` | `test/history-query.test.ts` |
| Mod search index | `mods-search-index.ts` | `test/mods-search-index.test.ts` |

Full list: `package.json` → `"test"` script.

## 📝 Changelog & documentation (required)

Every PR or commit with user-visible changes **must** update docs in the same change set:

| Change type | Update |
|-------------|--------|
| Feature, fix, perf, UX | New `###` entry at top of the current section in [CHANGELOG.md](CHANGELOG.md), with the version in the heading (`(v1.23.50) - YYYY-MM-DD`) |
| **User-facing** (new page, visible behaviour) | **Also** a top entry in [DISCORD_RELEASES.md](DISCORD_RELEASES.md) — 1–5 lines, English, user value only. Deploy ships it to `#announcements`. Technical fixes do **not** need it. |
| Architecture / API / cron | [README.md](README.md), [walkthrough.md](walkthrough.md) |
| UI patterns, filters, tables | [docs/UI_FILTERS.md](docs/UI_FILTERS.md) |
| KV, cache, PageSpeed | [docs/PERFORMANCE.md](docs/PERFORMANCE.md), [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) if scores change |
| **Cloudflare resource use** (CPU, KV, requests) | [docs/COST_GUARDRAILS.md](docs/COST_GUARDRAILS.md) |
| New doc file | [docs/README.md](docs/README.md) index |

- Versions are sequential patch bumps (`v1.23.49` → `v1.23.50`); bump minor only for features.
- Date format: `YYYY-MM-DD` in the entry heading.
- New root test files **must** be registered in the explicit list in `package.json` → `"test"` — CI does not glob.
- Agent rule: [.cursor/rules/changelog-and-docs.mdc](.cursor/rules/changelog-and-docs.mdc).

## 📜 Coding Standards

- **TypeScript**: All new code must be fully typed. Avoid using `any`.
- **Modularity**: One function = one responsibility. Keep files under 250 lines where possible.
- **Documentation**: Use JSDoc for complex logic and explain *why* something is done, not just *what*.
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add arma workshop scraper`, `fix: handle KV rate limits`).

## 🚀 Deployment

- PR'ams GitHub Actions paleidžia **CI gate**: `npx tsc --noEmit`,
  `test/utils.test.ts`, `npm ci --prefix web`, **`npm run build --prefix web`**,
  `npm --prefix web test`. (Pridėta v1.23.49 po 2026-09-30 incidento.)
- **Deploy** — `.github/workflows/deploy.yml`, GitHub Actions, **ne** Cloudflare
  Workers Builds. Trigger: `push` į `main`, jei pasikeitė `web/**` arba pats
  `deploy.yml`. Žingsniai: `npm ci --prefix web` → `npm run build --prefix web`
  → `cloudflare/wrangler-action@v3`. Slapti: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`.
- Release žinutė į Discord: `.github/workflows/discord-release.yml` (jei pasikeitė
  `DISCORD_RELEASES.md`, slaptas `DISCORD_WEBHOOK_URL`).
- Produkcija — `reforgermods.com` per Cloudflare Workers (`web/worker.ts`).
  `workers_dev = false`; senasis Pages projektas sunaikintas 2026-09-09.

---

## 🛡️ License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
