/**
 * Post a stale-data alert to the private admin Discord channel when
 * /api/health reports isStale (>3h).
 * Usage:
 *   HEALTH_URL=... DISCORD_ALERT_WEBHOOK_URL=... node scripts/post-stale-alert.mjs
 *
 * Silently exits when fresh (no alert spam); fails loudly when the health
 * check itself errors so missing/dead monitors are visible.
 */
import { pathToFileURL } from 'node:url';

const HEALTH_URL = process.env.HEALTH_URL || 'https://reforgermods.com/api/health';
const WEBHOOK_URL = process.env.DISCORD_ALERT_WEBHOOK_URL;
const THRESHOLD_HOURS = Number(process.env.STALE_THRESHOLD_HOURS || '3');

const COLLECTOR_RUNS_URL =
  'https://github.com/pauliusmed/armamods-leaderboard/actions/workflows/collector.yml';

function requireEnv(name, value) {
  if (!value) throw new Error(`Trūksta aplinkos kintamojo "${name}".`);
  return value;
}

async function postToDiscord(payload) {
  const res = await fetch(requireEnv('DISCORD_ALERT_WEBHOOK_URL', WEBHOOK_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook ${res.status}: ${text}`);
  }
}

export function collectStale(checks = {}) {
  return Object.entries(checks)
    .filter(([, check]) => {
      const h = typeof check?.staleHours === 'number' ? check.staleHours : null;
      return check?.isStale === true && h !== null && h > THRESHOLD_HOURS;
    })
    .map(([game, check]) => ({
      game,
      lastUpdate: check?.lastUpdate ?? null,
      staleHours: Math.round(check.staleHours * 10) / 10,
    }));
}

export function buildEmbed(stale, checks = {}) {
  const fields = stale.map((s) => {
    const check = checks?.[s.game] ?? {};
    const mods = check?.mods?.total ?? '?';
    const servers = check?.servers?.total ?? '?';
    const kv = check?.kv ?? '?';
    return {
      name: s.game,
      value:
        `last collect \`${s.lastUpdate ?? 'unknown'}\` · stale **${s.staleHours}h**\n` +
        `mods ${mods} · servers ${servers} · KV ${kv}`,
    };
  });

  return {
    username: 'reforgermods admin',
    embeds: [
      {
        title: '⚠️ [ STALE DATA ] Live sync paused',
        description:
          `Collector did not write for >${THRESHOLD_HOURS}h. The gate only skips duplicate ` +
          `runs while snapshots are fresh — more than one collection cycle failed.\n` +
          `[Collector runs](${COLLECTOR_RUNS_URL}) · [Health](${HEALTH_URL}) · cron-job.org job 7414079`,
        color: 0xffb302,
        fields,
        footer: { text: 'reforgermods.com · admin alert' },
      },
    ],
  };
}

async function main() {
  requireEnv('DISCORD_ALERT_WEBHOOK_URL', WEBHOOK_URL);
  const res = await fetch(HEALTH_URL);
  if (!res.ok) {
    throw new Error(`Health check HTTP ${res.status} — monitoris negali skaityti health`);
  }
  const data = await res.json();

  const stale = collectStale(data?.checks);
  if (stale.length === 0) {
    console.log('Duomenys švieži — alerto nereikia.');
    return;
  }

  await postToDiscord(buildEmbed(stale, data?.checks));
  console.log(`Alertas išsiųstas: ${stale.map((s) => s.game).join(', ')}`);
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(`KLAIDA: ${err.message}`);
    process.exit(1);
  });
}
