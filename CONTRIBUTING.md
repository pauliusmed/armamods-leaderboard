# Contributing

Thanks for taking the time to improve the project. This guide covers the parts a
change is expected to respect.

## Development setup

1. Fork the repository and branch from `main`.
2. Install dependencies:

   ```bash
   npm install
   npm --prefix web install
   ```

3. Create `.env` in the repository root (see `.env.example`). `BATTLEMETRICS_API_KEY`
   is a paid BattleMetrics token; without it the collector cannot refresh KV. It
   is not needed for UI work.
4. Run the app:
   - Full Worker, production parity: `npx wrangler dev --cwd web --local`
     (build `web` first with `npm --prefix web run build`).
   - Frontend only: `npm --prefix web run dev`.

Node 22 is pinned in `.nvmrc` and matches CI.

## Checks before a pull request

Each check covers a different part of the tree. None of them covers everything,
so run all applicable ones:

| Check | Command | Covers |
| --- | --- | --- |
| Root types | `npx tsc --noEmit` | `src/**` only |
| Scripts and tests | `npx tsc --noEmit -p tsconfig.scripts.json` | `scripts/**`, `test/**` |
| Web types and build | `npm --prefix web run build` | `web/src/**`, `web/functions/**` |
| Root tests | `npm test` | all 41 suites |
| Web tests | `npm --prefix web test` | Vitest suites |
| Lint | `npm --prefix web run lint` | `web/`, currently red |

CI runs both type checks, the web build, the web tests and **7 of the 41 root
suites**. A green check therefore does not mean the root suite passed — run
`npm test` locally.

Lint currently fails on a pre-existing `react-hooks/set-state-in-effect` error in
`web/src/hooks/usePinnedFavoriteMods.ts`. Fixing it is a separate task; do not
bundle it into an unrelated change.

## Changelog and documentation

Every change that ships updates the docs in the same pull request:

| Change | Update |
| --- | --- |
| Feature, fix, performance, UX | Entry in [CHANGELOG.md](CHANGELOG.md) under the current version |
| **User-facing** (new page, visible behaviour) | A top entry in [DISCORD_RELEASES.md](DISCORD_RELEASES.md) — English, 1–5 lines, user value only |
| Architecture, API, cron | [README.md](README.md), [walkthrough.md](walkthrough.md) |
| UI patterns, filters, tables | [docs/UI_FILTERS.md](docs/UI_FILTERS.md) |
| KV, cache, PageSpeed | [docs/PERFORMANCE.md](docs/PERFORMANCE.md), [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) |
| Cloudflare resource use | [docs/COST_GUARDRAILS.md](docs/COST_GUARDRAILS.md) |
| New document | [docs/README.md](docs/README.md) index |

- Versions are sequential patch bumps, minor only for features.
- Date format is `YYYY-MM-DD`.
- A new root test file must be added to the explicit list in `package.json` →
  `"test"`; CI does not glob.
- Before a release, run `npm run docs:freshness`. It rewrites the freshness table
  in [docs/README.md](docs/README.md) from git history; a document untouched for
  months is either stable or wrong, and that table makes the difference visible.

## Coding standards

- TypeScript, fully typed. Avoid `any`.
- One function, one responsibility. Keep files under ~200 lines where possible.
- Comments explain *why*, not *what*.
- [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages (`feat:`, `fix:`, `docs:`, `perf:`).

## Pull requests

- One topic per pull request. Keep it under roughly 15 files and 400 changed
  lines; split larger work.
- State in the description whether full CI coverage is required, using the
  `Heavy CI: required/skipped because …` line from the template.
- Deployment is automatic: a push to `main` touching `web/**` builds and deploys
  the Worker through GitHub Actions. Docs-only changes do not deploy.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
