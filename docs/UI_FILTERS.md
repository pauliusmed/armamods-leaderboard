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
| Mod leaderboard | `/`, `/arma3` | Search (name, id, **author** on Reforger) · Activity · Sort · Reset |
| Server network | `/servers` | Search · Sort · Console fit (Reforger) · Reset |
| Scenario leaderboard | `/scenarios` | Search · Sort · Reset |
| Server detail mod stack | `/server/:id` | Search · Activity · Rank · **Size** (Reforger) · Sort · Reset |

### Server detail — extra filters

Console-focused filters only on **Installed Mod Stack**:

- **Size** — All / Heavy (≥500 MB) / Medium / Small / Unknown (uses workshop `sizeBytes` from storage API)
- **Sort** — Personnel, Size (largest/smallest), Global Rank, Deploy, Share, Name

Filter logic: `filterServerMods()` + `sortServerMods()` in `modListFilters.ts` (unit-tested in `test/mod-list-filters.test.ts`).

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

See also: [STORAGE_PLANNER.md](STORAGE_PLANNER.md) (server detail mod sizes + planner link).
