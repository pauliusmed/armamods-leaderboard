## What and why

<!-- One paragraph: the problem, the change, and the user-visible effect. Link the issue when there is one. -->

## How

<!-- Key implementation notes and trade-offs. Anything a reviewer would question belongs here. -->

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx tsc --noEmit -p tsconfig.scripts.json`
- [ ] `npm test`
- [ ] `npm --prefix web test`
- [ ] `npm --prefix web run build` (required when `web/**` changed)

## Release hygiene

- [ ] `CHANGELOG.md` entry added under the current version
- [ ] `DISCORD_RELEASES.md` updated when the change is user-facing

Heavy CI: required/skipped because <!-- reason -->
