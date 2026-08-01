# Brand Assets

The Arma Mods identity uses one canonical A/M network mark. The geometry must not be regenerated with an image model or manually redrawn for each placement.

## Canonical usage

| Context | Asset | Rule |
|---|---|---|
| Application header | `web/src/components/ui/BrandLogo.tsx` | Inline SVG, mineral/copper on the dark shell |
| Dark external background | `web/public/brand/logo-lockup-on-dark.svg` | Preferred horizontal lockup |
| Light external background | `web/public/brand/logo-lockup-on-light.svg` | Uses navy text and the darker copper contrast token |
| Small dark placement | `web/public/brand/logo-mark-on-dark.svg` | Mark only; minimum rendered size 24 px |
| Small light placement | `web/public/brand/logo-mark-on-light.svg` | Mark only; minimum rendered size 24 px |
| Browser favicon | `web/public/favicon.svg` with 48 px PNG fallback | Never use a hero illustration as a favicon |
| Apple home screen | `web/public/apple-touch-icon.png` | 180×180, opaque background |
| PWA icons | `web/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Maskable file keeps the mark inside the safe zone |

Keep clear space around the mark equal to at least one copper node diameter. Do not rotate, add glow, replace the copper, stretch non-proportionally, or place the dark lockup on a light surface.

## Social previews

All cards are 1200×630 PNG and combine a deterministic SVG brand layer with the generated modern-military artwork:

- `og-image.png` — default site card.
- `og-servers.png` — server browser, server lists, and discovery guide.
- `og-storage.png` — storage planner and modpack-size guide.
- `og-hosting.png` — Reforger and Arma 3 hosting analysis.

Social cards are excluded from the PWA precache because crawlers fetch them directly and they should not increase the offline application payload.

## Regeneration

Run from `web/`:

```bash
npm run generate-brand
```

The script regenerates raster icons, PNG logo exports, and social cards from the canonical SVG files and the checked-in generated hero artwork. Review the four social cards visually after any copy, palette, logo, or source-image change.
