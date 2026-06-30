# Contributing to Arma Mods Leaderboard

Thank you for your interest in improving the project! This document provides guidelines for contributing to the repository.

## 🛠️ Development Workflow

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**:
   - Root: `npm install`
   - Web: `cd web && npm install`
3. **Run Linting**: Ensure your code passes TypeScript checks with `npx tsc --noEmit`.
4. **Local Proxy**: Use `npm run dev` in the root to test API interactions.
5. **Tests**: Run `npm test` before opening a PR. Scenario logic lives in
   `web/functions/lib/scenario-ranking.ts` with coverage in `test/scenario-ranking.test.ts`.

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
