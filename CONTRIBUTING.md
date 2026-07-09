# Contributing to Arma Mods Leaderboard

Thank you for your interest in improving the project! This document provides guidelines for contributing to the repository.

## 🛠️ Development Workflow

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**:
   - Root: `npm install`
   - Web: `cd web && npm install`
3. **Run Linting**: Ensure your code passes TypeScript checks with `npx tsc --noEmit`.
4. **Local Proxy**: Use `npm run dev` in the root to test API interactions.
5. **Tests**: Run `npm test` before opening a PR. Key suites:

| Area | Module | Test file |
|------|--------|-----------|
| Mod lookup | `web/functions/lib/mod-lookup.ts` | `test/mod-lookup.test.ts` |
| Server uptime | `server-uptime-history.ts` | `test/server-uptime-history.test.ts` |
| Storage planner | `storage-calc.ts`, `server-set-analysis.ts` | `test/storage-*.test.ts`, `test/server-modpack.test.ts` |
| Scenarios | `scenario-ranking.ts` | `test/scenario-ranking.test.ts` |
| Config copy | `mod-config.ts` | `test/mod-config.test.ts` |
| History API | `history-query.ts` | `test/history-query.test.ts` |

Full list: `package.json` → `"test"` script.

## 📝 Changelog & documentation (required)

Every PR or commit with user-visible changes **must** update docs in the same change set:

| Change type | Update |
|-------------|--------|
| Feature, fix, perf, UX | New section under `## [x.y.z]` at top of [CHANGELOG.md](CHANGELOG.md) |
| Architecture / API / cron | [README.md](README.md), [walkthrough.md](walkthrough.md) |
| UI patterns, filters, tables | [docs/UI_FILTERS.md](docs/UI_FILTERS.md) |
| KV, cache, PageSpeed | [docs/PERFORMANCE.md](docs/PERFORMANCE.md), [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md) if scores change |
| New doc file | [docs/README.md](docs/README.md) index |

- Use **semver patch** (`1.22.2`) for doc-only releases; bump minor for features.
- Date format: `YYYY-MM-DD` on the version heading.
- Agent rule: [.cursor/rules/changelog-and-docs.mdc](.cursor/rules/changelog-and-docs.mdc).

## 📜 Coding Standards

- **TypeScript**: All new code must be fully typed. Avoid using `any`.
- **Modularity**: One function = one responsibility. Keep files under 250 lines where possible.
- **Documentation**: Use JSDoc for complex logic and explain *why* something is done, not just *what*.
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add arma workshop scraper`, `fix: handle KV rate limits`).

## 🚀 Deployment

- Pull requests are automatically checked via GitHub Actions.
- Production is deployed to Cloudflare Pages & Workers.

---

## 🛡️ License

By contributing, you agree that your contributions will be licensed under the project's [CC BY-NC 4.0 License](https://creativecommons.org/licenses/by-nc/4.0/).
