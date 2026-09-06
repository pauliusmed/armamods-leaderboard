# Lighthouse / PageSpeed Insights

Production scores for the **Mod Popularity Leaderboard** (`https://reforgermods.com/`, Arma Reforger default game). Measured with [PageSpeed Insights](https://pagespeed.web.dev/) (Lighthouse **13.4.1**, lab data — no CrUX field data yet).

See also: [PERFORMANCE.md](./PERFORMANCE.md) (what we optimized), [INCIDENTS.md](./INCIDENTS.md) (edge incidents), [CHANGELOG.md](../CHANGELOG.md) (v1.21.0 PageSpeed work, v1.23.4–9 CLS work, v1.23.25–26 server detail work).

---

## 2026-09-07 — Server detail PO v1.23.25–27 (desktop permatuotas)

PSI desktop `/server/40538887` (2026-09-07 00:00) po visų trijų etapų (edge indeksas, route split, LCP inline'as + a11y):

| Category | Desktop |
|----------|---------|
| **Performance** | **89** (buvo 58–60) |
| **Accessibility** | **98** (buvo 94 — liko tik heading order) |
| Best Practices / SEO | 100 / 100 |

| Metric | Desktop (09-06 prieš) | Desktop (09-07 po) |
|--------|----------------------|--------------------|
| FCP | 0.5 s | **0.4 s** |
| LCP | 1.6 s | **1.2 s** |
| **TBT** | 2 380 ms (18 long tasks, max 819 ms) | **220 ms** (4 long tasks, max 137 ms) |
| CLS | 0.009 | 0.017 |
| Speed Index | 2.5 s | **1.3 s** |
| HTML | 1.5 KiB (SPA shell) | 7.1 KiB (embedded serverio JSON) |

**Kas veikia:** inline'as pašalino API round-trip iš critical path → React render'as vienas ir ankstesnis (nebe 5 lygiagrečių fetch'ų state bangos) — TBT nukrito ~11×, ilgiausia long task 819→137 ms. A11y kontrastas išgydytas.

**Liko:**
1. **A11y 98→100** — vienas auditas: „heading elements not in sequentially-descending order" (h4→h3 ServerDetail glossary uždengė ne visur — surasti likusias vietas).
2. **Mobile matavimas** — laukia savininko PSI paleidimo (desktop 89 rodo, kad mobile tikėtinai >90; mobile LCP buvo didžiausias pralaimėjimas).
3. Smulkmenos ne balui: unused JS 74 KiB (es6 Recharts vendor + index), CLS 0.017 (footer shift), forced reflow ~140 ms (Recharts matavimas).

---

## 2026-09-06 — Server detail pages (`/server/:id`)

Measured after INC-2026-09-06 (edge `exceededMemory` 503) and the v1.23.25–26 fixes (serverId→shard index, full route-level code splitting, `DeferredSection` below-fold mounting). The same URL measured in **both** PSI tabs the same minute (`/server/39348345`):

| Metric | Desktop (beveik be CPU slowdown) | Mobile (Moto G Power, Slow 4G) |
|--------|----------------------------------|-------------------------------|
| **Performance** | **59–60** | **71** |
| FCP | 0.5 s | 1.7 s |
| **LCP** | 1.6 s (render delay 3 450–3 880 ms) | **6.3 s** (render delay 3 450 ms — score 9/100) |
| **TBT** | **2 380 ms** (18 long tasks) | **250 ms** (3 long tasks — buvo 1 730–1 850) |
| CLS | 0.009 | 0.035 |
| Speed Index | 2.5 s | 3.2 s |
| JS execution | 3.9 s (index chunk ~2.7 s eval) | 1.3 s |

**Kas išgydyta šiandien (v1.23.25–26):**
- Edge 503 audros (`Worker exceededMemory` — 75 err/h) — serverId→shard indeksas, 1 shardas (~5 MB) vietoj visų 16 (~80 MB). Žr. INC-2026-09-06.
- Mobile TBT 1 730→**250 ms**: visi 21 puslapis `React.lazy` (index −~44 kB raw), below-fold sekcijos mount'inamos per `DeferredSection` (IntersectionObserver 400px + `minHeight` CLS apsaugai).

**Kas liko (prioritetinė tvarka):**
1. **LCP — didžiausias pralaimėjimas (mobile score 9/100).** h1 su serverio pavadinimu neegzistuoja kol JS boot + API round-trip nesuveikia (SPA esmė). Planuotas sprendimas: serverio duomenų inline'as į `/server/:id` HTML atsakymą (`<script>` + JSON) — **niekada anksčiau nebandyta** (prerender'is egzistuoja tik botams/SEO). Vidutinis darbas, ~0,5–1,5 s LCP laimėjimas abiejose plokštumose.
2. **Desktop TBT (2 380 ms)** — vienas 819 ms React render commit'as + Recharts (303 ms + reflow 207 ms). Desktop PSI naudoja beveik be CPU slowdown, tad atspindi sinchroninio render kiekį, ne atsiuntimą. Sprendimai (jei reikės): sekcijų mount'as dalimis per `requestIdleCallback` arba lengvesnė chart biblioteka — abu vidutini/dideli.
3. **A11y 94→100** — kontrastas (`text-gray-500/600` ant `#101923`) + heading tvarka. Mechaniška.

**Proceso pamoka (regresijos kilmė):** 2026-08-24 (v1.23.4–9) `/server/*` mobile pasiekė **97** (font CLS, Recharts atsiskyrimas, skeleton'ai). Per kitas 3 dienas (v1.23.10–26) į puslapį prisidėjo Similar Deployed Servers, Storage pack, Mod Changes, BmLastSeenHint — balas sugrižo į 62–71 zoną be vieno „klaidingo" commit'o. **Taisyklė: kiekviena nauja above-fold sekcija — su PSI patikra prieš merge** (žr. § Re-run).

### Audit ribos (Lighthouse)

- **Reduce JavaScript execution time** — įspėjimas kai JS vykdymas > **2 s**, fail kai > **3,5 s**. Lighthouse rodo eval/parse/execute laikus pagal fail'us.
- **TTI pašalintas iš Lighthouse 10** (per daug jautrus outlier'iams) — vietoj jo **LCP, TBT, INP**. Naudoti TTI kaip target'ą nebereikia.

---

## Current scores — homepage leaderboard (istorinis, 2026-07-09)

Captured **2026-07-09** after `attachCachedListFields`, thumbnail resize proxy, route code-splitting, and lazy row images shipped.

> **Re-measured 2026-08-24:** v1.22.23 self-hosted fonts (`@fontsource`), v1.23.4–6 pašalino latin-ext + `font-display: optional` (CLS 0.17→0.008) — homepage mobile **98**, desktop 99. Žr. CHANGELOG v1.23.4–6.

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
