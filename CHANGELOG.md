# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

Release history before 1.23.58 is preserved in git:
`git log --follow CHANGELOG.md`.

## [Unreleased]

### Documentation

- `docs/COST_GUARDRAILS.md`: the Workers CPU section was stale (09-30 figure,
  61 ms/request). Refreshed with the 2026-11-20 measurement (21.1 ms/request,
  p99 394 ms) and the number that actually matters — **26.58M of the 30M ms
  monthly quota in 19.5 days (~138 % projected)**. Added a
  "Reading analytics: two traps that faked a crisis" section: Cache API `504` is
  an instrumentation marker for a cache miss, not a visitor timeout (`eyeball`
  504 = 0 of 21,580), and SEO/AI crawler storms are 94 % cache HIT therefore
  CPU-free — so widening the WAF bot guard to static assets is not justified.
  Recorded the one real finding, `cache.put` 413 (2,824/day, zero user impact,
  root cause undetermined).
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
- `docs/CHANGELOG_ARCHIVE.md` removed: 2,139 lines of Lithuanian release history
  in an otherwise English repository, with 26 links to files renamed since. The
  content stays in git (`git log --follow CHANGELOG.md`) and the link checker no
  longer needs a hardcoded exception.

### Tooling

- `npm run docs:check` — a dependency-free link checker over every tracked
  Markdown file: missing files and missing heading anchors fail the build. The
  CI workflow runs it on every push and pull request.
- `npm run docs:freshness` — regenerates the freshness table in `docs/README.md`
  from the last commit date of each document, so stale docs are visible instead
  of assumed current. Run it before a release.

### Performance

- **Workshop images are cached in the service worker.** The Bohemia CDN sends no
  `Cache-Control`, so repeat visits revalidated every thumbnail and gallery image.
  A `CacheFirst` runtime route now keeps `ar-gcp-cdn.bistudio.com/image/*`
  responses for 90 days (150 entries); `/api/*` stays network-only.
- **Smaller gallery previews and cached redirects.** The mod-detail gallery grid
  now loads the CDN `thumb` variant (falling back to the original), while the
  lightbox keeps the full-size image. The `/api/og/preview` 302s set
  `Cache-Control: public, max-age=3600`, so browsers stop re-asking the Worker
  for fallback thumbnails.

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
- **Release notes moved to English** and to the Keep a Changelog format; the 146
  previous entries remain in git history (`git log --follow CHANGELOG.md`).
- **Community health files added:** `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue
  forms, a pull request template and Dependabot configuration.
- **Repository hygiene:** line endings normalized through `.gitattributes`, Node
  22 pinned in `.nvmrc`, editor defaults in `.editorconfig`, and `package.json`
  metadata aligned with the repository.
- **Agent instruction files are no longer tracked.** `AGENTS.md` and
  `.cursor/rules/` stay local and are ignored, so the public repository carries
  code and documentation only.
