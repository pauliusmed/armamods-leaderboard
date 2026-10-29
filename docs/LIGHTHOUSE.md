# Lighthouse / PageSpeed Insights

Production scores for the **Mod Popularity Leaderboard** (`https://reforgermods.com/`, Arma Reforger default game). Measured with [PageSpeed Insights](https://pagespeed.web.dev/) (Lighthouse **13.4.1**, lab data — no CrUX field data yet).

See also: [PERFORMANCE.md](./PERFORMANCE.md) (what we optimized), [INCIDENTS.md](./INCIDENTS.md) (edge incidents), [CHANGELOG.md](../CHANGELOG.md) (v1.21.0 PageSpeed work, v1.23.4–9 CLS work, v1.23.25–26 server detail work).

---

## 2026-09-07 — Server detail after v1.23.25–27 (desktop re-measured)

PSI desktop `/server/40538887` (2026-09-07 00:00) after all three stages (edge index, route split, LCP inline plus a11y):

| Category | Desktop |
|----------|---------|
| **Performance** | **89** (was 58–60) |
| **Accessibility** | **98** (was 94 — only heading order left) |
| Best Practices / SEO | 100 / 100 |

| Metric | Desktop (09-06 before) | Desktop (09-07 after) |
|--------|----------------------|--------------------|
| FCP | 0.5 s | **0.4 s** |
| LCP | 1.6 s | **1.2 s** |
| **TBT** | 2 380 ms (18 long tasks, max 819 ms) | **220 ms** (4 long tasks, max 137 ms) |
| CLS | 0.009 | 0.017 |
| Speed Index | 2.5 s | **1.3 s** |
| HTML | 1.5 KiB (SPA shell) | 7.1 KiB (embedded server JSON) |

**What worked:** inlining removed the API round-trip from the critical path → a single, earlier React render (no more state waves from five parallel fetches) — TBT dropped ~11× and the longest long task went from 819 to 137 ms. The a11y contrast is fixed.

**Remaining:**

1. **A11y 98→100** — one audit item: "heading elements not in sequentially-descending order" (the h4→h3 ServerDetail glossary fix was not applied everywhere — find the remaining spots).
2. **Mobile measurement** — waiting for the owner to run PSI (desktop 89 suggests mobile is likely above 90; mobile LCP was the biggest loss).
3. Not score-critical: 74 KiB unused JS (es6 Recharts vendor + index), CLS 0.017 (footer shift), ~140 ms forced reflow (Recharts measurement).

---

## 2026-09-06 — Server detail pages (`/server/:id`)

Measured after INC-2026-09-06 (edge `exceededMemory` 503) and the v1.23.25–26 fixes (serverId→shard index, full route-level code splitting, `DeferredSection` below-fold mounting). The same URL measured in **both** PSI tabs the same minute (`/server/39348345`):

| Metric | Desktop (almost no CPU slowdown) | Mobile (Moto G Power, Slow 4G) |
|--------|----------------------------------|-------------------------------|
| **Performance** | **59–60** | **71** |
| FCP | 0.5 s | 1.7 s |
| **LCP** | 1.6 s (render delay 3 450–3 880 ms) | **6.3 s** (render delay 3 450 ms — score 9/100) |
| **TBT** | **2 380 ms** (18 long tasks) | **250 ms** (3 long tasks — was 1 730–1 850) |
| CLS | 0.009 | 0.035 |
| Speed Index | 2.5 s | 3.2 s |
| JS execution | 3.9 s (index chunk ~2.7 s eval) | 1.3 s |

**What was fixed that day (v1.23.25–26):**

- The edge 503 storm (`Worker exceededMemory` — 75 errors/hour): a serverId→shard index loads one shard (~5 MB) instead of all 16 (~80 MB). See INC-2026-09-06.
- Mobile TBT 1 730→**250 ms**: every one of the 21 pages is `React.lazy` (index −~44 kB raw), and below-fold sections mount through `DeferredSection` (IntersectionObserver at 400px plus `minHeight` to protect CLS).

**Remaining (in priority order):**

1. **LCP — the biggest loss (mobile score 9/100).** The h1 with the server name does not exist until JS boots and the API round-trip completes — the essence of an SPA. The planned fix is to inline the server data into the `/server/:id` HTML response (`<script>` + JSON) — **never tried before** (prerendering exists only for bots/SEO). Medium effort, roughly 0.5–1.5 s LCP gain on both platforms.
2. **Desktop TBT (2 380 ms)** — one 819 ms React render commit plus Recharts (303 ms + 207 ms reflow). Desktop PSI runs with almost no CPU slowdown, so it reflects the amount of synchronous rendering, not download. Fixes if needed: mount sections in slices via `requestIdleCallback`, or a lighter chart library — both medium to large.
3. **A11y 94→100** — contrast (`text-gray-500/600` on `#101923`) plus heading order. Mechanical.

**Process lesson (where the regression came from):** on 2026-08-24 (v1.23.4–9) `/server/*` mobile reached **97** (font CLS, Recharts split, skeletons). Over the next three days (v1.23.10–26) Similar Deployed Servers, Storage pack, Mod Changes and BmLastSeenHint were added to the page, and the score fell back to 62–71 without a single "wrong" commit. **Rule: every new above-fold section ships with a PSI check before merge** (see § Re-run).

### Lighthouse audit thresholds

- **Reduce JavaScript execution time** — a warning when JS execution exceeds **2 s**, a failure above **3.5 s**. Lighthouse reports eval/parse/execute times per file.
- **TTI was removed in Lighthouse 10** (too sensitive to outliers) — **LCP, TBT, INP** replace it. TTI is no longer a target.

---

## Current scores — homepage leaderboard (historical, 2026-07-09)

Captured **2026-07-09** after `attachCachedListFields`, thumbnail resize proxy, route code-splitting, and lazy row images shipped.

> **Re-measured 2026-08-24:** v1.22.23 self-hosted fonts (`@fontsource`), v1.23.4–6 removed latin-ext plus `font-display: optional` (CLS 0.17→0.008) — homepage mobile **98**, desktop 99. See CHANGELOG v1.23.4–6.

| Category | Desktop | Mobile (Moto G Power, Slow 4G) |
|----------|---------|--------------------------------|
| **Performance** | **100** | **98** |
| **Accessibility** | 98 | 94 |
| **Best Practices** | 100 | 100 |
| **SEO** | 100 | 100 |

### Core Web Vitals (lab)

| Metric | Desktop | Mobile |
|--------|---------|--------|
| First Contentful Paint (FCP) | 0.4 s | 1.7 s |
| Largest Contentful Paint (LCP) | 0.5 s | 2.3 s |
| Total Blocking Time (TBT) | 0 ms | 0 ms |
| Cumulative Layout Shift (CLS) | 0.001 | — |
| Speed Index (SI) | 0.5 s | — |

**Main win:** TBT dropped from **~970 ms (desktop)** / **130 ms (mobile)** to **0 ms** by embedding list metadata in `GET /api/mods` (~72 fewer row-level API calls per page).

---

## Baseline (pre v1.21, same URL)

Captured **2026-07-09 23:02 GMT+3** before list-metadata and thumbnail optimizations.

| Category | Desktop | Mobile |
|----------|---------|--------|
| Performance | 70 | 84 |
| Accessibility | 93 | 89 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Metric | Desktop | Mobile |
|--------|---------|--------|
| FCP | 0.5 s | 2.6 s |
| LCP | 0.6 s | 3.5 s |
| TBT | 970 ms | 130 ms |
| CLS | 0.018 | 0.007 |
| SI | 1.5 s | 4.3 s |

**Root cause:** each leaderboard row triggered separate `author`, `thumbnail`, and `workshop-status` fetches (~75 requests) plus full-resolution Bohemia CDN images in the viewport.

---

## What changed (v1.21+)

| Change | Lighthouse impact |
|--------|-------------------|
| `attachCachedListFields` on `GET /api/mods` | −~72 API round-trips → TBT → 0 |
| `IntersectionObserver` lazy thumbnails (resize removed v1.23.45) | Deferred off-screen loads → LCP/FCP; transformed bytes are gone because of cost (see `COST_GUARDRAILS.md`) |
| `React.lazy()` for detail/planner/audit routes | Smaller initial JS on `/` |
| `preconnect` to `ar-gcp-cdn.bistudio.com` | Faster CDN handshakes on image paths |
| `aria-sort` on `<th scope="col">` (v1.21) | Accessibility baseline |
| Single `<h1>`, 44px touch targets (v1.22) | Remaining a11y gaps (heading order, tap targets) |

---

## Re-run locally or in CI

```bash
# Install once
npm install -g lighthouse

# Desktop-style (default)
lighthouse https://reforgermods.com/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-desktop.json

# Mobile emulation (matches PSI mobile tab)
lighthouse https://reforgermods.com/ --preset=perf --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-mobile.json
```

Or use [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https://reforgermods.com/) in the browser.

**Note:** Scores vary by edge cache warmth, KV cache state, and Lighthouse version. Re-measure after major UI or API changes; update this file and README badges when publishing a new release.

---

## Remaining low-priority insights (not score blockers)

These may still appear in PSI reports at 98–100 Performance:

- **Image delivery** — some workshop thumbnails still larger than display size when CF Image Resizing is unavailable (302 to CDN).
- **Heading order** — partially addressed in v1.22 (`Layout` logo no longer `<h1>`).
- **Touch targets** — Copy / Workshop / ★ enlarged on mobile in v1.22.
- **`llms.txt`** — optional SEO/AI discoverability; not required for current scores.
