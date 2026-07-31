# Mobile Standards

**Status:** Dabartinė kodo realybė.
**Paskutinį kartą tikrinta:** 2026-07-29 (v1.22.21).
**Tikrinimo metodika:** auditas gyvai kode — `web/src/components/Layout.tsx`, `ui/BottomNav.tsx`, `touchTargets.ts`, `ListFilterBar.tsx`, `Pagination.tsx`, `useMediaQuery.ts`.

Testavimo viewport'ai: **320–430px** (iPhone SE / standartiniai telefonai). Viewport meta: `web/index.html` — `width=device-width, initial-scale=1`.

> Šis dokumentas = **standartas** (ką laikytis). Audito rezultatus ir testų checklist'ą žiūrėk [MOBILE_UX.md](./MOBILE_UX.md).

---

## 1. Header ir navigacija

| Aspektas | Reikalavimas | Failas |
|----------|--------------|--------|
| Header pozicija | `fixed top-0`, aukštis **72px** mobilui / **84px** `sm+` | `Layout.tsx:56` |
| Content spacer | `h-[72px] sm:h-[84px]` po header — kompensuoja fixed poziciją | `Layout.tsx:326` |
| Mobilus nav | **Bottom nav** fixed bottom (5 tab'ai: Mods, Servers, Trending, Scenarios, Tools). Tools atidaro popover'į su sub-item'ais. Hamburger menu pašalintas. | `ui/BottomNav.tsx`, `Layout.tsx:282` |
| Bottom nav aukštis | `min-h-[56px]`, content turi `pb-14 lg:pb-0` ant root div | `Layout.tsx:52` |
| Tools popover | Atsiranda virš bottom nav. Sub-item'ai: Config Audit, Blockers, Planner, Hosting. | `BottomNav.tsx:24-35` |
| Desktop nav | `hidden lg:flex` — matomas tik nuo **1024px** | `Layout.tsx:75` |
| Meno uždarymas | Automatiškai užsidaro keičiant route (`useEffect` ant `location.pathname`) | `Layout.tsx:49-51` |
| Theater switch (Reforger/A3) | Mobile: toggle blokas viršuje meniu (full-width tab'ai, `py-3`) | `Layout.tsx:222-235` |

**Sticky filter bar** turi atitikti header aukštį: `top-[72px] sm:top-[84px]`. Niekada ne hardcoded kitu skaičiumi.

---

## 2. Touch targets (WCAG 2.5.5)

**44×44px minimum** mobiliame. Naudoti konstantą, nehardcodinti:

```ts
// web/src/lib/touchTargets.ts
export const TOUCH_TARGET_BUTTON =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center';
export const TOUCH_TARGET_GAP = 'gap-2 sm:gap-1.5';
```

- `sm+` (≥640px): compact, be min-dimensijų — pelė yra pirminis įvesties metodas.
- Taikoma: ★ favoritai, Copy, Workshop nuorodos, sortinti stulpelių header'iai, puslapiavimas, gallery lightbox (close/prev/next), toggle mygtukai (7D/30D, scenarijų close/open), audit/planner veiksmų mygtukai.
- Išimtys (intencinės, mažesnės): ConfigAudit bucket filtrų čipsai (~36px), StoragePlanner `text-[8px]` etiketės — tactical tankumo UI, dokumentuota [MOBILE_UX.md](./MOBILE_UX.md) "Known issues".

---

## 3. Duomenų lentelės

Desktop (≥1024px): horizontalus scroll'as su `<table>`.
Mobile (<1024px): **Card-based list** (žr. [7. Card-based list](#7-card-based-list-mobile)).

| Taisyklė | Implementacija |
|----------|----------------|
| Desktop wrapper | `<div className="overflow-x-auto">` aplink kiekvieną lentelę |
| Root | `overflow-x-hidden` ant root `<div>` (`Layout.tsx:54`) — vaikai patys turi turėti `overflow-x-auto` |
| Plačios lentelės (Trending, serveriai) | Leidžiamas horizontalus scroll — priimtinas kompromisas dėl duomenų tankumo |
| Mobile meta | Antriniai duomenys (deploy/share/size) rodomi kompaktiškai **po** pirminiu lauku |
| Sticky stulpelis | Mod leaderboard pavadinimo stulpelis — sticky kairėje |

---

## 4. Puslapiavimas

`web/src/components/ui/Pagination.tsx`:

- **Visuose breakpoint'uose:** numeruotas paging'as (7 langų window, sliding aplink dabartinį).
- Puslapių mygtukai: `min-w-[44px] h-11` — touch target.
- Prev/Next: `w-full` mobiliame (full-width), `sm:w-auto` desktop.
- Etiketė: "Network Slice" / "Module Slice".
- Load More variantas buvo pridėtas ir reverted. Esmė: `useMods`/`useServers` grąžina tik vieno puslapio slice, todėl `onPageChange(currentPage + 1)` veikia kaip "Next page", ne append. Tikras Load More reikalauja akumuliacijos hooks lygmeny.

---

## 5. Filter bar

`web/src/components/ui/ListFilterBar.tsx`:

| Aspektas | Reikalavimas |
|----------|--------------|
| Sticky | `sticky top-[72px] sm:top-[84px] z-40` kai `sticky={true}` (default, pilno puslapio sąrašai). `sticky={false}` embedded sekcijose (detail puslapių viduryje) |
| Grid | `grid-cols-1` mobilui → `md:` / `lg:` / `xl:` pagal laukų skaičių (`columns` prop 2–6). Niekada ne daugiau kaip 1 stulpelis `< md` |
| Reset mygtukas | Ketvirtas stulpelis arba grid pabaigoje; `w-full` kaip ir kiti kontroliai |
| Labeliai | `// SEARCH`, `// ACTIVITY`, `// SORT` — UPPERCASE, `text-[10px]`, `tracking-[0.15em]` |

---

## 6. Charts (telemetry)

`useMediaQuery('(max-width: 639px)')` — `ModDetail.tsx:94`, `ServerDetail.tsx:123`:

- Mobiliui: mažesnės kraštinės (margins), paslepiama antroji Y ašis.
- Legenda **virš** ploto (ne šone).
- Max vienas matomas Y-ašies vienai pusei mobiliame.
- Reikšmės tooltip'e, ne etiketėse ant ploto.
- Tuščios būsenos, kai sync stale (ne tuščias plotas).

---

## 7. Tipografija mobiliame

Paveldima iš [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), bet su mobile patikslinimais:

| Elementas | Mobile |
|-----------|--------|
| Body tekstas | ≥14px (0.875rem) — MIL-STD minimumas |
| Logo antraštė | `text-base` (16px) mobilui, `sm:text-xl` |
| Labeliai/nav | `text-[10px]` UPPERCASE, `tracking-[0.2em]` |
| Footer copyright | `text-[8px]` mobilui, `sm:text-[9px]` |
| Skaičiai lentelėse | JetBrains Mono, `tabular-nums`, dešinėn lygiuoti |

---

## 8. Offline / stale data

- **Service Worker** (vite-plugin-pwa): `NetworkFirst` API užklausoms (`/api/` – 2h cache, max 100, 10s timeout). 28 assets precache.
- **Offline indikatorius**: `OfflineBanner.tsx` — amber bar "UPLINK LOST — Showing cached telemetry", rodomas kai `navigator.onLine === false`. Stebi `online`/`offline` events.
- **Stale data indikacija**: `DataStaleBanner` amber bar po header (ne sinchronizuoti duomenys, ne tinklas).
- **Manifest:** `name: "Arma Mods Intelligence"`, `theme_color: #B8784A`, SVG icon.
- **Auto-update:** `registerType: 'autoUpdate'`.
- IndexedDB persistence dar neįgyvendintas — žr. [Planuojama](#10-planuojama-roadmap).

---

## Responsive breakpoints

| Breakpoint | Width | Mobile reikšmė |
|------------|-------|----------------|
| Default | < 640px | Vienas stulpelis, bottom nav, numbered pagination, card-based list |
| `sm` | 640px+ | Touch target compact; didesnis padding |
| `md` | 768px+ | Filter bar keliauja į kelis stulpelius; author antriniai laukai atsiranda |
| `lg` | 1024px+ | **Bottom nav pasislepia**, desktop top nav matomas; card list → lentelės |

---

## Anti-patterns (ko vengti mobiliame)

1. **Desktop-only patterns mobiliam** — nenaudoti `hover` tooltip'ų kaip vienintelio info šaltinio; mobiliame naudoti tap-to-reveal arba inline.
2. **Hardcoded header aukščiai** sticky pozicijose — visada `top-[72px] sm:top-[84px]`.
3. **Mažesni nei 44px** interaktyvūs elementai be `TOUCH_TARGET_BUTTON` (išskyrus dokumentuotas intencines išimtis).
4. **Lentelė be `overflow-x-auto`** wrapperio desktop'e — sukels page-level overflow prieš `overflow-x-hidden` root.
5. **Daugiau nei 1 stulpelis filter bar `< md`** — `grid-cols-1` privalomas mobiliam.

---

## 7. Card-based list (mobile)

`web/src/components/ui/ModCard.tsx`, `ServerCard.tsx`, `TrendCard.tsx`:

- Mobile (<1024px): vietoj `<table>` eilučių rodomos **kortelės**.
- Valdoma per `useMediaQuery('(max-width: 1023px)')` kiekviename list page (ModList, ServerList, TrendingPage).
- Pinned favorites taip pat rodomi kaip kortelės mobiliame.

**Density principas** (pilna specifikacija [DESIGN_SYSTEM.md "Mobile Data Density Tiers"](./DESIGN_SYSTEM.md#mobile-data-density-tiers)):

Kortelė rodo tik **Pirminius + 1–2 Antrinius** stulpelius. Tretiniai (visi veiksmai, author, size) pasiekiami per detail puslapį – visa kortelė yra Link'as. Horizontal scroll neleidžiamas – pasukti ekraną nereikalaujama.

**Nekeistos lentelės (kol kas):** server detail mod stack, mod detail co-deploy, dependency blockers, scenarios. Joms taikomas `overflow-x-auto` su gradient indikatoriumi.

## 8. Bottom sheets (mobile)

`web/src/components/ui/BottomSheet.tsx`:

- Slide-up panel iš apačios, naudoja `createPortal`.
- Uždaroma backdrop click arba Escape.
- `animate-slide-up` CSS animacija (300ms ease-out).
- **Naudojama:** GalleryLightbox (`useMediaQuery('(max-width: 1023px)')` perjungia tarp desktop overlay ir mobile bottom sheet).
- Kiti modaliai projekte nenaudojami – šis komponentas paruoštas ateičiai.

## 9. Offline / PWA

- **Service Worker** generuojamas per `vite-plugin-pwa` (Workbox `generateSW`).
- **Strategija:** `NetworkFirst` API užklausoms (`/api/` – 2h cache, max 100 entries, 10s timeout).
- **Precache:** 28 assets (JS, CSS, HTML, SVG, woff2). `og-image.png` ignoruojamas (per didelis).
- **Manifest:** `name: "Arma Mods Intelligence"`, `theme_color: #B8784A`, SVG icon.
- **Auto-update:** `registerType: 'autoUpdate'` – nauja SW versija automatiškai užsiregistruoja.
- Dėl pilno offline (IndexedDB persistence) – žr. Planuojama.

---

## 10. Planuojama (Roadmap)

| Planuojama | Dabartinis pakaitalas |
|------------|----------------------|
| IndexedDB persistence (fully offline) | HTTP cache + SW network-first |

---

## Susiję dokumentai

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — pilna dizaino sistema (spalvos, tipografija, komponentai). "Mobile" sekcija ten aprašo **tikslą**, ne realybę.
- [MOBILE_UX.md](./MOBILE_UX.md) — audito rezultatai ir re-test checklist'as.
- [UI_FILTERS.md](./UI_FILTERS.md) — ListFilterBar specifikacija ir lentelės layout.
- [LIGHTHOUSE.md](./LIGHTHOUSE.md) — PageSpeed mobile balai.
