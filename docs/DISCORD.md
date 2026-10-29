# Discord — channel template and goals

Start small: one server, a minimal set of channels, clear rules. An empty chaos of
channels kills a community — every channel has one purpose and a link to the
documentation.

## Prepared copy

### #information (first post, pin the channel)

```text
Welcome to the reforgermods.com community Discord!

This server is the community for the Arma Reforger & Arma 3 mod and server leaderboard.
Here:
- Follow updates in #announcements
- Share ideas and feedback in #feature-requests / #feedback
- Report bugs in #bug-reports
- Talk in #general

Links:
- Site: https://reforgermods.com
- GitHub: https://github.com/pauliusmed/armamods-leaderboard
- Data syncs hourly from BattleMetrics.

Getting help: ask in #support. Server owners: #server-owners.
```

### #announcements (automatic post)

`#announcements` receives an automatic webhook message every time
**`DISCORD_RELEASES.md`** changes (not `CHANGELOG.md` — see "Automatic release
post" below). Nothing needs to be written by hand except for major notices
(e.g. a server migration or ranking policy changes).

## Goals (why the server exists)

1. **A feedback channel** — users and server owners report bugs, inaccurate data
   and ideas without a GitHub account.
2. **Feature request loop** — a clear path from idea to decision:
   `#feature-requests` → GitHub issue → changelog (see `docs/` and `CHANGELOG.md`).
3. **Server owner contact** — FEATURED placement, hosting recommendations, data
   accuracy reports (private monetization policy — `docs-private/MONETIZATION.md`).
4. **Transparency and updates** — release notes, status changes, donation stages.

## Channel structure

### Access / important

| Channel | Purpose |
|---|---|
| `#welcome` | Greeting, rules, links (GitHub, site, this document) |
| `#rules` | Short rule summary: respect, no spam, no ranking manipulation |
| `#announcements` | Admin posts only: release notes, status changes, donation stages |
| `#status` (private) | Visible to admins only: automatic stale/system alerts with diagnostics (webhook `DISCORD_ALERT_WEBHOOK_URL`) |

### Community

| Channel | Purpose |
|---|---|
| `#general` | Free discussion about Arma Reforger / Arma 3, mods and servers |
| `#showcase` | Users share modpacks, servers and screenshots |
| `#introductions` | Newcomers introduce themselves (optional, but builds connection) |

### Feedback / work

| Channel | Purpose |
|---|---|
| `#feedback` | Feedback about the site: what is broken, unclear or missing |
| `#feature-requests` | Ideas; an admin reacts with emoji (👍 means "accepted/considered") and opens GitHub issues |
| `#bug-reports` | Bugs with a clear description: the URL, what you did, what you got |
| `#server-owners` | For server owners: FEATURED placement, data accuracy, hosting questions |

## Moderation rules (short)

- Admins: at least 2 (so there is no single-person bottleneck).
- `#announcements` and `#status` — admins can post, nobody else.
- A feature request without a clear description → ask for clarification, do not close it immediately.
- Spam/advertising → warning; repeated → timeout.
- Discussion of ranking manipulation → redirect to a GitHub issue, not to direct action.

## Release rule (#announcements)

The one content rule that keeps the channel free of spam and jargon:

> Every release gets a separate, **English, user-facing** description (1–5 lines).
> **No technical details** (file names, KV, workers) and **no monetization /
> affiliate** topics. We talk about the player's benefit, not internal mechanics.

The description is written at the top of `DISCORD_RELEASES.md` (not the
CHANGELOG). `CHANGELOG.md` stays technical (developer audience);
`DISCORD_RELEASES.md` is user-facing and English. The automation sends only the
latter.

## Code reference

- Button on the site: `web/src/components/ui/DiscordButton.tsx` (uses `PROJECT_DISCORD_URL` from `web/src/lib/siteLinks.ts` — change the link in one place).
- Keep the template public: link it from `#welcome` and `docs/README.md`.

## Automatic release post (#announcements)

1. Discord: Channel Settings → Integrations → Webhooks → New Webhook, set the channel to `#announcements`, copy the URL.
2. GitHub: repo Settings → Secrets → `DISCORD_WEBHOOK_URL`.
3. On every push to `main` that changes `DISCORD_RELEASES.md`, the workflow
   **`.github/workflows/discord-release.yml`** (step `Post release to Discord`)
   sends an embed with the newest entry through `scripts/post-discord-release.mjs`.
   **`deploy.yml` has no Discord step** — it is a separate workflow.

Without a change to `DISCORD_RELEASES.md` nothing is sent, which avoids spamming
on every push. Changes to `CHANGELOG.md` no longer trigger a post.

## Automatic system alerts (private channel)

`stale-alert.yml` checks `/api/health` every hour; when the data is stale (>3h),
an alert with diagnostics goes to the private admin channel (per-game
mods/servers/KV totals, links to Actions runs and health). It uses a separate
webhook, `DISCORD_ALERT_WEBHOOK_URL`, so `#announcements` stays reserved for
releases.
