# Design Decisions

## Why Deep Navy (#101923) Instead of Pure Black (#000000)

Pure black (`#000000`) creates eye strain in low-light environments and eliminates any ability to create depth through luminance shifts. MIL-STD-1472H and aerospace UX research (Astro UXDS) recommend dark navy/gray tones as base surfaces because:

- **Depth via luminance**: `#101923` → `#172635` → `#1C2E3F` creates a clear 3-level hierarchy without shadows (which are invisible on pure black)
- **Reduced halation**: Pure black causes text to "swim" on OLED screens in dark rooms; dark gray eliminates this
- **Real-world precedent**: Used by ATAK, Astro UXDS, and military C2 systems

## Why Barlow Instead of Inter

Inter is the default choice of ~80% of AI-generated websites, making it a "vibe coding" signal. Barlow:

- Similar geometric neutrality but less ubiquitous
- Available in enough weights (100–900) to cover both headings and body text
- Pairs naturally with DIN 1451 (which shares its technical drawing heritage)
- Subconsciously associated with industrial/technical applications

## Why JetBrains Mono for All Numeric Data

Monospaced numbers with `font-variant-numeric: tabular-nums` ensure:

- Decimal points and digits align vertically across rows, enabling rapid scanning
- Values don't shift horizontally when updating in real-time
- Standard in financial and military dashboards (Signal, Bloomberg, MIL-STD-1472H §5.5)

## Why 5 Signal Colors (MIL-STD-1472H)

The human visual system can track at most 5–7 distinct chromatic states simultaneously. Limiting to 5 functional colors ensures:

- **Red (#FF3838)**: Critical — operator must act now (server down, error)
- **Amber (#FFB302)**: Warning — degraded but working (stale data, fallback active)
- **Green (#2ECC71)**: Nominal — everything operational
- **Cyan (#2DCCFF)**: Informational — neutral data, telemetry
- **Gray (#A4ABB6)**: Muted — inactive, labels, metadata

This replaces the ad-hoc `text-red-500` / `text-green-500` / `text-yellow-500` with intentional, tested signal hierarchy.

## Why No Glassmorphism, No Gradients, No Emoji

These are the strongest visual signals of AI-generated "vibe code":

- **Glassmorphism** creates visual noise behind text, making data harder to scan and reducing effective contrast
- **Gradients** (especially blue `#3B82F6` → `#6366F1`) are present in ~80% of AI-generated landing pages
- **Emoji** in functional UI is the strongest predictor of a template/AI-generated site; we replace with lucide-react icons

## Why Opaque Surfaces Instead of Translucent Cards

`bg-zinc-950/40` (translucent) was causing overlapping text readability issues and required `backdrop-blur`, which is expensive on mobile GPUs. Opaque `#172635`:

- Eliminates backdrop-blur (better performance)
- Creates cleaner visual separation without noise
- Allows border-only grouping (no shadows needed)

## Why Bottom Navigation on Mobile (Hoober's Thumb Zone)

Steven Hoober's research shows 75% of mobile interactions use a single thumb. The bottom third of the screen is the most comfortable reach zone. Placing navigation at the top forces grip changes. Key decisions:

- Primary nav → bottom tab bar (≤5 items)
- Modals → bottom sheets (reachable by thumb, no grip change)
- Pagination → "Load More" (vertical scroll, no horizontal page tapping)
- Destructive actions → top third (requires deliberate grip change, prevents accidents)

## Why PACE Model for Error States

PACE (Primary, Alternate, Contingency, Emergency) is a military communication contingency framework. Applied to our API/network errors:

- **Primary**: Normal operation, green indicator
- **Alternate**: API failed, showing cached data with amber "Stale Telemetry" badge
- **Contingency**: Core page renders but without dynamic data; red banner with retry
- **Emergency**: Full-page error with diagnostic info

This replaces binary "loading vs error" with graduated response that keeps the site usable under degraded conditions.

## Why Focus & Nimbus Model

From military cognitive load research: data density should match the operator's distance from the target.

- **Nimbus (overview)**: Mods list page shows 4–5 columns, aggregate stats, minimal detail
- **Focus (detail)**: Mod detail page shows full metadata, dependency tree, historical charts, server list
- Transition is scroll/click, not a separate view — no cognitive reload

## Why Direct Enfusion Telemetry Over 3rd-Party APIs

BattleMetrics and similar tools break when upstream APIs change (e.g., Epic matchmaking endpoint change). Using direct Enfusion engine telemetry:

- Eliminates dependency on third-party API contracts
- PACE-compatible: multiple fallback data sources can be piped in
- Lower latency (no intermediary transformation)
