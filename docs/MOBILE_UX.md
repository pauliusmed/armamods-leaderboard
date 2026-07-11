# Mobile UX audit

Last reviewed: **2026-07-11** (v1.22.5 fixes). Test at 320–430px width (iPhone SE / standard phones).

Viewport: `web/index.html` — `width=device-width, initial-scale=1`.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Layout / hamburger nav | OK | Full mobile menu, theater switch, 56px menu button |
| Mod leaderboard | OK (fixed v1.22.5) | Was CRITICAL: `table-fixed` crushed Module column |
| Server list | OK | Horizontal scroll; modpack fallback under mod count |
| Trending | OK | Period tabs 44px; table scrolls |
| Mod detail | OK | Chart legend, mobile axes (v1.22.4) |
| Server detail | OK (fixed v1.22.5) | Chart mobile margins; players axis hidden on small screens |
| Scenarios | OK | Fill % + top server under name on mobile |
| Storage planner / Audit | MEDIUM | Usable; dense text and small secondary buttons |
| Pagination | OK | 44px page buttons |
| Filter bar sticky | OK (fixed v1.22.5) | `top-[72px] sm:top-[84px]` matches header |

---

## Patterns we use

- **`overflow-x-auto`** on all data tables
- **`TOUCH_TARGET_BUTTON`** — 44×44px min on mobile for Copy / Workshop / ★
- **Hidden columns** — show compact meta under primary cell on `< md` (ModRow deploy/share/size, ScenarioList fill/top server)
- **Charts** — legend above plot; max one visible Y-axis per side on mobile; values in tooltip
- **`useMediaQuery('(max-width: 639px)')`** — chart margins and axis visibility

---

## Remaining low-priority items

Not blockers; revisit if mobile traffic grows:

1. **ServerDetail mod stack table** — many filter fields = long vertical scroll; consider collapsible filters on mobile
2. **StoragePlannerPage** — `text-[8px]` labels; action buttons could use `min-h-11` everywhere
3. **ConfigAuditPage** — bucket filter chips ~36px tall
4. **TrendRow / Trending table** — 5 columns still need horizontal scroll on narrow screens (acceptable)
5. **Layout `overflow-x-hidden`** — intentional; children that need scroll must use own `overflow-x-auto`

---

## Re-test checklist

```text
[ ] Mod list — mod names readable at 320px; deploy/share under name
[ ] Mod detail — chart legend + full-width plot; deployed servers header fits
[ ] Server detail — history chart not squeezed; rank axis readable
[ ] Server list — horizontal scroll smooth; ★ tappable
[ ] Scenarios — fill % visible under scenario name
[ ] Filter bar — sticks below header without gap/overlap when scrolling
[ ] Pagination — Prev/Next full width on mobile
```

PageSpeed mobile lab score: see [LIGHTHOUSE.md](./LIGHTHOUSE.md) (98 Performance as of 2026-07-09).
