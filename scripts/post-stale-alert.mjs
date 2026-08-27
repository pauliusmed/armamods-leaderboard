/**
 * Post a stale-data alert to Discord when /api/health reports isStale (>3h).
 * Usage:
 *   HEALTH_URL=... DISCORD_WEBHOOK_URL=... node scripts/post-stale-alert.mjs
 *
 * Silently exits when fresh (no alert spam); fails loudly when the health
 * check itself errors so missing/dead monitors are visible.
 */
const HEALTH_URL = process.env.HEALTH_URL || 'https://reforgermods.com/api/health';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const THRESHOLD_HOURS = Number(process.env.STALE_THRESHOLD_HOURS || '3');

function requireEnv(name, value) {
  if (!value) throw new Error(`Trūksta aplinkos kintamojo "${name}".`);
  return value;
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

function buildEmbed(stale) {
  const lines = stale
    .map(
      (s) =>
        `**${s.game}** · last collect ${s.lastUpdate || 'unknown'} · stale ${s.staleHours}h`,
    )
    .join('\n');
  return {
    username: 'reforgermods status',
    embeds: [
      {
        title: '⚠️ [ STALE DATA ] Live sync paused',
        description:
          `${lines}\n\n` +
          'Leaderboard snapshot outdated. Collector did not write for >3h ' +
          '(GitHub scheduler miss or BM API failure). ' +
          'Check Actions → "Arma Mods Collector" and cron-job.org job 7414079.',
        color: 0xffb302,
        footer: { text: 'reforgermods.com · auto alert' },
      },
    ],
  };
}

async function main() {
  requireEnv('DISCORD_WEBHOOK_URL', WEBHOOK_URL);
  const res = await fetch(HEALTH_URL);
  if (!res.ok) {
    throw new Error(`Health check HTTP ${res.status} — monitoris negali skaityti health`);
  }
  const data = await res.json();

  const stale = Object.entries(data?.checks ?? {})
    .filter(([game, check]) => {
      const h = typeof check?.staleHours === 'number' ? check.staleHours : null;
      return check?.isStale === true && h !== null && h > THRESHOLD_HOURS;
    })
    .map(([game, check]) => ({
      game,
      lastUpdate: check?.lastUpdate ?? null,
      staleHours: Math.round(check.staleHours * 10) / 10,
    }));

  if (stale.length === 0) {
    console.log('Duomenys švieži — alerto nereikia.');
    return;
  }

  await postToDiscord(buildEmbed(stale));
  console.log(`Alertas išsiųstas: ${stale.map((s) => s.game).join(', ')}`);
}

main().catch((err) => {
  console.error(`KLAIDA: ${err.message}`);
  process.exit(1);
});
