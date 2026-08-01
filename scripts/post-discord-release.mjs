/**
 * Post latest Discord release entry to a Discord channel via webhook.
 * Usage:
 *   DISCORD_WEBHOOK_URL=... node scripts/post-discord-release.mjs
 *
 * Reads DISCORD_RELEASES.md (English, user-facing), extracts the top
 * "## [version] - date" section and sends it as a Discord embed.
 * Fails loudly if webhook is missing or API errors.
 */
import { readFileSync } from 'fs';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const RELEASES_PATH = process.env.RELEASES_PATH || 'DISCORD_RELEASES.md';

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Trūksta aplinkos kintamojo "${name}".`);
  }
  return value;
}

/** @returns {{ version: string, date: string, body: string }} */
function parseLatestEntry(releases) {
  const match = releases.match(
    /^## \[([^\]]+)\] - ([\d-]+)\r?\n\r?\n([\s\S]*?)(?=\r?\n## \[|\r?\n\s*$)/m,
  );
  if (!match) {
    throw new Error('DISCORD_RELEASES.md: nepavyko rasti pirmojo versijos įrašo.');
  }
  return { version: match[1], date: match[2], body: match[3].trim() };
}

async function postToDiscord(payload) {
  const res = await fetch(requireEnv('DISCORD_WEBHOOK_URL', WEBHOOK_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook ${res.status}: ${text}`);
  }
}

function buildEmbed(entry, repoUrl) {
  return {
    username: 'reforgermods release',
    embeds: [
      {
        title: `Update v${entry.version}`,
        description: entry.body,
        color: 0xb8784a,
        footer: {
          text: `${repoUrl} · reforgermods.com`,
        },
      },
    ],
  };
}

async function main() {
  requireEnv('DISCORD_WEBHOOK_URL', WEBHOOK_URL);
  const entry = parseLatestEntry(readFileSync(RELEASES_PATH, 'utf8'));
  const repoUrl =
    process.env.REPO_URL || 'https://github.com/GrybasTV/armamods-leaderboard';
  await postToDiscord(buildEmbed(entry, repoUrl));
  console.log(`Paskelbta v${entry.version} (${entry.date}).`);
}

main().catch((err) => {
  console.error(`KLAIDA: ${err.message}`);
  process.exit(1);
});
