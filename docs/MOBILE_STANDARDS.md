# Mobile Standards

**Status:** current state of the code.
**Last reviewed:** 2026-07-29 (v1.22.21).
**Method:** audit of the live code — `web/src/components/Layout.tsx`, `ui/BottomNav.tsx`, `touchTargets.ts`, `ListFilterBar.tsx`, `Pagination.tsx`, `useMediaQuery.ts`.

Test viewports: **320–430px** (iPhone SE and standard phones). Viewport meta in `web/index.html` — `width=device-width, initial-scale=1`.

> This document is the **standard** (what to follow). Audit results and the test checklist live in [MOBILE_UX.md](./MOBILE_UX.md).

---

## 1. Header and navigation

| Aspect | Requirement | File |
|--------|-------------|------|
| Header position | `fixed top-0`, height **72px** on mobile / **84px** at `sm+` | `Layout.tsx:56` |
| Content spacer | `h-[72px] sm:h-[84px]` below the header — compensates for the fixed position | `Layout.tsx:326` |
| Mobile nav | **Bottom nav**, fixed bottom (5 tabs: Mods, Servers, Trending, Scenarios, Tools). Tools opens a popover with sub-items. The hamburger menu was removed. | `ui/BottomNav.tsx`, `Layout.tsx:282` |
| Bottom nav height | `min-h-[56px]`; content needs `pb-14 lg:pb-0` on the root div | `Layout.tsx:52` |
| Tools popover | Opens above the bottom nav. Sub-items: Config Audit, Blockers, Planner, Hosting. | `BottomNav.tsx:24-35` |
| Desktop nav | `hidden lg:flex` — visible from **1024px** | `Layout.tsx:75` |
| Closing the menu | Closes automatically on route change (`useEffect` on `location.pathname`) | `Layout.tsx:49-51` |
| Theatre switch (Reforger/A3) | Mobile: toggle block above the menu (full-width tabs, `py-3`) | `Layout.tsx:222-235` |

The **sticky filter bar** must match the header height: `top-[72px] sm:top-[84px]`. Never hardcode another number.

---

## 2. Touch targets (WCAG 2.5.5)

**44×44px minimum** on mobile. Use the constant, do not hardcode:

```ts
// web/src/lib/touchTargets.ts
export const TOUCH_TARGET_BUTTON =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center';
export const TOUCH_TARGET_GAP = 'gap-2 sm:gap-1.5';
```

- `sm+` (≥640px): compact, no minimum dimensions — the mouse is the primary input method there.
- Applied to: ★ favourites, Copy, Workshop links, sortable column headers, pagination, the gallery lightbox (close/prev/next), toggle buttons (7D/30D, scenario close/open), audit and planner action buttons.
- Intentional exceptions (smaller): ConfigAudit bucket filter chips (~36px) and the StoragePlanner `text-[8px]` labels — a deliberately dense tactical UI, documented under "Known issues" in [MOBILE_UX.md](./MOBILE_UX.md).

---

## 3. Data tables

Desktop (≥1024px): horizontal scroll inside a `<table>`.
Mobile (<1024px): **card-based list** (see [7. Card-based list](#7-card-based-list-mobile)).

| Rule | Implementation |
|------|----------------|
| Desktop wrapper | `<div className="overflow-x-auto">` around every table |
| Root | `overflow-x-hidden` on the root `<div>` (`Layout.tsx:54`) — children must provide their own `overflow-x-auto` |
| Wide tables (trending, servers) | Horizontal scroll is allowed — an accepted compromise for data density |
| Mobile meta | Secondary data (deploy/share/size) shown compactly **below** the primary field |
| Sticky column | The mod leaderboard name column — sticky on the left |

---

## 4. Pagination

`web/src/components/ui/Pagination.tsx`:

- **At every breakpoint:** numbered paging (a 7-slot window sliding around the current page).
- Page buttons: `min-w-[44px] h-11` — touch target.
- Prev/Next: `w-full` on mobile, `sm:w-auto` on desktop.
- Label: "Network Slice" / "Module Slice".
- A Load More variant was added and reverted. The point: `useMods`/`useServers` return a single page slice, so `onPageChange(currentPage + 1)` behaves as "next page", not append. Real Load More needs accumulation at the hooks level.

---

## 5. Filter bar

`web/src/components/ui/ListFilterBar.tsx`:

| Aspect | Requirement |
|--------|-------------|
| Sticky | `sticky top-[72px] sm:top-[84px] z-40` when `sticky={true}` (default for full-page lists). `sticky={false}` in embedded sections (mid-page on detail views) |
| Grid | `grid-cols-1` on mobile → `md:` / `lg:` / `xl:` by field count (`columns` prop 2–6). Never more than one column below `md` |
| Reset button | Fourth column or last in the grid; `w-full` like the other controls |
| Labels | `// SEARCH`, `// ACTIVITY`, `// SORT` — uppercase, `text-[10px]`, `tracking-[0.15em]` |

---

## 6. Charts (telemetry)

`useMediaQuery('(max-width: 639px)')` — `ModDetail.tsx:94`, `ServerDetail.tsx:123`:

- Mobile: smaller margins, the second Y axis is hidden.
- Legend **above** the plot (not beside it).
- At most one visible Y axis per side on mobile.
- Values in the tooltip, not as labels on the plot.
- Empty states when sync is stale (never a blank plot).

---

## 7. Typography on mobile

Inherited from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), with mobile adjustments:

| Element | Mobile |
|---------|--------|
| Body text | ≥14px (0.875rem) — the MIL-STD minimum |
| Logo heading | `text-base` (16px) on mobile, `sm:text-xl` |
| Labels/nav | `text-[10px]` uppercase, `tracking-[0.2em]` |
| Footer copyright | `text-[8px]` on mobile, `sm:text-[9px]` |
| Numbers in tables | JetBrains Mono, `tabular-nums`, right-aligned |

---

## 8. Offline / stale data

- **Service Worker** (vite-plugin-pwa, `generateSW`): **no `runtimeCaching` blocks** — `web/vite.config.ts:71` says "*No runtimeCaching for `/api/*` on purpose*" (a live leaderboard is never answered from the SW cache; a 10s timeout caused a phantom "No matches found"). Freshness comes from edge `Cache-Control` plus the client in-memory cache. `navigateFallbackDenylist: [/^\/api\//]`. **85** assets precached.
- **Offline indicator:** `OfflineBanner.tsx` — amber bar "UPLINK LOST — Showing cached telemetry", shown when `navigator.onLine === false`. It listens to `online`/`offline` events.
- **Stale data indicator:** `DataStaleBanner` amber bar below the header (data is out of sync, not the network).
- **Manifest:** `name: "Arma Mods Intelligence"`, `theme_color: #B8784A`, SVG icon.
- **Auto-update:** `registerType: 'autoUpdate'`.
- **IndexedDB persistence implemented:** `web/src/lib/db.ts` — `indexedDB.open('armamods-cache')` plus `persistentCache` (stale-while-revalidate, in-flight dedupe, 7 d `prune()`). See [docs/PERFORMANCE.md](./PERFORMANCE.md).

---

## Responsive breakpoints

| Breakpoint | Width | Mobile meaning |
|------------|-------|----------------|
| Default | < 640px | One column, bottom nav, numbered pagination, card-based list |
| `sm` | 640px+ | Compact touch targets; larger padding |
| `md` | 768px+ | Filter bar splits into columns; secondary author fields appear |
| `lg` | 1024px+ | **Bottom nav hides**, desktop top nav appears; card list becomes tables |

---

## Anti-patterns (what to avoid on mobile)

1. **Desktop-only patterns on mobile** — do not use `hover` tooltips as the only source of information; use tap-to-reveal or inline content.
2. **Hardcoded header heights** in sticky positions — always `top-[72px] sm:top-[84px]`.
3. **Interactive elements smaller than 44px** without `TOUCH_TARGET_BUTTON` (except the documented intentional exceptions).
4. **A table without an `overflow-x-auto` wrapper** on desktop — it causes page-level overflow against the `overflow-x-hidden` root.
5. **More than one filter-bar column below `md`** — `grid-cols-1` is mandatory on mobile.

---

## 7. Card-based list (mobile)

`web/src/components/ui/ModCard.tsx`, `ServerCard.tsx`, `TrendCard.tsx`:

- Mobile (<1024px): **cards** are rendered instead of `<table>` rows.
- Controlled by `useMediaQuery('(max-width: 1023px)')` on each list page (ModList, ServerList, TrendingPage).
- Pinned favourites are also rendered as cards on mobile.

**Density principle** (full specification in [DESIGN_SYSTEM.md "Mobile Data Density Tiers"](./DESIGN_SYSTEM.md#mobile-data-density-tiers)):

A card shows only the **primary plus 1–2 secondary** columns. Tertiary data (all actions, author, size) is reachable on the detail page — the whole card is a link. Horizontal scroll is not allowed; the user is never asked to rotate the screen.

**Tables not converted yet:** server detail mod stack, mod detail co-deploy, dependency blockers, scenarios. They use `overflow-x-auto` with a gradient indicator.

## 8. Bottom sheets (mobile)

`web/src/components/ui/BottomSheet.tsx`:

- Slide-up panel from the bottom, using `createPortal`.
- Closes on backdrop click or Escape.
- `animate-slide-up` CSS animation (300ms ease-out).
- **Used by:** GalleryLightbox (`useMediaQuery('(max-width: 1023px)')` switches between the desktop overlay and the mobile bottom sheet).
- No other modals exist in the project — the component is ready for future use.

## 9. Offline / PWA

- **Service Worker** generated by `vite-plugin-pwa` (Workbox `generateSW`).
- **Strategy:** **no `runtimeCaching`** — `/api/*` is never answered from the SW cache (see `web/vite.config.ts:71`).
- **Precache:** 85 assets (JS, CSS, HTML, SVG, woff2). `globIgnores: ['**/og-*.png', 'brand/**/*']`.
- **Manifest:** `name: "Arma Mods Intelligence"`, `theme_color: #B8784A`, SVG icon.
- **Auto-update:** `registerType: 'autoUpdate'` — a new SW version registers itself.
- For full offline support: **IndexedDB is already implemented** (`web/src/lib/db.ts` → `persistentCache`) — see [PERFORMANCE.md](./PERFORMANCE.md).

---

## 10. Roadmap

| Planned | Current substitute |
|---------|--------------------|
| IndexedDB persistence | ✅ implemented (`web/src/lib/db.ts` → `persistentCache`) |

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — the full design system (colours, typography, components). Its "Mobile" section describes the **intent**, not the reality.
- [MOBILE_UX.md](./MOBILE_UX.md) — audit results and the re-test checklist.
- [UI_FILTERS.md](./UI_FILTERS.md) — ListFilterBar specification and table layout.
- [LIGHTHOUSE.md](./LIGHTHOUSE.md) — PageSpeed mobile scores.
