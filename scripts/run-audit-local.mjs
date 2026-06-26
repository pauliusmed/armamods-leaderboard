/**
 * Local config audit (KV via reforgermods.com history API).
 * Usage: node scripts/run-audit-local.mjs [path/to/config.json]
 */
import { readFileSync } from 'fs';

const configPath =
  process.argv[2] || 'c:/Users/GrybasTv/Documents/Arma3/pvp/config.json';

const PATCH = '2026-05-28';

function parseConfig(input) {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  const modsRaw = data?.game?.mods ?? data?.mods;
  if (!Array.isArray(modsRaw)) throw new Error('game.mods not found');
  const seen = new Set();
  return modsRaw
    .map((m) => ({
      modId: String(m.modId).trim().toUpperCase(),
      name: String(m.name ?? m.modId),
    }))
    .filter((m) => {
      if (!/^[0-9A-F]{16}$/.test(m.modId) || seen.has(m.modId)) return false;
      seen.add(m.modId);
      return true;
    });
}

function avgInRange(history, from, to) {
  const pts = history.filter((h) => h.date >= from && h.date < to);
  if (!pts.length) return null;
  return Math.round(pts.reduce((a, h) => a + (h.totalPlayers || 0), 0) / pts.length);
}

function analyzeTrend(history) {
  const beforeAvg = avgInRange(history, '2026-05-02', PATCH);
  const early = avgInRange(history, PATCH, addDays(PATCH, 4));
  const recent =
    avgInRange(history, addDays(PATCH, 3), '2099-01-01') ??
    avgInRange(history, PATCH, '2099-01-01');
  if (beforeAvg === null || recent === null) return { phase: 'unknown', recent, early };
  if (beforeAvg >= 15 && (early ?? 0) < beforeAvg * 0.55 && recent > (early ?? 0) * 1.5 && recent >= 8)
    return { phase: 'recovering', recent, early };
  if (recent >= beforeAvg * 0.85 || (recent > (early ?? 0) * 1.4 && recent >= 25))
    return { phase: 'rising', recent, early };
  if (recent < (early ?? recent) * 0.85 && beforeAvg > recent * 1.25)
    return { phase: 'declining', recent, early };
  return { phase: 'stable', recent, early };
}

function addDays(d, n) {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

function classify(before, after, current, trend) {
  if (before === null || after === null) return 'unknown';
  const drop = before > 0 ? Math.round(((before - after) / before) * 100) : 100;
  if (before < 15) return 'niche';
  if (after <= 3 && current <= 3 && drop >= 70) {
    if (trend.phase === 'recovering') return 'risky';
    if (trend.phase === 'rising') return 'warning';
    return 'dead';
  }
  if (drop >= 60 || (current === 0 && before >= 30)) {
    if (trend.phase === 'recovering' || trend.phase === 'rising') return 'warning';
    return 'risky';
  }
  if (drop >= 35) return 'warning';
  if (trend.phase === 'declining' && before >= 40) return 'warning';
  return 'ok';
}

const raw = readFileSync(configPath, 'utf8');
const mods = parseConfig(raw);
console.log(`\nConfig: ${configPath}`);
console.log(`Mods: ${mods.length}\n`);

const rows = [];
for (const m of mods) {
  let history = [];
  try {
    const r = await fetch(
      `https://reforgermods.com/api/mods/${m.modId}/history?game=reforger&days=31`,
      { signal: AbortSignal.timeout(30000) }
    );
    if (r.ok) {
      const j = await r.json();
      history = j.data || [];
    }
  } catch {
    /* skip */
  }
  const before = avgInRange(history, '2026-05-02', PATCH);
  let after = avgInRange(history, PATCH, '2099-01-01');
  if (after === null && history.length) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const tail = sorted.slice(-7);
    after = Math.round(tail.reduce((a, h) => a + (h.totalPlayers || 0), 0) / tail.length);
  }
  let current = 0;
  try {
    const mr = await fetch(`https://reforgermods.com/api/mods/${m.modId}?game=reforger`, {
      signal: AbortSignal.timeout(15000),
    });
    if (mr.ok) {
      const mj = await mr.json();
      current = mj.data?.totalPlayers ?? 0;
    }
  } catch {
    /* skip */
  }
  const trend = analyzeTrend(history);
  const status = classify(before, after, current, trend);
  const drop = before > 0 && after !== null ? Math.round(((before - after) / before) * 100) : null;
  rows.push({ ...m, before, after, current, drop, status, trend: trend.phase, recent: trend.recent });
  process.stderr.write('.');
  await new Promise((r) => setTimeout(r, 80));
}

const order = { dead: 0, risky: 1, warning: 2, unknown: 3, ok: 4, niche: 5 };
rows.sort((a, b) => order[a.status] - order[b.status] || (b.drop ?? 0) - (a.drop ?? 0));

const summary = {};
for (const s of ['dead', 'risky', 'warning', 'ok', 'niche', 'unknown']) {
  summary[s] = rows.filter((r) => r.status === s).length;
}

console.log('\n\n=== SUMMARY ===');
console.log(summary);

console.log('\n=== BROKEN AFTER 1.7 (dead) – remove these first ===');
rows
  .filter((r) => r.status === 'dead')
  .forEach((r) =>
    console.log(`${r.modId} | ${r.name} | ${r.before}→${r.after} avg | dabar ${r.current}p | ${r.trend}`)
  );

console.log('\n=== AT RISK (risky) ===');
rows
  .filter((r) => r.status === 'risky')
  .forEach((r) =>
    console.log(`${r.modId} | ${r.name} | -${r.drop}% | ${r.trend} | dabar ${r.current}p`)
  );

console.log('\n=== WARNING – TOP 15 by drop ===');
rows
  .filter((r) => r.status === 'warning')
  .slice(0, 15)
  .forEach((r) =>
    console.log(`${r.modId} | ${r.name} | -${r.drop}% | ${r.trend} | week ~${r.recent}`)
  );

console.log('\n=== OK (healthy in the ecosystem) ===');
rows
  .filter((r) => r.status === 'ok')
  .slice(0, 12)
  .forEach((r) =>
    console.log(`${r.name} | now ${r.current}p | ${r.trend}`)
  );

console.log('\n=== REVIVING / RISING ===');
rows
  .filter((r) => r.trend === 'recovering' || r.trend === 'rising')
  .filter((r) => (r.before ?? 0) >= 10)
  .slice(0, 12)
  .forEach((r) =>
    console.log(`${r.name} | ${r.trend} | ${r.before}→${r.recent ?? r.after} | ${r.status}`)
  );

console.log('\n(Done – production /audit API not deployed yet; used the history API)\n');
