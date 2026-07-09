# Lighthouse / PageSpeed Insights

Production scores for the **Mod Popularity Leaderboard** (`https://reforgermods.com/`, Arma Reforger default game). Measured with [PageSpeed Insights](https://pagespeed.web.dev/) (Lighthouse **13.4.0**, lab data — no CrUX field data yet).

See also: [PERFORMANCE.md](./PERFORMANCE.md) (what we optimized), [CHANGELOG.md](../CHANGELOG.md) (v1.21.0 PageSpeed work, v1.22.0 a11y).

---

## Current scores (post v1.21 deploy)

Captured **2026-07-09** after `attachCachedListFields`, thumbnail resize proxy, route code-splitting, and lazy row images shipped.

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
| `/api/mods/:id/thumbnail/img?w=64` + `IntersectionObserver` | Smaller bytes, deferred off-screen loads → LCP/FCP |
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
