# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

Releases before 1.23.58 are archived in
[docs/CHANGELOG_ARCHIVE.md](docs/CHANGELOG_ARCHIVE.md) with their original
wording, so the full history stays available.

## [Unreleased]

### Documentation

- `walkthrough.md`, `WORKSHOP_METADATA.md`, `STORAGE_PLANNER.md` and `MOBILE_UX.md`
  translated to English. The historical CF Images section keeps its dates,
  measurements and the record of what was reversed.
- `DESIGN_SYSTEM.md`, `MOBILE_STANDARDS.md`, `LIGHTHOUSE.md` and `PERFORMANCE.md`
  translated to English; the two broken internal anchor links in the design
  document now point at existing headings.
- `INCIDENTS.md`, `DISCORD.md`, `P0_GATES.md` and `DATA_SOURCES_RESEARCH.md`
  translated to English. Incident timelines, measurements, dates and statuses are
  preserved; the Discord #information template is now English.
- `PLAN.md`, `web/README.md` and `scripts/steam-auth-probe/README.md` translated.
  Every tracked Markdown file is now English except the release archive and the
  author's name in the licence line.
- README: a `Documentation` section with the five entry-point documents, a docs
  badge, and the 14-link line at the bottom replaced by a short pointer. Four
  documents gained a one-sentence intro under the title.

### Tooling

- `npm run docs:check` — a dependency-free link checker over every tracked
  Markdown file: missing files and missing heading anchors fail the build. The
  CI workflow runs it on every push and pull request. `docs/CHANGELOG_ARCHIVE.md`
  is excluded on purpose: it is a snapshot and its links point at files that were
  renamed or deleted since.
- `npm run docs:freshness` — regenerates the freshness table in `docs/README.md`
  from the last commit date of each document, so stale docs are visible instead
  of assumed current. Run it before a release.

## [1.23.59] - 2026-10-29

### Documentation

- `ARCHITECTURE_DECISION.md`, `COST_GUARDRAILS.md`, `ALGORITHM.md` and
  `DATA_SYNC.md` translated to English. Measurements, key names, dates and code
  paths are unchanged.
- Documentation index descriptions translated; the stale version reference now
  points at the current release instead of v1.23.53.

## [1.23.58] - 2026-10-29

### Added

- **Canonical `/server/:id` response.** One body for people and crawlers. The
  previous version returned a 2.4 KB share page to bots and an 18 KB SPA shell to
  humans under the same URL, both `public`, without `Vary` — the Workers cache
  could serve one to the other. Title, description, canonical, Open Graph,
  Twitter card and JSON-LD are now built from the record already read for the
  page, so the route no longer performs a second `lookupServer`.
- **Screenshot in the README**, plus CI and release badges.

### Changed

- **`/server/:id` misses are cached** and the launcher cache-buster is
  normalized, so repeated launcher links hit the same cache entry.
- **`SOCIAL_CRAWLER_UA` narrowed** to actual social crawlers. AhrefsBot (44 % of
  Worker CPU at the time) now receives the canonical page instead of the
  meta-refresh share path.
- **Release notes moved to English** and to the Keep a Changelog format. The 146
  previous entries are archived unchanged in
  [docs/CHANGELOG_ARCHIVE.md](docs/CHANGELOG_ARCHIVE.md).
- **Community health files added:** `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue
  forms, a pull request template and Dependabot configuration.
- **Repository hygiene:** line endings normalized through `.gitattributes`, Node
  22 pinned in `.nvmrc`, editor defaults in `.editorconfig`, and `package.json`
  metadata aligned with the repository.
- **Agent instruction files are no longer tracked.** `AGENTS.md` and
  `.cursor/rules/` stay local and are ignored, so the public repository carries
  code and documentation only.
