# Design System

## Brand Identity

The site positions itself as a **tactical intelligence dashboard** — a deliberate departure from generic gaming leaderboards. Every visual choice reinforces the fiction of a mission-command center monitoring live battlefield telemetry, drawing from real-world C2 (Command & Control) systems, aerospace UX (Astro UXDS), and MIL-STD-1472H ergonomic standards.

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
| Establishing Uplink | Loading state |
| Uplink Lost | Connection lost |
| Signal Strength | Connection quality indicator |

See also: `src/lib/siteCopy.ts` for user-facing copy constants.

### Cognitive Model: Focus & Nimbus

Data density dynamically adjusts based on the user's proximity to an object or selected intelligence level:
- **Nimbus (overview)**: high-level aggregates, fewer columns, summary stats
- **Focus (detail)**: full columns, dependency trees, historical telemetry graphs
- Transition between the two is smooth — no page reload, no modal

### PACE Communication Status

Critical system events follow the PACE model (Primary, Alternate, Contingency, Emergency):

| Level | Meaning | Visual |
|-------|---------|--------|
| Primary | Normal operation | Green, standard display |
| Alternate | Degraded but functional | Amber, partial data |
| Contingency | Core functionality only | Red, critical mode |
| Emergency | Service unavailable | Red strobe, full-page alert |

---

## Color Philosophy: Grayscale-First, Color by Exception

**~95% of the interface is grayscale.** Color is used only in two narrowly-scoped roles:

1. **Brand copper (`#B8784A`)** — for interaction only: buttons, active nav, hover states, logo. Never decorative.
2. **Signal colors** — for status indicators only: small dots (≤12px), badge text. Never on backgrounds, borders, cards, or large surfaces.

This follows the "color by exception" pattern used by military C2 systems (ATAK), aerospace UX (Astro UXDS), modern tactical UI frameworks (Voidframe, Trunk), and — most authoritatively — the industrial **High-Performance HMI** standard **ISA-101** (muted gray surfaces by default, color reserved for abnormal states such as alarms/deviations). Grayscale testing ensures hierarchy and meaning survive without hue.

### Core Palette (MIL-STD-1472H compliant)

Chromatic encoding is strictly functional. Maximum 5 signal colors. All are used as **text or small dots only** — no backgrounds, no borders, no card surfaces.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand-copper` | `#B8784A` | Primary interactive accent — buttons, active nav, hover states, logo |
| `--color-critical` | `#FF3838` | Small status text / dot: errors, critical alerts |
| `--color-warning` | `#FFB302` | Small status text / dot: degraded, stale data |
| `--color-ok` | `#2ECC71` | Small status text / dot: nominal, online |
| `--color-info` | `#2DCCFF` | Small informational text / dot |
| `--color-neutral` | `#A4ABB6` | Muted labels, metadata |

### Backgrounds (Grayscale Only)

Depth is created through luminance shifts only — no shadows, no glassmorphism, no colored backgrounds.

| Context | Hex | Notes |
|---------|-----|-------|
| Page body | `#101923` | Deep navy — base surface |
| Cards / containers | `#172635` | Elevated surface, 1 step lighter |
| Elevated surfaces | `#1C2E3F` | Dropdowns, modals, bottom sheets |
| Table rows | `#101923` | Same as base, alternated with `#172635` |
| Hover row | `rgba(255,255,255,0.03)` | Subtle highlight |

### Text

| Token | Color | Usage |
|-------|-------|-------|
| Primary | `#FFFFFF` | Headings, key values |
| Body | `#C8CDD3` (~`gray-300`) | Data, descriptions |
| Muted | `#7A828E` (~`gray-500`) | Secondary labels, footnotes |
| Signal | Per core palette | Status text only — never on backgrounds |

### Borders

All borders are 1px solid `rgba(255,255,255,0.05)` by default. Signal-colored borders are never used on surfaces — borders are grayscale only.

| Token | Usage |
|-------|-------|
| `rgba(255,255,255,0.05)` | Default card/table borders |
| `rgba(255,255,255,0.10)` | Stronger separation (nav, th) |

---

## Typography

A clear functional two-font-family system distinguishes structure from data.

### Font Stack

| Context | Font | Origin / Rationale |
|---------|------|-------------------|
| Headings, labels, nav | `Barlow`, `DIN 1451`, system-ui | DIN 1451 dates to 1931 German technical drawings — subconsciously associates with industrial/state precision |
| Body text | `Barlow`, system-ui | Consistent with heading family; maintains vertical rhythm |
| Data values, telemetry | `JetBrains Mono`, `Share Tech Mono`, monospace | Tabular figures ensure aligned decimal points and stable column widths |
| All numeric data | `tabular-nums` via font-variant | Fixed-width numbers for real-time updating values |

Fonts are self-hosted via `@fontsource` (WOFF2, `font-display: swap`) — no third-party font CDN (privacy/GDPR precedent LG München 3 O 17493/20, no external connection setup).

> **Mono is for data only.** `JetBrains Mono` is used for numeric values, IDs, timestamps and code — **never** as UI chrome (nav, headings, buttons, labels, section titles). This is one of the most important anti-"tasteful terminal" differences (see [Differentiation](#differentiation-anti-tasteful-terminal)).

### Size & Weight Scale

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Systematic body text | ≥ 14px (0.875rem) | Medium (500) | MIL-STD minimum; prevents eye fatigue during data analysis |
| Data values | 14px (0.875rem) | Black (800) | Monospaced with tabular-nums; JetBrains Mono max weight is 800 (no 900 exists in the typeface) |
| Labels | 10–11px (0.625–0.6875rem) | Black (900) | UPPERCASE, wide tracking |
| Nav links | 10px (0.625rem) | Bold (700) | UPPERCASE, wide tracking |
| Section headings | 18–30px (1.125–1.875rem) | Black (900) | Minimal usage; data density over decorative titles |

### Typographic Standards (MIL-STD-1472H)

| Property | Requirement | Implementation |
|----------|-------------|----------------|
| Character width ratio | 3:5 (width ~0.9 of height on screen) | Barlow default meets this |
| Word spacing | ≥ 3/5 of character height | `word-spacing` set via CSS where needed |
| Line height | ~1.5 × font size | `leading-relaxed` on body text |
| Colored text | Requires minimum 5.8 mrad angular size | Signal-colored text at ≥ 14px minimum |
| Contrast ratio (body) | ≥ 6:1, recommended 10:1 | White on `#101923` = 13.9:1 |
| Contrast ratio (small text) | ≥ 4.5:1 | Muted gray `#7A828E` on `#101923` = 5.2:1 |

### Conventions

- All labels are **UPPERCASE** with `tracking-[0.1em]` to `tracking-[0.4em]`
- No leading zeros on numeric displays (MIL-STD-1472H §5.5.3)
- Numbers grouped with thin spaces every 3–5 digits
- Decimal-aligned columns in tables (`text-right` on numbers)

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

### Data Density

The interface follows a **dense, information-rich** layout inspired by Signal/Fortress financial dashboards and military C2 displays:
- Tables use minimal padding, compact rows
- White space is a deliberate tool for grouping, not a luxury
- Empty states are informative ("NO DATA FOUND"), not decorative

### Mobile Data Density Tiers

The practical [Nimbus vs Focus](#cognitive-model-focus--nimbus) specification. On mobile (<1024px) table columns are split into three tiers. **Never "everything in one card"** — that slows scanning down. **Never ask the user to rotate the screen** — it is disruptive and contradicts the Apple HIG / Material guidelines.

| Tier | Where it appears | Rule |
|------|------------------|------|
| **Primary** | Always visible on the mobile card | Identifies the row (rank, name) plus one key metric |
| **Secondary** | Compact, below the primary | 1–2 additional metrics, small type |
| **Tertiary** | Detail page only, or after expanding | Remaining columns plus every action (Copy, Stats, Workshop) |

Concrete splits (used by the card components):

| List | Primary | Secondary | Tertiary (not on mobile) |
|------|---------|-----------|--------------------------|
| Mod leaderboard | Rank, Name, Personnel | Deploy, Share % | Author, Size, all actions |
| Server leaderboard | Rank, Name, Players (current/max) | Mod count, Modpack size | Tier, Console fit, ★ actions |
| Trending | Rank, Name, Change | Personnel | Deploy, Author, actions |
| Server detail mod stack | Name, Size | Rank | Author, actions |
| Mod detail co-deploy | Server count, % of deploys | Network rank | All actions |

**The action row (★ Copy Stats Workshop)** is hidden behind a "⋯" button on mobile, or moved to the detail page. It appears inline only on pinned-favourite cards.

**Horizontal scroll** is allowed ONLY where no card variant exists yet (temporary) — with `overscroll-behavior-x: contain` and a visual gradient indicator on the right. The goal is to remove it entirely.

---

## Components

### Card

File: `src/components/ui/Card.tsx`

- Background: `#172635` (no transparency — opaque surfaces reduce visual noise)
- Border: 1px `rgba(255,255,255,0.05)` — no rounding on containers
- Interactive hover: border lifts to signal color at 40% opacity, corner accent marks appear
- No shadows, no glassmorphism, no nested cards

### Buttons

| Variant | Style |
|---------|-------|
| Primary | `background: #B8784A, color: #000, font: Barlow Black uppercase, wide tracking` |
| Secondary (ghost) | `background: transparent, border: 1px rgba(255,255,255,0.1), color: #7A828E` |
| Tonal | `background: rgba(184,120,74,0.1), border: 1px rgba(184,120,74,0.2), color: #B8784A` |
| Destructive | `background: rgba(255,56,56,0.1), border: 1px rgba(255,56,56,0.2), color: #FF3838` |

All interactive elements use `transition: all 200ms ease`.

### Tables

- Container: `overflow-x-auto` on a wrapper div
- Table: `w-full border-collapse`
- Header row: fixed, `border-bottom: 1px rgba(255,255,255,0.1)`
- Data rows: `border-bottom: 1px rgba(255,255,255,0.05)`, hover `background: rgba(255,255,255,0.03)`
- Left anchor column (name) is sticky on scroll
- Numeric columns are right-aligned with tabular figures
- Minimum 3-character-width spacing between columns (MIL-STD-1472H)

### Status Messages

File: `src/components/ui/StatusState.tsx`

| State | Visual | Text |
|-------|--------|------|
| Loading | Pulsing signal dot (2Hz, 50% duty cycle — MIL-STD flash rate) | "Establishing Uplink…" |
| Error | Warning icon (`#FFB302`), red heading | "CONNECTION FAILED" with error details |
| Empty | Neutral icon (`#A4ABB6`) | "NO DATA FOUND" |
| Degraded | Amber banner | "UPLINK DEGRADED — Stale Telemetry" |

### Telemetry Charts

- Thin vector lines (1px), high contrast on dark background
- No area fills, no 3D effects, no glow
- Color-coded per signal palette: green for healthy, amber for warning, red for critical
- X/Y axis labels in JetBrains Mono at 11px

### Mod Installation Errors

When an Enfusion mod fails to install (e.g., RHS at 46%), the interface shows:
- Clear error state with mod name, phase, and error code
- Action button: "Retry" or "Skip & Continue"
- Fallback: reinstall from alternate mirror (PACE model — Alternate channel)

---

## Mobile

Mobile is a first-class experience. **The full standard** (current code reality plus planned improvements) lives in a separate document to avoid duplication and contradictions:

➡️ **[MOBILE_STANDARDS.md](./MOBILE_STANDARDS.md)** — header/nav, touch targets (44px), tables, filter bar, charts, offline, anti-patterns, roadmap.

Audit results and the re-test checklist: [MOBILE_UX.md](./MOBILE_UX.md).

> **Note:** this section used to describe bottom nav, bottom sheets, "Load More" and the Service Worker offline cache as if they existed. All of them except Load More are now implemented — bottom nav (`BottomNav.tsx`), bottom sheets (`BottomSheet.tsx`), SW plus IndexedDB offline cache. Load More was reverted (see [MOBILE_STANDARDS.md §4](./MOBILE_STANDARDS.md#4-pagination)).

---

## Anti-Patterns (What to Avoid)

Based on analysis of AI-generated "vibe code" patterns and failed gaming UIs.

### Visual Anti-Patterns

| Anti-Pattern | Why | Our Approach |
|-------------|-----|--------------|
| Blue gradient (#3B82F6 → #6366F1) | 80% of AI sites use this; signals generic template | Single mineral/copper accent outside the blue range |
| Glassmorphism (frosted glass) | Creates visual noise under text, slows scanning | Opaque matte surfaces with border-only separation |
| Nested cards | Wastes usable area with meaningless boxes | Data grouping via typography cascade and spacing |
| Decorative glow / aurora effects | Reduces contrast, causes flicker in low light | Strictly flat surfaces, depth via luminance levels |
| Emojis in functional UI | Childish, unprofessional | Unified icon set (Feather or custom SVG) |
| Fake status dots (no live data) | Misleads users into thinking processes are active | Status dots only for live-monitored servers |
| Uniform fade-up scroll animation | AI signature — all sections identical | Motion varies by component type; no decorative animation |
| 3-column card grids everywhere | AI default pattern | Asymmetric grids, data-driven layouts |
| "Rotate your screen" prompt | Disruptive; forces an unnatural posture and contradicts the Apple HIG / Material | Mobile Data Density Tiers — primary/secondary/tertiary columns |
| All data in one mobile card | Slows scanning; fewer rows per screen | The card shows only primary plus 1–2 secondary; tertiary lives on detail |
| "Tasteful terminal" / Bloomberg clone | The second AI slop wave (see [Differentiation](#differentiation-anti-tasteful-terminal)): mono as UI chrome, `//` prefixes, `▸`/`$` glyphs, emoji-bracket nav — "hacker terminal" became a one-click template | Mono **only** for data (numbers/IDs/timestamps); no CLI glyphs; terminal metaphors only where they serve the product; nav without emoji |

### Architecture Anti-Patterns

| Anti-Pattern | Why | Our Approach |
|-------------|-----|--------------|
| 3rd-party API as single source of truth | Fragile; breaks when API changes (e.g., Epic matchmaking) | Direct Enfusion engine telemetry + resilient fallback channels |
| Identity merging (e.g., BattleMetrics) | Different players with same short name merged into one profile | Strict user-agent fingerprinting + Workshop ID linkage |
| Hidden multi-level navigation menus | Common in AAA games (Battlefield, CoD) — confusing | Flat navigation, ≤ 5 primary items, always visible |
| No error recovery in download flows | RHS hangs at 46% with no user action possible | PACE model: retry, alternate mirror, clear error UI |

---

## Differentiation: Anti-"Tasteful Terminal"

The 2026-07-31 audit (validated online: [killaislop.com](https://killaislop.com) "The 'tasteful terminal'", the [thecrit.co vibe-coding guide](https://www.thecrit.co/resources/vibe-coding-design-guide)) showed that our aesthetic had converged on the **second AI slop wave** — a "Bloomberg terminal" clone:

> "Mono everywhere, near-black background, one warm accent, ASCII art: the look of 'an AI that read one Vercel blog post'. It isn't ugly, that's the trap; it's polished enough to have become the new default."

That is an insidious problem: it does not look bad, but it no longer stands out. **Our core identity stays** (the tactical command-post fiction, military terminology, navy + mineral white + copper, data density) while the **terminal presentation** is what changes.

### Mandatory rules

| Rule | What it means | Example |
|------|---------------|---------|
| **Mono for data only** | `JetBrains Mono` is used ONLY for numeric values, IDs, timestamps and code. NEVER for UI chrome: nav, headers, buttons, labels | ✅ `{mod.serverCount}` in mono; ❌ `font-mono` on the app shell / nav / section headings |
| **No CLI glyphs** | `//`, `$`, `▸`, `>`, `[ ... ]` as decorative prefixes are forbidden | ❌ `// SERVER_NODE`; ✅ `SERVER NODE` |
| **No emoji in functional UI** | Header nav, status indicators, buttons — lucide-react icons or text only | ❌ `[ 📦 Mods Database ]`; ✅ `Mods Database` + lucide |
| **Terminal metaphors only where they serve** | Military terminology (UPLINK, INTEL, DEPLOY) stays — that is the brand. CLI presentation (ASCII, prompts) goes | ✅ "ESTABLISHING UPLINK"; ❌ `// ESTABLISHING_UPLINK` |
| **No 01/02/03 numbering** on sections | An AI slop marker (#30 on killaislop) | ❌ `01 · Principle`; ✅ `Principle` |

### Sources

- [killaislop.com](https://killaislop.com) — "The 'tasteful terminal'" (#34) and "editorial dashboard" (#35) as the second AI default wave; the list of code signals.
- [thecrit.co](https://www.thecrit.co/resources/vibe-coding-design-guide) — "The Generic Vibe-Coded UI Recipe" (Inter + Lucide + gradients) and why models pick probabilistic patterns.
- [Shuffle.dev](https://shuffle.dev/blog/2026/01/why-do-most-ai-generated-websites-look-the-same/) — AI predicts patterns, not originality; constraints lead to differentiation.

---

## Space & Motion

### Spacing System

| Scale | Usage |
|-------|-------|
| `gap-2` | Tight inline groups (action buttons) |
| `gap-4` | Section spacing, card grids |
| `gap-6` / `gap-8` | Page-level section spacing |
| `px-4 sm:px-8` | Page horizontal padding |
| `py-8 sm:py-12` | Page vertical padding |

### Motion

| Context | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Page enter | 400ms | `ease-out` | No decorative entrance animations on repeat visits |
| Hover transitions | 200ms | `ease-out` | Instant enough for密集 interaction |
| State change (signal) | 100ms | `step-start` | Immediate — no delay on critical alerts |
| Mobile panel slide | 300ms | `ease-out` | Bottom sheet enter/exit |

Motion is never decorative. If an animation does not help decision-making, remove it. Non-essential UI dims to 20% opacity when not in focus.

---

## Touch Targets (mobile)

File: `src/lib/touchTargets.ts`

```
TOUCH_TARGET_BUTTON = 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0'
```

- 44×44px minimum on mobile (WCAG 2.5.5)
- Compact on `sm+` (no minimum dimension constraints)
- Used by: ★ buttons, Copy, Workshop links, sortable column headers, pagination, bottom nav items

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default | < 640px | Single column, bottom nav, compact rows, bottom sheets |
| `sm` | 640px+ | Layout shifts to horizontal, larger padding |
| `md` | 768px+ | Author and secondary data columns appear |
| `lg` | 1024px+ | Desktop top nav visible, modpack column appears |

---

## References & Inspiration

| System | Domain | Key Takeaways |
|--------|--------|---------------|
| ATAK (Android Team Awareness Kit) | Military C2 | Real-time XML message processing (Cursor on Target), topographic maps, NATO symbology |
| Tactical NAV (TACNAV-X) | Combat navigation | WGS-84 coordinate standards, full offline support, rapid compass lock |
| DCS World HUD / MFD Mods | Aviation simulation | Thin vector lines, variable stroke width via Lua, night-vision HMCS phosphor display |
| Astro Space UX Design System | Aerospace | Global status bar, geometric state encoding, muted dark tones (#172635), colorblind-safe shape dubbing |
| Signal / Fortress Dashboards | DevOps / Finance | JetBrains Mono typography, extreme data density, amber accents, no wasted space |
| MIL-STD-1472H | US Military | Ergonomic standards for contrast, typography, color coding, and table layout |
| ISA-101 (High-Performance HMI) | Process control | Exception-based displays: gray by default, color only for alarms/deviation; analogous "color by exception" |

---

## Implementation Files

| Concern | File |
|---------|------|
| Theme tokens (CSS) | `src/index.css` |
| Touch targets | `src/lib/touchTargets.ts` |
| Mobile standartas | [MOBILE_STANDARDS.md](./MOBILE_STANDARDS.md) |
| User-facing copy | `src/lib/siteCopy.ts` |
| Filter bar | `src/components/ui/ListFilterBar.tsx` |
| Card | `src/components/ui/Card.tsx` |
| Pagination | `src/components/ui/Pagination.tsx` |
| Status states | `src/components/ui/StatusState.tsx` |
| Stats header | `src/components/ui/StatsHero.tsx` |
| App shell | `src/components/Layout.tsx` |
| Table header (mods) | `src/components/ui/ModLeaderboardHead.tsx` |
| Colorblind-safe signal shapes | (planned) |
| Bottom sheet | `src/components/ui/BottomSheet.tsx` |
| Offline cache (PWA) | `src/lib/db.ts` + `vite-plugin-pwa` Service Worker |
| Enfusion error recovery flow | (planned) |
