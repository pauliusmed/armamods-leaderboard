import { test } from 'node:test';
import assert from 'node:assert';

/**
 * 1. Replicated function under test (from web/functions/api/[[path]].ts)
 * Bypasses standard JSON.parse() via custom bracket-matching string index scanning
 * to prevent CPU limit timeouts in serverless Cloudflare Workers.
 */
function findMatchingBrace(text: string, openPos: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && inStr) { i++; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * 2. Trending math model under test (from scripts/collector.ts)
 * Computes the popularity score based on logarithmic activity and square root curves.
 */
function calculateTrendScore(currentRank: number, prevRank: number, currentPlayers: number, prevPlayers: number): number {
  const rankDelta = prevRank - currentRank;
  if (rankDelta === 0) return 0;
  
  const positionWeight = 100 / Math.sqrt(Math.min(currentRank, prevRank));
  const activityMultiplier = Math.log10(Math.max(currentPlayers, prevPlayers) + 1.1);
  return rankDelta * positionWeight * activityMultiplier;
}

/**
 * 3. Server Quality & Efficiency (SQE) scoring logic under test (from scripts/collector.ts)
 * Penalizes mod count bloat and rewards mod uniqueness compared to the network mean rank.
 */
function calculateSQEScore(players: number, modCount: number, avgRank: number, globalAvg: number, scalingFactor: number): number {
  const baseScore = (players * 5) - (modCount * 1);
  let uniquenessBonus = Math.floor((avgRank - globalAvg) / scalingFactor);
  uniquenessBonus = Math.min(100, Math.max(-100, uniquenessBonus));
  return baseScore + uniquenessBonus;
}

// ========================================================
// UNIT TESTS
// ========================================================

test('findMatchingBrace - correctly identifies matching JSON outer object closing brace', () => {
  const jsonStr = '{"id":"abc","name":"Test Mod","details":{"size":123,"version":"1.0"}}';
  const start = 0;
  const end = findMatchingBrace(jsonStr, start);
  assert.strictEqual(end, jsonStr.length - 1);
  assert.strictEqual(jsonStr[end], '}');
});

test('findMatchingBrace - handles quoted curly brackets inside strings gracefully without false positives', () => {
  const jsonStr = '{"id":"abc","name":"Bracket } in string","description":"{ nested string }"}';
  const start = 0;
  const end = findMatchingBrace(jsonStr, start);
  assert.strictEqual(jsonStr.substring(end), '}');
});

test('calculateTrendScore - gives higher velocity scores to top rank movements', () => {
  // Scenario A: Climbing 2 ranks in Top 10 (e.g. from 5 to 3)
  const scoreTop = calculateTrendScore(3, 5, 200, 180);
  
  // Scenario B: Climbing 2 ranks in Top 1000 (e.g. from 1002 to 1000)
  const scoreBottom = calculateTrendScore(1000, 1002, 200, 180);
  
  assert.ok(scoreTop > scoreBottom, 'Top-tier rank climb should score significantly higher than low-tier climb.');
});

test('calculateTrendScore - prioritizes highly active mods via log scaling', () => {
  // Scenario A: Mod with 500 active players climbing 10 spots
  const scoreActive = calculateTrendScore(90, 100, 500, 480);
  
  // Scenario B: Mod with 2 active players climbing 10 spots
  const scoreInactive = calculateTrendScore(90, 100, 2, 1);
  
  assert.ok(scoreActive > scoreInactive, 'Active player base should multiply trend scores.');
});

test('calculateSQEScore - correctly calculates standard server rating with positive uniqueness bonus', () => {
  const players = 40;
  const mods = 10;
  const avgRank = 8000;
  const globalAvg = 5000; // globalAvg / 100 = 50 scalingFactor
  const scalingFactor = 50; 
  
  const score = calculateSQEScore(players, mods, avgRank, globalAvg, scalingFactor);
  
  // baseScore = (40 * 5) - (10 * 1) = 200 - 10 = 190
  // uniquenessBonus = floor((8000 - 5000) / 50) = floor(3000 / 50) = 60
  // totalScore = 190 + 60 = 250
  assert.strictEqual(score, 250);
});

test('calculateSQEScore - caps the uniqueness bonus at +100', () => {
  const players = 10;
  const mods = 5;
  const avgRank = 15000;
  const globalAvg = 5000;
  const scalingFactor = 50; 
  
  const score = calculateSQEScore(players, mods, avgRank, globalAvg, scalingFactor);
  
  // baseScore = (10 * 5) - (5 * 1) = 50 - 5 = 45
  // uniquenessBonus = (15000 - 5000) / 50 = 200 -> clamped to 100
  // totalScore = 45 + 100 = 145
  assert.strictEqual(score, 145);
});

test('calculateSQEScore - caps the uniqueness penalty at -100', () => {
  const players = 10;
  const mods = 20;
  const avgRank = 100; // extremely common mods
  const globalAvg = 9000;
  const scalingFactor = 80; 
  
  const score = calculateSQEScore(players, mods, avgRank, globalAvg, scalingFactor);
  
  // baseScore = (10 * 5) - (20 * 1) = 50 - 20 = 30
  // uniquenessBonus = (100 - 9000) / 80 = -8900 / 80 = -111.25 -> floor to -112 -> clamps at -100
  // totalScore = 30 - 100 = -70
  assert.strictEqual(score, -70);
});

/**
 * 4. Co-deployment frequency calculation logic under test (from scripts/collector.ts)
 */
function calculateCoDeployment(
  modId: string,
  serverMods: { serverId: string; modId: string }[],
  servers: { id: string; mods: { id: string; name: string }[] }[]
) {
  const modToServersMap = new Map<string, string[]>();
  for (const sm of serverMods) {
    if (!modToServersMap.has(sm.modId)) {
      modToServersMap.set(sm.modId, []);
    }
    modToServersMap.get(sm.modId)!.push(sm.serverId);
  }

  const serverToModsMap = new Map<string, { id: string; name: string }[]>();
  for (const server of servers) {
    serverToModsMap.set(server.id, server.mods.map((m: any) => ({ id: m.id, name: m.name })));
  }

  const serverIds = modToServersMap.get(modId) || [];
  const freq = new Map<string, { name: string; count: number }>();
  
  for (const serverId of serverIds) {
    const otherMods = serverToModsMap.get(serverId) || [];
    for (const other of otherMods) {
      if (other.id === modId) continue;
      const existing = freq.get(other.id);
      if (existing) {
        existing.count++;
      } else {
        freq.set(other.id, { name: other.name, count: 1 });
      }
    }
  }

  return Array.from(freq.entries())
    .map(([id, data]) => ({ id, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

test('calculateCoDeployment - correctly aggregates other mods on same servers and excludes self', () => {
  const serverMods = [
    { serverId: 'srv1', modId: 'mod_a' },
    { serverId: 'srv1', modId: 'mod_b' },
    { serverId: 'srv1', modId: 'mod_c' },
    { serverId: 'srv2', modId: 'mod_a' },
    { serverId: 'srv2', modId: 'mod_b' },
  ];

  const servers = [
    { id: 'srv1', mods: [{ id: 'mod_a', name: 'A' }, { id: 'mod_b', name: 'B' }, { id: 'mod_c', name: 'C' }] },
    { id: 'srv2', mods: [{ id: 'mod_a', name: 'A' }, { id: 'mod_b', name: 'B' }] }
  ];

  // For mod_a, B is on 2 servers, C is on 1 server. A should not be included.
  const coDeployed = calculateCoDeployment('mod_a', serverMods, servers);

  assert.strictEqual(coDeployed.length, 2);
  assert.strictEqual(coDeployed[0].id, 'mod_b');
  assert.strictEqual(coDeployed[0].count, 2);
  assert.strictEqual(coDeployed[1].id, 'mod_c');
  assert.strictEqual(coDeployed[1].count, 1);
  assert.ok(!coDeployed.find(x => x.id === 'mod_a'), 'Should exclude self.');
});

test('calculateCoDeployment - slices to top 5 descending', () => {
  const serverMods: { serverId: string; modId: string }[] = [];
  const modsOnSrv: { id: string; name: string }[] = [{ id: 'target', name: 'Target' }];
  for (let i = 1; i <= 8; i++) {
    modsOnSrv.push({ id: `mod_${i}`, name: `Mod ${i}` });
  }

  const servers = [{ id: 'srv1', mods: modsOnSrv }];

  // associate mods on srv1
  modsOnSrv.forEach(m => {
    serverMods.push({ serverId: 'srv1', modId: m.id });
  });

  const coDeployed = calculateCoDeployment('target', serverMods, servers);

  // Should have exactly 5 elements out of 8 potential co-deployed mods
  assert.strictEqual(coDeployed.length, 5);
});

