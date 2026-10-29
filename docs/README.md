# Documentation index

Release notes: [CHANGELOG.md](../CHANGELOG.md) (current: **v1.23.59**).

## Start here

| Doc | Audience | Contents |
|-----|----------|----------|
| [walkthrough.md](../walkthrough.md) | New engineers | End-to-end data flow, API surface, cron, local dev |
| [README.md](../README.md) | Overview | Architecture highlights, stack, setup |
| [web/README.md](../web/README.md) | Frontend | Vite app structure, UI patterns |
| [DATA_SYNC.md](./DATA_SYNC.md) | Ops / maintainers | BM paid API, collector switch, stale UI, donation fund |
| [SEO.md](./SEO.md) | Ops / SEO | Search Console, crawler HTML, sitemap |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Frontend | Design language: colors, typography, spacing, mobile density tiers |
| [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) | Frontend | UI decisions: what was chosen and why |
| [BRAND_ASSETS.md](./BRAND_ASSETS.md) | Design | Logo, wordmark, brand asset usage |

## Domain guides

| Doc | Topic |
|-----|--------|
| [ALGORITHM.md](./ALGORITHM.md) | Ranking, SQE, trending, co-deploy math |
| [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) | KV history, sharding, key layout |
| [SERVER_UPTIME.md](./SERVER_UPTIME.md) | Offline bands, `on`/`n` aggregation |
| [MODPACK_DIFF.md](./MODPACK_DIFF.md) | Daily server modlist added/removed |
| [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) | Console modpack sizes, planner API |
| [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) | Thumbnails, deps scrape, list metadata |
| [DATA_SOURCES_RESEARCH.md](./DATA_SOURCES_RESEARCH.md) | BattleMetrics alternatives research; the official Bohemia Workshop API |
| [UI_FILTERS.md](./UI_FILTERS.md) | ListFilterBar, favorites, table layout |
| [PERFORMANCE.md](./PERFORMANCE.md) | KV/cache trade-offs, hot paths |
| [LIGHTHOUSE.md](./LIGHTHOUSE.md) | PageSpeed / Lighthouse scores (before & after v1.21) |
| MONETIZATION (private) | Revenue policy and the FEATURED model — `docs-private/MONETIZATION.md` (not public) |
| [COST_GUARDRAILS.md](./COST_GUARDRAILS.md) | Cloudflare resource limits: Images transformations (removed 2026-09-28), KV bundle policy, D1 |
| [P0_GATES.md](./P0_GATES.md) | P0 Workshop/Steam auth gates (GO/STOP criteria, research status) |
| [DISCORD.md](./DISCORD.md) | Discord channel template, goals, moderation rules |
| [MOBILE_STANDARDS.md](./MOBILE_STANDARDS.md) | Mobile standard (current code reality and roadmap) |
| [MOBILE_UX.md](./MOBILE_UX.md) | Mobile audit and re-test checklist |
| [INCIDENTS.md](./INCIDENTS.md) | Incident register (data pipeline, edge, API) |

## Other

| Doc | Topic |
|-----|--------|
| [ENGINEERING_CASE_STUDY.md](./ENGINEERING_CASE_STUDY.md) | Long-form architecture narrative |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | PR workflow, tests, conventions |
| [../scripts/steam-auth-probe/README.md](../scripts/steam-auth-probe/README.md) | Steam/WS auth probe (research tool) |

## Doc freshness

Last commit date per document. Regenerate with `npm run docs:freshness` before a
release: a document that has not changed in months is either genuinely stable or
quietly wrong, and the difference is worth a look.

<!-- freshness:start -->
| Document | Last updated |
|---|---|
| [ALGORITHM.md](./ALGORITHM.md) | 2026-10-29 |
| [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) | 2026-10-29 |
| [BRAND_ASSETS.md](./BRAND_ASSETS.md) | 2026-07-31 |
| [COST_GUARDRAILS.md](./COST_GUARDRAILS.md) | 2026-10-29 |
| [DATA_SOURCES_RESEARCH.md](./DATA_SOURCES_RESEARCH.md) | 2026-10-29 |
| [DATA_SYNC.md](./DATA_SYNC.md) | 2026-10-29 |
| [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) | 2026-10-29 |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 2026-10-29 |
| [DISCORD.md](./DISCORD.md) | 2026-10-29 |
| [ENGINEERING_CASE_STUDY.md](./ENGINEERING_CASE_STUDY.md) | 2026-05-18 |
| [INCIDENTS.md](./INCIDENTS.md) | 2026-10-29 |
| [LIGHTHOUSE.md](./LIGHTHOUSE.md) | 2026-10-29 |
| [MOBILE_STANDARDS.md](./MOBILE_STANDARDS.md) | 2026-10-29 |
| [MOBILE_UX.md](./MOBILE_UX.md) | 2026-10-29 |
| [MODPACK_DIFF.md](./MODPACK_DIFF.md) | 2026-09-30 |
| [P0_GATES.md](./P0_GATES.md) | 2026-10-29 |
| [PERFORMANCE.md](./PERFORMANCE.md) | 2026-10-29 |
| [SEO.md](./SEO.md) | 2026-09-30 |
| [SERVER_UPTIME.md](./SERVER_UPTIME.md) | 2026-09-30 |
| [STORAGE_PLANNER.md](./STORAGE_PLANNER.md) | 2026-10-29 |
| [UI_FILTERS.md](./UI_FILTERS.md) | 2026-08-26 |
| [WORKSHOP_METADATA.md](./WORKSHOP_METADATA.md) | 2026-10-29 |
<!-- freshness:end -->
