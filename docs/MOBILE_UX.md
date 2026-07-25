# Mobile UX audit

Last reviewed: **2026-07-25** (v1.22.14 — Mod Changes + re-audit). Test at 320–430px width (iPhone SE / standard phones).

Viewport: `web/index.html` — `width=device-width, initial-scale=1`.

**Verdict:** **MOSTLY** mobile-friendly — main lists/detail/tools do not distort or spill the page; remaining gaps are horizontal-scroll tables and a few sub-44px secondary controls.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Layout / hamburger nav | OK | Full mobile menu, theater switch, 56px menu button; root `overflow-x-hidden` |
| Stale data banner | OK (v1.22.8) | Amber bar under header; short copy on mobile; Support CTA usable (`py-2`, no `min-h-11`) |
| Mod leaderboard | OK | `overflow-x-auto`, compact meta under name on mobile |
| Server list | OK | Horizontal scroll; modpack size under mod count on mobile |
| Trending | OK | Category tabs 44px; period toggles 44px; table scrolls |
| Mod detail | OK | Chart empty state when sync stale; gallery slideshow; mobile chart margins |
| Server detail | OK | Chart empty state; embed badge + copy 44px; mobile chart margins |
| Mod Changes (ServerDetail) | OK (v1.22.12) | 7D/30D `min-h-11`; single-column cards on `<md`; added/removed lists stack |
| Scenarios | OK | Fill % + top server under name on mobile; close/open buttons 44px |
| Storage planner / Audit | OK (fixed v1.22.6) | Primary actions `min-h-11`; some secondary result buttons still ~36px |
| Dependency blockers | OK (fixed v1.22.6) | Search result items + Find blockers 44px |
| Config audit | OK (fixed v1.22.6) | Paste/Upload tabs, Run audit, Clear, Copy buttons 44px |
| Support / donation | OK (v1.22.8+) | Progress bar + goal; PayPal CTA large (`py-4` / `py-6`) |
| Hosting comparison tables | MEDIUM | `min-w-[900px]` inside `overflow-x-auto` — usable but not ideal on mobile |
| Pagination | OK | 44px page buttons; Prev/Next full width on mobile |
| Filter bar sticky | OK | `top-[72px] sm:top-[84px]` matches header (banner scrolls with content) |
| Server search landing | OK | Single-column grid, no touch target issues |

---

## Patterns we use

- **`overflow-x-auto`** on all data tables
- **`min-h-11`** — 44px minimum touch height on all interactive elements
- **`TOUCH_TARGET_BUTTON`** — 44×44px min on mobile for Copy / Workshop / ★
- **Hidden columns** — show compact meta under primary cell on `< md` (ModRow deploy/share/size, ScenarioList fill/top server)
- **Charts** — legend above plot; max one visible Y-axis per side on mobile; values in tooltip
- **`useMediaQuery('(max-width: 639px)')`** — chart margins and axis visibility

---

## Known issues (low–medium priority)

Not page-break blockers; revisit if mobile traffic grows:

1. **Hosting comparison tables** (`ReforgerHosting`, `Arma3Hosting`) — `min-w-[900px]` hardcoded; requires horizontal scroll. Consider card-based mobile layout. **MEDIUM**
2. **GalleryLightbox** — prev/next `w-10 h-10` (40px), close `w-9 h-9` (36px); below 44px pattern. Dot hit areas OK via `p-3`. **LOW**
3. **Mod Changes links** (`ServerDetail`) — mod name `Link`s lack `break-words` / `truncate`; rare ultra-long unbroken names could clip inside card (page still clipped by Layout `overflow-x-hidden`). **LOW**
4. **StoragePlannerPage** secondary actions — “Use this set” / “Inspect” / “Use instead” / some server-picker rows use `py-2` without `min-h-11`. Primary Analyze / presets OK. **LOW**
5. **DataStaleBanner** Support CTA — `px-3 py-2` (~36px), not `min-h-11`. **LOW**
6. **ConfigAuditPage bucket filter chips** — card tiles are fine; dense secondary UI elsewhere ~36px acceptable.
7. **StoragePlannerPage** — `text-[8px]` labels on dense data; intentional tactical aesthetic.
8. **TrendRow / Trending table** — 5 columns need horizontal scroll on narrow screens (acceptable).
9. **Layout `overflow-x-hidden`** — intentional; children that need scroll must use own `overflow-x-auto`.
10. **ScenarioList `max-w-[10rem]`** on top server name may truncate on 320px.
11. **SupportPage** hero `text-5xl` on 320px wraps aggressively but stays readable.

---

## Re-test checklist

```text
[ ] Mod list — mod names readable at 320px; deploy/share under name
[ ] Mod detail — chart legend + full-width plot; deployed servers header fits
[ ] Server detail — history chart not squeezed; rank axis readable; embed buttons 44px
[ ] Mod Changes — 7D/30D toggles 44px; day cards single-column; long mod names wrap
[ ] Server list — horizontal scroll smooth; ★ tappable
[ ] Scenarios — fill % visible under scenario name; close/open workshop 44px
[ ] Trending — category tabs 44px
[ ] Config audit — Run audit / Clear / Copy buttons 44px
[ ] Storage planner — Analyze / preset buttons 44px
[ ] Dependency blockers — Find blockers / search results 44px
[ ] Filter bar — sticks below header without gap/overlap when scrolling
[ ] Pagination — Prev/Next full width on mobile
[ ] Gallery lightbox — close / prev / next reachable on phone
[ ] Hosting — table scrolls horizontally without page-level overflow
```

PageSpeed mobile lab score: see [LIGHTHOUSE.md](./LIGHTHOUSE.md) (98 Performance as of 2026-07-09).
