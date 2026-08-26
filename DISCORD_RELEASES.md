# Discord releases (English, user-facing)

Each entry is what gets posted to #announcements. Written for players and server
owners — no internal/technical jargon, no monetization or affiliate details.

## [1.23.24] - 2026-08-27

- Main mod and server leaderboards now load from a shared, precomputed page — faster for everyone on the first visit, not just repeat visitors.

## [1.23.23] - 2026-08-26

- Fixed the config "Copy" button: copied mod blocks now start with the comma and line break they show in the preview, so adding mods to your server config one by one no longer produces glued-together, invalid JSON.

## [1.23.22] - 2026-08-26

- Added abuse protection: addresses that flood mod pages or the API (like last night's crawler with thousands of requests per hour) are now throttled automatically, so pages and rankings stay fast and available for everyone.

## [1.23.21] - 2026-08-26

- Mod pages now pick up Workshop description edits within about two days instead of up to a week, so what you read here stays in sync with what authors write there.

## [1.23.20] - 2026-08-26

- Big stability pass: mod badges, thumbnails and author lookups no longer time out, and cached pages can no longer show outdated or empty search results after sitting idle.

## [1.23.19] - 2026-08-26

- Mod search now also looks inside mod descriptions and summaries — you can find mods by gameplay phrases like "vietnam" or "milsim", not just exact titles. Rolling out gradually as the index builds up.

## [1.23.18] - 2026-08-26

- Fixed two search quirks on the mod, server and scenario lists: the "next page" button no longer bounces you back to page one, and results no longer randomly vanish to "No matches found" moments after loading.

## [1.23.17] - 2026-08-25

- On the Dependency Blockers tool, your favorite servers now appear at the top of the server list — marked with a star — so you can pick yours without typing its name.

## [1.23.16] - 2026-08-25

- The server ranking explanation now spells out what actually moves you up: active players matter most, then reliable uptime, a shorter required-mods list, and original mod choices instead of the usual setups.

## [1.23.15] - 2026-08-25

- Sorting fixed across the site — the Scenario Leaderboard now really shows the most popular missions first instead of empty ones, and every "sort by" arrow points the way the list is actually ordered.

## [1.23.8] - 2026-08-24

- Every page of the site now loads noticeably faster and no longer jumps around while content appears — mod and server pages, charts and galleries open smoothly even on slower mobile connections.

## [1.23.3] - 2026-08-24

- Cleaner look across the site: section icons are now consistent, and the redundant "Frequently Deployed Together" table on mod pages is gone (its data mixed popular mods with related ones — the Dependencies section already covers real requirements).

## [1.23.0] - 2026-08-24

- Site infrastructure moved to a faster hosting setup — same pages, same data, quicker delivery worldwide.

## [1.22.53] - 2026-08-23

- Mod page summaries and descriptions now pick up your Workshop edits within a couple of days instead of up to a week.

## [1.22.52] - 2026-08-22

- Workshop descriptions on mod pages now show in full without an extra click — only very long texts are folded.

## [1.22.51] - 2026-08-21

- Mods that were re-uploaded under a new workshop item now automatically send old links to the new page, and the outdated entry no longer clutters the leaderboards or search results.

## [1.22.49] - 2026-08-20

- Loading the mod leaderboard now shows a table-shaped placeholder that matches the final layout, so there is no visual "jump" when the list appears — the page just fills in smoothly.

## [1.22.47] - 2026-08-20

- Leaderboard and server lists now appear instantly on repeat visits — the site serves the last loaded data from your device and quietly refreshes it in the background, so you no longer wait on a full reload every time you open the page.

## [1.22.45] - 2026-08-15

- Fixed laggy search boxes on the mod, server and scenario lists — typing is now instant and no longer drops letters.

## [1.22.44] - 2026-08-13

- Mod audit no longer calls mods "Broken" on the very first days after a Reforger update, when there isn't enough data yet — it now tells you to wait and verify before removing anything.
- Confusing "Stable" labels are hidden on Broken/Monitor mods, and the drop percentage is clearly marked as rank-based so it can't be mistaken for a player-count drop.

## [1.22.43] - 2026-08-13

- Mod pages now show live personnel, server count and share directly beside the mod details, so the key numbers are visible without scrolling.

## [1.22.42] - 2026-08-13

- Mod pages now put the Workshop screenshots front and center, with the mod details, download size, rank and server config actions grouped beside them.
- The layout is cleaner on desktop and stacks naturally on mobile, making the important mod information easier to scan without opening Workshop first.

## [1.22.38] - 2026-08-13

- Reforger 1.8 "Stay Low, Stay Hidden" is out! The config audit and mod timelines now track the 1.8 update — paste your server config.json to see which mods broke after the patch.
- New page with the official 1.8 patch highlights plus quick links to check your modpack: reforgermods.com/reforger-1-8
- Mod pages now show the total download size of a mod together with all its required dependencies.
- Server and mod lists remember your filters, search and page when you navigate back — nothing resets anymore.
- The #1 server spot on the leaderboard is much more stable — tiny score swings no longer shuffle the top.
- Copying mod lists for your server config now uses comma-first JSON, so the last mod never breaks the config file.

---

## [1.22.28] - 2026-07-31

- The community is now on Discord — this server! Join for release news, feature
  ideas, and support.
- The site keeps refreshing every ~2 hours, so rankings and player counts stay current.
- Get help and suggest improvements — everyone is welcome.

---

## Format

Add the newest release at the top, directly under the heading. One entry per
release, plain English, 1–5 lines, user value only. The deploy workflow posts the
top entry automatically when this file changes.
