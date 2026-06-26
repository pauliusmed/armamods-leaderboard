import { readFileSync } from 'fs';

const cfg = JSON.parse(readFileSync('c:/Users/GrybasTv/Documents/Arma3/pvp/config.json', 'utf8'));
const configIds = new Set(cfg.game.mods.map((m) => m.modId.toUpperCase()));
const names = Object.fromEntries(cfg.game.mods.map((m) => [m.modId.toUpperCase(), m.name]));

const modStats = new Map();
for (const id of configIds) {
  modStats.set(id, { id, name: names[id], servers: 0, players: 0 });
}

let url = 'https://api.battlemetrics.com/servers?filter[game]=reforger&page[size]=100';
let pages = 0;
const maxPages = 50;

while (url && pages < maxPages) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'armamods-check/1.0' },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`BM ${r.status}`);
  const json = await r.json();
  for (const s of json.data || []) {
    const mods = s.attributes?.details?.reforger?.mods || [];
    const players = s.attributes?.players ?? 0;
    if (players <= 0) continue;
    for (const m of mods) {
      const id = (m.modId || '').toUpperCase();
      if (!configIds.has(id)) continue;
      const st = modStats.get(id);
      st.servers += 1;
      st.players += players;
    }
  }
  url = json.links?.next || '';
  pages += 1;
  process.stderr.write(`page ${pages}\n`);
}

const all = [...modStats.values()];
const zero = all.filter((x) => x.players === 0);
const active = all.filter((x) => x.players > 0).sort((a, b) => b.players - a.players);

console.log(`Config mods: ${configIds.size}`);
console.log(`BM pages scanned: ${pages}`);
console.log(`Mods with players on at least 1 server: ${active.length}`);
console.log(`Mods with 0 players (in scanned servers): ${zero.length}`);

console.log('\n=== 0 PLAYERS (BattleMetrics, currently) ===');
zero.sort((a, b) => a.name.localeCompare(b.name)).forEach((x) => {
  console.log(`${x.id} | ${x.name}`);
});

console.log('\n=== HAS PLAYERS (TOP 25) ===');
active.slice(0, 25).forEach((x) => {
  console.log(`${x.id} | ${x.players}p (across ${x.servers} server matches) | ${x.name}`);
});
