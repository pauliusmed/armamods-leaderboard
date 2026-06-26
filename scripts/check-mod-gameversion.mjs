import { readFileSync } from 'fs';

const cfg = JSON.parse(readFileSync('c:/Users/GrybasTv/Documents/Arma3/pvp/config.json', 'utf8'));
const mods = cfg.game.mods;

const V17 = /^1\.7\./;
const V16 = /^1\.6\./;

async function getGameVersion(modId) {
  const r = await fetch(`https://reforger.armaplatform.com/workshop/${modId}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) return { modId, gv: null, status: r.status };
  const html = await r.text();
  const m = html.match(/Game Version[\s\S]*?(\d+\.\d+\.\d+\.\d+)/i);
  return { modId, gv: m ? m[1] : null, status: 'ok' };
}

const rows = [];
for (const m of mods) {
  const row = await getGameVersion(m.modId);
  rows.push({ name: m.name, id: m.modId, gv: row.gv });
  await new Promise((r) => setTimeout(r, 150));
}

const stale16 = rows.filter((r) => r.gv && V16.test(r.gv));
const v17 = rows.filter((r) => r.gv && V17.test(r.gv));
const unknown = rows.filter((r) => !r.gv);

console.log(`Config mods: ${mods.length}`);
console.log(`Workshop Game Version 1.7.x: ${v17.length}`);
console.log(`Workshop Game Version 1.6.x (risk after 1.7): ${stale16.length}`);
console.log(`Failed to scan: ${unknown.length}`);

console.log('\n=== 1.6.x – highest risk after the 1.7 update ===');
stale16.sort((a, b) => a.name.localeCompare(b.name)).forEach((r) => {
  console.log(`${r.id} | ${r.gv} | ${r.name}`);
});

console.log('\n=== 1.7.x – compatible with the new engine ===');
v17.sort((a, b) => a.name.localeCompare(b.name)).forEach((r) => {
  console.log(`${r.id} | ${r.gv} | ${r.name}`);
});
