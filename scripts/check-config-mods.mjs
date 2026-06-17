import { readFileSync } from 'fs';

const cfg = JSON.parse(readFileSync('c:/Users/GrybasTv/Documents/Arma3/pvp/config.json', 'utf8'));
const mods = cfg.game.mods.map((m) => ({ id: m.modId, name: m.name }));
const base = 'https://reforgermods.com/api/mods';
const results = [];

for (const m of mods) {
  try {
    const r = await fetch(`${base}/${m.id}?game=reforger`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      results.push({ ...m, players: null, servers: null, status: String(r.status) });
      continue;
    }
    const j = await r.json();
    const d = j.data || j;
    results.push({
      ...m,
      players: d.totalPlayers ?? d.stats?.totalPlayers ?? 0,
      servers: d.serverCount ?? d.stats?.serverCount ?? 0,
      status: 'ok',
    });
  } catch (e) {
    results.push({ ...m, players: null, servers: null, status: `err: ${e.message}` });
  }
  await new Promise((resolve) => setTimeout(resolve, 80));
}

const zero = results.filter(
  (x) => x.status === 'ok' && x.players === 0 && x.servers === 0
);
const missing = results.filter((x) => x.status !== 'ok');
const active = results.filter((x) => x.status === 'ok' && x.players > 0);

console.log(`TOTAL config mods: ${mods.length}`);
console.log(`0 players / 0 servers (BM): ${zero.length}`);
console.log(`With players now: ${active.length}`);
console.log(`API missing/error: ${missing.length}`);
console.log('\n--- ZERO PLAYERS ---');
zero.sort((a, b) => a.name.localeCompare(b.name)).forEach((x) => {
  console.log(`${x.id} | ${x.name}`);
});
console.log('\n--- API ERRORS / NOT FOUND ---');
missing.forEach((x) => {
  console.log(`${x.id} | ${x.status} | ${x.name}`);
});
console.log('\n--- TOP BY PLAYERS ---');
active.sort((a, b) => b.players - a.players).slice(0, 20).forEach((x) => {
  console.log(`${x.id} | ${x.players}p | ${x.servers}srv | ${x.name}`);
});
