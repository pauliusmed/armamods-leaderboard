# Mobile UX audit

Last reviewed: **2026-07-25** (v1.22.15 — hosting cards + touch targets). Test at 320–430px width (iPhone SE / standard phones).

Viewport: `web/index.html` — `width=device-width, initial-scale=1`.

**Verdict:** **OK** mobile-friendly — main lists/detail/tools and hosting comparison no longer force awkward page spill; remaining notes are intentional dense UI or acceptable table scroll on wide data grids.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Layout / hamburger nav | OK | Full mobile menu, theater switch, 56px menu button; root `overflow-x-hidden` |
| Stale data banner | OK (v1.22.15) | Amber bar under header; short copy on mobile; Community Fund CTA `min-h-11` |
| Mod leaderboard | OK | `overflow-x-auto`, compact meta under name on mobile |
| Server list | OK | Horizontal scroll; modpack size under mod count on mobile |
| Trending | OK | Category tabs 44px; period toggles 44px; table scrolls |
| Mod detail | OK | Chart empty state when sync stale; gallery slideshow; mobile chart margins |
| Server detail | OK | Chart empty state; embed badge + copy 44px; mobile chart margins |
| Mod Changes (ServerDetail) | OK (v1.22.15) | 7D/30D `min-h-11`; single-column cards on `<md`; mod name links `break-words` |
| Scenarios | OK (v1.22.15) | Fill % + top server under name; top server wraps (`break-words`); close/open 44px |
| Storage planner / Audit | OK (v1.22.15) | Primary + secondary (“Use this set” / “Inspect” / “Use instead”) `min-h-11` |
| Dependency blockers | OK (fixed v1.22.6) | Search result items + Find blockers 44px |
| Config audit | OK (fixed v1.22.6) | Paste/Upload tabs, Run audit, Clear, Copy buttons 44px |
| Support / donation | OK (v1.22.8+) | Progress bar + goal; PayPal CTA large (`py-4` / `py-6`) |
| Hosting comparison | OK (v1.22.15) | Stacked cards below `md`; table `min-w-[900px]` only from `md:` up |
| Gallery lightbox | OK (v1.22.15) | Close / prev / next `min-h-11 min-w-11` |
| Pagination | OK | 44px page buttons; Prev/Next full width on mobile |
| Filter bar sticky | OK | `top-[72px] sm:top-[84px]` matches header (banner scrolls with content) |
| Server search landing | OK | Single-column grid, no touch target issues |

---

## Patterns we use

- **`overflow-x-auto`** on all data tables
- **`min-h-11`** — 44px minimum touch height on all interactive elements
- **`TOUCH_TARGET_BUTTON`** — 44×44px min on mobile for Copy / Workshop / ★
- **Hidden columns** — show compact meta under primary cell on `< md` (ModRow deploy/share/size, ScenarioList fill/top server)
- **Hosting** — card stack on `< md`, comparison table from `md:` (keeps desktop density without mobile horizontal scroll)
- **Charts** — legend above plot; max one visible Y-axis per side on mobile; values in tooltip
- **`useMediaQuery('(max-width: 639px)')`** — chart margins and axis visibility

---

## Known issues (low priority / intentional)

Not page-break blockers:

1. **ConfigAuditPage bucket filter chips** — card tiles are fine; dense secondary UI elsewhere ~36px acceptable.
2. **StoragePlannerPage** — `text-[8px]` labels on dense data; intentional tactical aesthetic.
3. **TrendRow / Trending table** — 5 columns need horizontal scroll on narrow screens (acceptable).
4. **Layout `overflow-x-hidden`** — intentional; children that need scroll must use own `overflow-x-auto`.
5. **SupportPage** hero `text-5xl` on 320px wraps aggressively but stays readable.

---

## Re-test checklist

```text
[ ] Mod list — mod names readable at 320px; deploy/share under name
[ ] Mod detail — chart legend + full-width plot; deployed servers header fits
[ ] Server detail — history chart not squeezed; rank axis readable; embed buttons 44px
[ ] Mod Changes — 7D/30D toggles 44px; day cards single-column; long mod names wrap
[ ] Server list — horizontal scroll smooth; ★ tappable
[ ] Scenarios — fill % visible under scenario name; top server wraps; close/open workshop 44px
[ ] Trending — category tabs 44px
[ ] Config audit — Run audit / Clear / Copy buttons 44px
[ ] Storage planner — Analyze / preset / Use this set / Inspect / Use instead 44px
[ ] Dependency blockers — Find blockers / search results 44px
[ ] Filter bar — sticks below header without gap/overlap when scrolling
[ ] Pagination — Prev/Next full width on mobile
[ ] Gallery lightbox — close / prev / next 44px
[ ] Hosting — cards on mobile; table from md+; no page-level overflow
[ ] Stale banner — Community Fund CTA 44px
```

PageSpeed mobile lab score: see [LIGHTHOUSE.md](./LIGHTHOUSE.md) (98 Performance as of 2026-07-09).
