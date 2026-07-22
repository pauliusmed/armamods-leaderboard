# Mobile UX audit

Last reviewed: **2026-07-22** (v1.22.8 stale banner + donation goal). Test at 320–430px width (iPhone SE / standard phones).

Viewport: `web/index.html` — `width=device-width, initial-scale=1`.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Layout / hamburger nav | OK | Full mobile menu, theater switch, 56px menu button |
| Stale data banner | OK (v1.22.8) | Amber bar under header; short copy on mobile + Support CTA `min-h` friendly |
| Mod leaderboard | OK | `overflow-x-auto`, compact meta under name on mobile |
| Server list | OK | Horizontal scroll; modpack size under mod count on mobile |
| Trending | OK | Category tabs 44px; period toggles 44px; table scrolls |
| Mod detail | OK | Chart empty state when sync stale; gallery slideshow |
| Server detail | OK | Chart empty state when sync stale; embed badge + copy 44px |
| Scenarios | OK | Fill % + top server under name on mobile; close/open buttons 44px |
| Storage planner / Audit | OK (fixed v1.22.6) | Touch targets swept — all action buttons `min-h-11` |
| Dependency blockers | OK (fixed v1.22.6) | Search result items + Find blockers 44px |
| Config audit | OK (fixed v1.22.6) | Paste/Upload tabs, Run audit, Clear, Copy buttons 44px |
| Support / donation | OK (v1.22.8) | Progress bar + $25 goal; PayPal CTA |
| Hosting comparison tables | MEDIUM | `min-w-[900px]` inside `overflow-x-auto` — usable but not ideal on mobile |
| Pagination | OK | 44px page buttons |
| Filter bar sticky | OK | `top-[72px] sm:top-[84px]` matches header (banner scrolls with content) |
| Server search landing (new) | OK | Single-column grid, no touch target issues |

---

## Patterns we use

- **`overflow-x-auto`** on all data tables
- **`min-h-11`** — 44px minimum touch height on all interactive elements
- **`TOUCH_TARGET_BUTTON`** — 44×44px min on mobile for Copy / Workshop / ★
- **Hidden columns** — show compact meta under primary cell on `< md` (ModRow deploy/share/size, ScenarioList fill/top server)
- **Charts** — legend above plot; max one visible Y-axis per side on mobile; values in tooltip
- **`useMediaQuery('(max-width: 639px)')`** — chart margins and axis visibility

---

## Known issues (low priority)

Not blockers; revisit if mobile traffic grows:

1. **Hosting comparison tables** (`ReforgerHosting`, `Arma3Hosting`) — `min-w-[900px]` hardcoded; requires horizontal scroll. Consider card-based mobile layout.
2. **ConfigAuditPage bucket filter chips** — ~36px tall (below 44px) but not primary actions; acceptable.
3. **StoragePlannerPage** — `text-[8px]` labels on dense data; intentional tactical aesthetic.
4. **TrendRow / Trending table** — 5 columns need horizontal scroll on narrow screens (acceptable).
5. **Layout `overflow-x-hidden`** — intentional; children that need scroll must use own `overflow-x-auto`.
6. **ScenarioList `max-w-[10rem]`** on top server name may truncate on 320px.

---

## Re-test checklist

```text
[ ] Mod list — mod names readable at 320px; deploy/share under name
[ ] Mod detail — chart legend + full-width plot; deployed servers header fits
[ ] Server detail — history chart not squeezed; rank axis readable; embed buttons 44px
[ ] Server list — horizontal scroll smooth; ★ tappable
[ ] Scenarios — fill % visible under scenario name; close/open workshop 44px
[ ] Trending — category tabs 44px
[ ] Config audit — Run audit / Clear / Copy buttons 44px
[ ] Storage planner — Analyze / preset buttons 44px
[ ] Dependency blockers — Find blockers / search results 44px
[ ] Filter bar — sticks below header without gap/overlap when scrolling
[ ] Pagination — Prev/Next full width on mobile
```

PageSpeed mobile lab score: see [LIGHTHOUSE.md](./LIGHTHOUSE.md) (98 Performance as of 2026-07-09).
