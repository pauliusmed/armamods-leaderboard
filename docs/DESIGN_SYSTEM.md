# Design System

## Brand Identity

The site adopts a **tactical / military intelligence** aesthetic — a deliberate departure from generic gaming leaderboards. Every visual choice reinforces the fiction of a mission-command center monitoring live battlefield telemetry.

### Voice & Terminology

| Term | Meaning |
|------|---------|
| Mods Database | Mod leaderboard |
| Active Servers | Server list |
| Trending Intel | Mod trending |
| Personnel | Player count |
| Deploy | Server count |
| Network Slice | Page number |
| Previous Intel / Next Sector | Pagination |
| System Diagnostics | Status page |
| Telemetry | Data / analytics |
| Encryption Active | Site is operational |
| CONNECTION FAILED | Network error |

See also: `src/lib/siteCopy.ts` for user-facing copy constants.

---

## Color Palette

### Core

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-tactical-orange` | `#ff6b00` | Primary accent — interactive elements, highlights, rank badges, hover states |
| `--color-military-green` | `#3a4d39` | Secondary accent (rare) |
| `--color-military-dark` | `#121510` | Dark surfaces |

### Background

| Context | Color |
|---------|-------|
| Page body | `#000000` |
| Cards / containers | `bg-zinc-950/40` (`#09090b` at 40%) |
| Elevated surfaces | `bg-[#050505]`, `bg-[#0a0a0a]` |
| Table rows | `bg-black/40` |
| Hover row | `bg-white/[0.03]` |

### Text

| Token | Color | Usage |
|-------|-------|-------|
| Primary | `text-white` (`#fff`) | Headings, key values |
| Body | `text-gray-300` → `text-gray-500` | Data, descriptions |
| Muted | `text-gray-600` / `text-gray-700` | Secondary labels, footnotes |
| Accent | `text-tactical-orange` | Active nav, rank highlights, CTAs |
| Success | `text-green-500` | Rising mods, online status |
| Danger | `text-red-500` | Errors, falling mods |

### Borders

| Token | Usage |
|-------|-------|
| `border-white/5` | Default card/table borders |
| `border-white/10` | Stronger separation (nav, th) |
| `border-tactical-orange/20` | Accent borders (hover, favorites) |
| `border-tactical-orange/40` | Button borders |

---

## Typography

| Context | Font | Weight | Size |
|---------|------|--------|------|
| Body | `Inter`, system-ui | `font-medium` | `text-xs` → `text-sm` |
| Headings | Inherit (Inter) | `font-black` (900) | `text-lg` → `text-3xl` |
| Data values | `font-mono` | `font-black` | `text-sm` tabular-nums |
| Labels | Inherit | `font-black` | `text-[9px]` → `text-[11px]` |
| Nav links | Inherit | `font-bold` | `text-[10px]` |

### Text Conventions

- All labels are **UPPERCASE** with wide letter-spacing (`tracking-[0.1em]` to `tracking-[0.4em]`)
- Monospace for all numeric data (player counts, ranks, percentages)
- Very small secondary text (`text-[7px]` to `text-[9px]`) is deliberate — creates dense, dashboard-like hierarchy

---

## Layout

### Page Structure

```
Header (fixed top, 72px / 84px on sm+)
  └─ Logo + Nav + Mobile hamburger
Main (max-w-screen-2xl, px-4 sm:px-8, py-8 sm:py-12)
  └─ Content
Footer (border-t, bg-[#0a0c08])
```

### Grid Background

A subtle dot-grid overlay (`radial-gradient(#fff 1px, transparent 0)`) at 3% opacity spans the entire page — reinforces the tactical/command-center feel.

### Scanline Overlay

```css
body::before {
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
  background-size: 100% 2px, 3px 100%;
  opacity: 0.15;
  pointer-events: none;
}
```

A CRT scanline effect applied globally — subtle, non-intrusive.

---

## Components

### Card

File: `src/components/ui/Card.tsx`

- Background: `bg-zinc-950/40 border border-white/5`
- Hover: lifts border to `border-tactical-orange/20`, adds top-right / bottom-left corner accents
- Scanline hover effect: gradient overlay at 2% opacity

### Buttons

| Variant | Classes |
|---------|---------|
| Primary (orange) | `bg-tactical-orange text-black font-black uppercase tracking-widest` |
| Secondary (ghost) | `bg-transparent border border-white/10 text-gray-500 hover:text-white hover:border-white/30` |
| Tonal | `bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange` |
| Pagination | `bg-zinc-900 border border-white/10 hover:bg-tactical-orange hover:text-black` |

All interactive elements use `transition-all duration-300` for smooth hover states.

### Tables

- Container: `overflow-x-auto` on a wrapper div
- Table: `w-full border-collapse`
- Header row: `border-b border-white/10`
- Data rows: `border-b border-white/5` with `hover:bg-white/[0.03]`
- Column layout is fixed-width on leaderboard (`ModLeaderboardHead`), flexible elsewhere
- Non-essential columns hidden at breakpoints (see [MOBILE_UX.md](./MOBILE_UX.md))

### Status Messages

File: `src/components/ui/StatusState.tsx`

- Loading: pulsing orange dots, "Establishing Uplink…" / "Fetching Telemetry…" / "Processing Intel…"
- Error: warning icon, red "CONNECTION FAILED" heading
- Empty: "NO DATA FOUND" with yellow accent

---

## Motion

| Context | Duration | Easing |
|---------|----------|--------|
| Page enter | 700ms | `fade-in` + optional `slide-in-from-bottom-4` |
| Hover transitions | 300ms | Default |
| Nav dropdown | 200ms | Default |
| Mobile menu | 300ms | `duration-300` |

---

## Spacing System

| Scale | Usage |
|-------|-------|
| `gap-2` | Tight inline groups (action buttons) |
| `gap-4` | Section spacing, card grids |
| `gap-6` | Page-level section spacing |
| `gap-8` / `gap-16` | Footer grid |
| `px-4 sm:px-8` | Page horizontal padding |
| `py-8 sm:py-12` | Page vertical padding |

Padding and margin values are typically small on mobile and scale up at `sm` / `md` breakpoints.

---

## Touch Targets (mobile)

File: `src/lib/touchTargets.ts`

```
TOUCH_TARGET_BUTTON = 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0'
```

- 44×44px minimum on mobile (WCAG 2.5.5)
- Compact on `sm+` (no minimum dimension constraints)
- Used by: ★ buttons, Copy, Workshop links, sortable column headers, pagination

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default | < 640px | Single column, hamburger nav, compact rows |
| `sm` | 640px+ | Layout direction shifts to horizontal, larger padding |
| `md` | 768px+ | Author and secondary data columns appear |
| `lg` | 1024px+ | Desktop nav visible, modpack column appears |

See [MOBILE_UX.md](./MOBILE_UX.md) for per-component mobile behavior.

---

## Implementation Files

| Concern | File |
|---------|------|
| Theme tokens (CSS) | `src/index.css` |
| Touch targets | `src/lib/touchTargets.ts` |
| User-facing copy | `src/lib/siteCopy.ts` |
| Filter bar | `src/components/ui/ListFilterBar.tsx` |
| Card | `src/components/ui/Card.tsx` |
| Pagination | `src/components/ui/Pagination.tsx` |
| Status states | `src/components/ui/StatusState.tsx` |
| Stats header | `src/components/ui/StatsHero.tsx` |
| App shell | `src/components/Layout.tsx` |
| Table header (mods) | `src/components/ui/ModLeaderboardHead.tsx` |
