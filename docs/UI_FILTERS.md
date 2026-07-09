# List filters (UI)

Unified filter toolbar used across leaderboard and detail pages. English labels, shared vocabulary, one visual system.

## Component

`web/src/components/ui/ListFilterBar.tsx`

| Prop | Purpose |
|------|---------|
| `search` | Labeled search input (`// SEARCH`) |
| `selects` | Labeled `<select>` fields (`// ACTIVITY`, `// SORT`, …) |
| `onReset` | Optional **Reset** button (fourth column or end of grid) |
| `sticky` | `true` on full-page lists (default); `false` on embedded sections |
| `columns` | Responsive grid width (2–6) |
| `footer` | Helper text below bar (e.g. console fit disclaimer) |

Shared option labels live in `web/src/lib/modListFilters.ts` so server detail and leaderboards stay aligned.

## Where it is used

| Page | Route | Controls |
|------|-------|----------|
| Mod leaderboard | `/`, `/arma3` | Search (name, id, **author** on Reforger) · Activity · Sort · Reset · **★ Favorites** block (page 1, no search) |
| Trending | `/trending` | Rising / Falling / New tables — same filter vocabulary; **★ Favorites** above active category |
| Server network | `/servers` | Search · Sort · **Status** (online/offline) · Console fit (Reforger) · Reset · **★** column · **Favorites** pin (page 1, default filters) |
| Scenario leaderboard | `/scenarios` | Search · Sort · Reset |
| Server detail mod stack | `/server/:id` | Search · Activity · Rank · **Size** (Reforger) · Sort · Reset |
| Server detail history | `/server/:id` | 24H / 1M / 1Y chart — rank, players, **offline bands** (see [SERVER_UPTIME.md](SERVER_UPTIME.md)) |

### Server detail — extra filters

Console-focused filters only on **Installed Mod Stack**:

- **Size** — All / Heavy (≥500 MB) / Medium / Small / Unknown (uses workshop `sizeBytes` from storage API)
- **Sort** — Personnel, Size (largest/smallest), Global Rank, Deploy, Share, Name

Filter logic: `filterServerMods()` + `sortServerMods()` in `modListFilters.ts` (unit-tested in `test/mod-list-filters.test.ts`).

## Row actions (not in filter bar)

Shared **Actions** column on mod list tables (leaderboard + trending):

| Control | Component | Behavior |
|---------|-----------|----------|
| **★** | `FavoriteModButton` | Toggle mod bookmark (`localStorage`, max 20/game); sync via `useModFavorites` |
| **★** (servers) | `FavoriteServerButton` | Toggle server bookmark (`useServerFavorites`, max 20/game) |
| **Copy** | `CopyModConfigButton` | Copies `game.mods[]` snippet (`modId` + `name`) to clipboard |
| **Workshop ↗** | link | Opens Reforger Workshop page (`workshopPageUrl`) |

Mod detail **Co-deploy** table (`CoDeployTable`): **Shared servers** (count on same network), % of deploys, network rank — not global Personnel/Deploy from mod leaderboard rows.

Server list/detail: **`BmLastSeenHint`** — “last seen online” from collector scans (`bmLastSeenAt`).

Copy targets use `touchTargets.ts` (44px min on mobile).

Server detail header: **Copy mods** — full modpack as chained `game.mods[]` blocks.

Mod detail hero: compact `ModConfigPanel` with the same single-mod copy.

User-facing labels for data sources: `web/src/lib/siteCopy.ts` (avoid vendor names in primary UI).

## Mod leaderboard table layout (v1.22.1)

`web/src/components/ui/ModLeaderboardHead.tsx` — shared `<thead>` for the main list and pinned favorites (single `<table>`, `table-fixed`).

| Column | Width / notes |
|--------|----------------|
| Rank | `w-14` |
| Module | flexible (`min-w-0`) |
| Author | `140px` (desktop) |
| Personnel | `5.5rem`, right-aligned |
| Deploy / Size | fixed rem widths, right-aligned |
| Share | `7.5rem`; header uses `mirrorBar` spacer to align with % + progress bar |
| Actions | `11rem` — ★, Copy, Workshop |

Pagination sits **inside** the table card (`Pagination` + `sliceLabel="Module Slice"`). Donation card is **below** the card, not between rows and page buttons.

Mod detail **gallery**: `ModWorkshopGallery` + `GalleryLightbox` — click screenshot for in-page preview (v1.21).

## Label convention

- Field labels: `// SEARCH`, `// ACTIVITY`, `// SORT`, `// SIZE`, `// RANK`, `// CONSOLE`
- Option text: readable English (`Activity: High (500+)`, `Sort: Modpack Size`, `Console: Fits PS5 (25 GB)`)
- Placeholders: `Search mods or author…`, `Search servers…`, `Search scenarios…`

### Mod leaderboard search (Reforger)

`GET /api/mods?search=` matches **name**, **mod id**, and **workshop author** (cached in KV from prior workshop scrapes). Author is not scraped live during list search — mods without a cached author only match on name/id until their workshop page was resolved once.

Activity thresholds (shared everywhere):

| Tier | Players |
|------|---------|
| High | ≥ 500 |
| Medium | 100–499 |
| Low | &lt; 100 |

Size tiers (server detail, Reforger):

| Tier | Download size |
|------|----------------|
| Heavy | ≥ 500 MB |
| Medium | 100–499 MB |
| Small | &lt; 100 MB |
| Unknown | no cached workshop size |

## Adding a new filter surface

1. Add option constants to `modListFilters.ts` if reusable.
2. Compose `ListFilterBar` with `columns` matching field count.
3. Use `sticky={false}` when the bar sits mid-page (detail sections).
4. Keep server-side vs client-side filtering unchanged — this doc covers UI only.

See also: [STORAGE_PLANNER.md](STORAGE_PLANNER.md) (server detail mod sizes + planner link), [SERVER_UPTIME.md](SERVER_UPTIME.md) (offline chart bands).
