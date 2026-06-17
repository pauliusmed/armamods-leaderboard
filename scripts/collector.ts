#!/usr/bin/env node
/**
 * @file collector.ts
 * @description Core data ingestion engine for Arma Mods Leaderboard.
 * Fetches real-time server and mod data from BattleMetrics, processes rankings, 
 * calculates trending metrics, and synchronizes with Cloudflare KV.
 * 
 * DESIGN DECISIONS:
 * 1. Sharded Storage: KV has a 25MB limit per key. We implement dynamic chunking 
 *    to handle large datasets without performance degradation.
 * 2. Logarithmic Trending: We use a hybrid mathematical model to weight mod 
 *    popularity growth, preventing "top-heavy" rankings.
 * 3. Rate-Limit Resilience: Implements exponential backoff for KV API writes.
 */

import 'dotenv/config';
import { BattleMetricsService, GameType } from '../src/services/battlemetrics.js';

interface CloudflareKV {
  put: (key: string, value: string) => Promise<void>;
  get: (key: string, type: 'json') => Promise<any>;
}

/**
 * CloudflareKVClient
 * @description A specialized REST client for Cloudflare KV storage.
 * Designed to handle large payloads through persistence and rate-limit awareness.
 */
export class CloudflareKVClient {
  private apiKey: string;
  private accountId: string;
  private namespaceId = 'a8f21c595e39452e95e7e41e3d812013'; // trending_snapshots

  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    if (!this.apiKey || !this.accountId) {
      throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required');
    }
  }

  private baseUrl(path: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}${path}`;
  }

  async put(key: string, value: string): Promise<void> {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(this.baseUrl(`/values/${key}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'text/plain',
        },
        body: value,
      });
      
      if (response.status === 429 && i < maxRetries - 1) {
        const delay = 2000 * (i + 1);
        console.log(`  ⚠️ Rate limited (429). Retrying in ${delay/1000}s... (Bandymas ${i+1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`KV put failed: ${response.status}`);
      }
      return;
    }
  }

  async get(key: string, type: 'json'): Promise<any> {
    const response = await fetch(this.baseUrl(`/values/${key}`), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`KV get failed: ${response.status}`);
    }
    const text = await response.text();
    return type === 'json' ? JSON.parse(text) : text;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// KV Free Tier: 1,000 writes/day. With 24 collector runs, budget is ~41 writes per run.
// 5MB chunks minimize write count while staying parseable by Workers for list endpoints.
const CHUNK_SIZE_LIST = 5 * 1024 * 1024;    // 5MB for Mods/Servers
const CHUNK_SIZE_HISTORY = 5 * 1024 * 1024; // 5MB for History

// Parse game type from CLI
function parseGameType(): GameType {
  const gameArg = process.argv.find(arg => arg.startsWith('--game='));
  const game = gameArg?.split('=')[1] as GameType;
  return game === 'arma3' ? 'arma3' : 'reforger';
}

function getKVKeys(game: GameType) {
  const suffix = game === 'arma3' ? ':arma3' : '';
  return {
    MODS: `cache:mods${suffix}`,
    SERVERS: `cache:servers${suffix}`,
    STATS: `cache:stats${suffix}`,
    LAST_UPDATE: `cache:lastUpdate${suffix}`,
    TRENDING: `cache:trending${suffix}`,
  };
}

interface ServerMod {
  serverId: string;
  modId: string;
}

  async function runCollector() {
  const game = parseGameType();
  console.log(`🚀 COLLECTOR: Starting for ${game.toUpperCase()}...`);

  const kv = new CloudflareKVClient();
  const bm = new BattleMetricsService(game);
  const KV_KEYS = getKVKeys(game);

  /**
   * buildChunks
   * @description Segments data arrays into size-optimized blocks to comply with 
   * Cloudflare KV's 25MB value limit. Each chunk is calculated by actual byte length.
   * @param items Array of objects to be sharded
   */
  function buildChunks(items: any[], maxBytes: number): any[][] {
    const chunks: any[][] = [];
    let current: any[] = [];
    let currentSize = 2; // "[]"

    for (const item of items) {
      const itemBytes = Buffer.byteLength(JSON.stringify(item), 'utf8');
      if (current.length > 0 && currentSize + itemBytes + 1 > maxBytes) {
        chunks.push(current);
        current = [];
        currentSize = 2;
      }
      current.push(item);
      currentSize += itemBytes + (current.length > 1 ? 1 : 0);
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  console.log('📡 Fetching servers from BattleMetrics...');
  const servers = await bm.fetchAllServers(false); // fetch ALL servers
  console.log(`✅ Fetched ${servers.length} servers`);

  // Build data structures
  const serverList: any[] = [];
  const serverMods: ServerMod[] = [];
  const modMap = new Map<string, { id: string; name: string; serverCount: number; totalPlayers: number; }>();

  for (const server of servers) {
    const { id, attributes } = server;

    // Arma 3 uses modIds/modNames arrays, Reforger uses mods array
    let gameMods: Array<{modId: string; name: string}> = [];
    if (game === 'arma3') {
      const modIds = attributes.details?.modIds || [];
      const modNames = attributes.details?.modNames || [];
      gameMods = modIds.filter((mid: any) => mid != null).map((mid: number, idx: number) => ({
        modId: mid.toString(),
        name: modNames[idx] || `Mod ${mid}`
      }));
    } else {
      gameMods = attributes.details?.reforger?.mods || [];
    }

    serverList.push({
      id,
      name: attributes.name,
      ip: attributes.ip || '',
      port: attributes.port || 0,
      players: attributes.players,
      maxPlayers: attributes.maxPlayers,
      mods: [] as any[],
    });

    for (const sm of gameMods) {
      // Skip mod ID 0 (base game, not an actual mod)
      if (sm.modId === '0' || sm.modId === 0) continue;

      serverMods.push({ serverId: id, modId: sm.modId });

      if (!modMap.has(sm.modId)) {
        modMap.set(sm.modId, {
          id: sm.modId,
          name: sm.name || 'Unknown Module',
          serverCount: 0,
          totalPlayers: 0,
        });
      }
    }
  }

  // Create a map for faster server lookups
  const serverMap = new Map(serverList.map(s => [s.id, s]));

  // Calculate mod stats
  console.log(`📊 Processing ${serverMods.length} mod-server associations...`);
  for (const sm of serverMods) {
    const mod = modMap.get(sm.modId);
    if (mod) {
      const server = serverMap.get(sm.serverId);
      if (server) {
        mod.serverCount++;
        mod.totalPlayers += (server.players || 0);
        server.mods.push({
          id: mod.id,
          name: mod.name,
          serverCount: mod.serverCount,
          totalPlayers: mod.totalPlayers,
        });
      }
    }
  }

  // Calculate ranks
  const mods = Array.from(modMap.values());
  const totalServers = serverList.length;
  const byPlayers = [...mods].sort((a, b) => b.totalPlayers - a.totalPlayers);
  const byServers = [...mods].sort((a, b) => b.serverCount - a.serverCount);

  const playerRanks = new Map(byPlayers.map((m, i) => [m.id, i + 1]));
  const serverRanks = new Map(byServers.map((m, i) => [m.id, i + 1]));

  // Create mod list with ranks
  let modList = mods.map(m => ({
    id: m.id,
    name: m.name,
    serverCount: m.serverCount,
    totalPlayers: m.totalPlayers,
    playerRank: playerRanks.get(m.id)!,
    serverRank: serverRanks.get(m.id)!,
    overallRank: Math.round((playerRanks.get(m.id)! + serverRanks.get(m.id)!) / 2),
    marketShare: totalServers > 0 ? ((m.serverCount / totalServers) * 100) : 0,
  }));

  // Sort by overallRank, then by totalPlayers (desc) for tie-breaking, then assign sequential ranks
  modList.sort((a, b) => {
    if (a.overallRank !== b.overallRank) return a.overallRank - b.overallRank;
    return b.totalPlayers - a.totalPlayers; // More players = better rank
  });
  modList = modList.map((m, i) => ({ ...m, overallRank: i + 1 }));

  // Calculate Frequently Deployed Together (co-deployment) for each mod
  console.log(`📊 Calculating co-deployment frequencies for mods...`);
  const modToServersMap = new Map<string, string[]>();
  for (const sm of serverMods) {
    if (!modToServersMap.has(sm.modId)) {
      modToServersMap.set(sm.modId, []);
    }
    modToServersMap.get(sm.modId)!.push(sm.serverId);
  }

  const serverToModsMap = new Map<string, { id: string; name: string }[]>();
  for (const server of serverList) {
    serverToModsMap.set(server.id, server.mods.map((m: any) => ({ id: m.id, name: m.name })));
  }

  modList = modList.map(m => {
    const serverIds = modToServersMap.get(m.id) || [];
    const freq = new Map<string, { name: string; count: number }>();
    
    for (const serverId of serverIds) {
      const otherMods = serverToModsMap.get(serverId) || [];
      for (const other of otherMods) {
        if (other.id === m.id) continue;
        const existing = freq.get(other.id);
        if (existing) {
          existing.count++;
        } else {
          freq.set(other.id, { name: other.name, count: 1 });
        }
      }
    }

    const coDeployed = Array.from(freq.entries())
      .map(([id, data]) => ({ id, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...m,
      coDeployed
    };
  });

  // Update server mods with ranks
  for (const server of serverList) {
    for (const mod of server.mods) {
      const fullMod = modList.find(m => m.id === mod.id);
      if (fullMod) {
        mod.playerRank = fullMod.playerRank;
        mod.serverRank = fullMod.serverRank;
        mod.overallRank = fullMod.overallRank;
      }
    }
  }

  // Global stats
  const totalMods = mods.length;
  const currentPlayers = serverList.reduce((sum, s) => sum + s.players, 0);

  console.log(`📦 Writing to KV...`);
  console.log(`  - ${modList.length} mods`);
  console.log(`  - ${serverList.length} servers`);
  console.log(`  - ${currentPlayers} current players`);

  try {

    // Split mods into size-safe chunks
    const modChunks = buildChunks(modList, CHUNK_SIZE_LIST);

    console.log(`  - Writing mod chunks...`);
    for (let i = 0; i < modChunks.length; i++) {
      try {
        await kv.put(`${KV_KEYS.MODS}:${i}`, JSON.stringify(modChunks[i]));
        console.log(`    [OK] Mod chunk ${i+1}/${modChunks.length}`);
      } catch (err) {
        console.error(`    [FAIL] Mod chunk ${i+1}:`, err);
        throw err;
      }
    }

    // Store metadata
    await kv.put(`${KV_KEYS.MODS}:meta`, JSON.stringify({ total: modList.length, chunks: modChunks.length }));

    // Calculate SQE scores BEFORE writing to KV (eliminates double-write)
    // runServerScoring mutates serverList in-place, adding sqePoints and sqeRank
    console.log(`[SERVER_SCORING] Running for ${game} (pre-write)...`);
    const serverRanks = await runServerScoring(game, kv, serverList, modList);

    // Sort servers by players (descending) before sharding
    serverList.sort((a, b) => (b.players || 0) - (a.players || 0));

    // Split servers into size-safe chunks
    const serverChunks = buildChunks(serverList, CHUNK_SIZE_LIST);

    console.log(`  - Writing server chunks...`);
    for (let i = 0; i < serverChunks.length; i++) {
      try {
        await kv.put(`${KV_KEYS.SERVERS}:${i}`, JSON.stringify(serverChunks[i]));
        console.log(`    [OK] Server chunk ${i+1}/${serverChunks.length}`);
      } catch (err) {
        console.error(`    [FAIL] Server chunk ${i+1}:`, err);
        throw err;
      }
    }
    await kv.put(`${KV_KEYS.SERVERS}:meta`, JSON.stringify({ total: serverList.length, chunks: serverChunks.length }));

    console.log(`✅ KV write completed successfully`);

    // 6. Update Stats and Last Update time
    await kv.put(KV_KEYS.STATS, JSON.stringify({
      totalMods: modList.length,
      totalPlayers: currentPlayers,
      totalServers: serverList.length,
      lastUpdate: new Date().toISOString()
    }));
    await kv.put(KV_KEYS.LAST_UPDATE, new Date().toISOString());
  } catch (kvWriteErr) {
    console.error(`❌ KV Sync Error Detail:`, kvWriteErr);
    throw kvWriteErr;
  }

  console.log("💾 UPDATING KV HISTORY...");
  const today = new Date().toISOString().split('T')[0];

  /** ISO week bucket = Monday of that week (matches API history-query weekStartISO) */
  const weekStart = (isoDate: string): string => {
    const d = new Date(isoDate + 'T12:00:00Z');
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
  };

  try {
    const statsMap: Record<string, { p: number, s: number, r: number }> = {};
    for (const m of modList) {
      statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
    }

    // Server history snapshot (rank + players) for shared history
    const serverHistoryMap: Record<string, { rank: number; players: number }> = {};
    for (const s of serverList) {
      if (s.sqeRank) {
        serverHistoryMap[s.id] = { rank: s.sqeRank, players: s.players || 0 };
      }
    }

    const periods = [
      { name: 'hourly', key: `history:hourly:${game}`, limit: 12 },
      { name: 'daily', key: `history:daily:${game}`, limit: 31 },
      { name: 'weekly', key: `history:weekly:${game}`, limit: 52 },
      { name: 'monthly', key: `history:monthly:${game}`, limit: 12 },
      { name: 'yearly', key: `history:yearly:${game}`, limit: 5 },
    ];

    for (const period of periods) {
      const timeLabel =
        period.name === 'hourly'
          ? new Date().toISOString()
          : period.name === 'weekly'
            ? weekStart(today)
            : period.name === 'monthly'
              ? today.substring(0, 7)
              : period.name === 'yearly'
                ? today.substring(0, 4)
                : today;

      console.log(`  - Processing ${period.name} history...`);

      // 1. Get existing history (handle both legacy and sharded)
      let history: any[] = [];
      const meta = await kv.get(`${period.key}:meta`, 'json');
      if (meta && meta.chunks) {
        for (let i = 0; i < meta.chunks; i++) {
          const chunk = await kv.get(`${period.key}:${i}`, 'json');
          if (chunk && Array.isArray(chunk)) {
            for (const item of chunk) {
              history.push(item);
            }
          }
        }
      } else {
        history = await kv.get(period.key, 'json') || [];
      }

      // 2. Aggregate or append new point
      const existingIndex = history.findIndex((d: any) => d.time === timeLabel);
      
      if (
        existingIndex !== -1 &&
        (period.name === 'daily' ||
          period.name === 'weekly' ||
          period.name === 'monthly' ||
          period.name === 'yearly')
      ) {
        // PEAK AGGREGATION LOGIC:
        // Compare existing stats for the day with current stats and keep the best values
        const existingPoint = history[existingIndex];
        const mergedMods: Record<string, { p: number, s: number, r: number }> = { ...existingPoint.mods };
        
        for (const [id, current] of Object.entries(statsMap)) {
          const existing = mergedMods[id];
          if (existing) {
            mergedMods[id] = {
              p: Math.max(existing.p, current.p),
              s: Math.max(existing.s, current.s),
              r: Math.min(existing.r, current.r) // Lower is better for rank
            };
          } else {
            mergedMods[id] = current;
          }
        }
        // Merge server history (keep best rank and peak players)
        const mergedServers: Record<string, { rank: number; players: number }> = { ...(existingPoint.servers || {}) };
        for (const [id, data] of Object.entries(serverHistoryMap)) {
          const existing = mergedServers[id];
          if (existing) {
            mergedServers[id] = {
              rank: Math.min(existing.rank, data.rank), // Lower rank is better
              players: Math.max(existing.players, data.players), // Peak players
            };
          } else {
            mergedServers[id] = data;
          }
        }
        history[existingIndex] = { time: timeLabel, mods: mergedMods, servers: mergedServers };
      } else if (existingIndex !== -1) {
        // Hourly or just standard overwrite
        history[existingIndex] = { time: timeLabel, mods: statsMap, servers: serverHistoryMap };
      } else {
        // New point
        history.push({ time: timeLabel, mods: statsMap, servers: serverHistoryMap });
      }

      const updated = history.slice(-period.limit);

      // 3. Write sharded
      const chunks = buildChunks(updated, CHUNK_SIZE_HISTORY);
      console.log(`    - Writing ${period.name} history in ${chunks.length} chunks...`);
      
      for (let i = 0; i < chunks.length; i++) {
        await kv.put(`${period.key}:${i}`, JSON.stringify(chunks[i]));
      }
      await kv.put(`${period.key}:meta`, JSON.stringify({ total: updated.length, chunks: chunks.length }));
      
      // Cleanup legacy key if exists
      // await kv.delete(period.key); 

      console.log(`    ✅ ${period.name.toUpperCase()} updated (${updated.length} points, ${Object.keys(statsMap).length} mods)`);
    }
  } catch (kvErr) {
    console.error("⚠️ KV History Error:", kvErr);
  }

  // SQE scoring is now done BEFORE the initial server write (see above)
  // This eliminates the need for a second KV write pass, saving ~17 writes per run.

  console.log('✅ COLLECTOR: Complete!');
  return { servers: totalServers, mods: totalMods };
}

// Pagalbinė funkcija gauti istorijos tašką (skirta trending skaičiavimams)
async function getFullHistoryPoint(kv: CloudflareKVClient, baseKey: string, offsetFromEnd: number): Promise<any> {
    // UPDATED: Now uses getChunkedData to support sharded history blocks
    const history = await getChunkedData(kv, baseKey);
    if (!history || history.length === 0) return null;

    const point = history[history.length - offsetFromEnd] || history[0];
    return point || null;
}

// Helper to read chunked data from KV
async function getChunkedData(kv: CloudflareKVClient, baseKey: string): Promise<any[]> {
  const meta = await kv.get(`${baseKey}:meta`, 'json');
  if (!meta) return [];

  const chunks = [];
  for (let i = 0; i < meta.chunks; i++) {
    const chunk = await kv.get(`${baseKey}:${i}`, 'json') as any[];
    if (chunk && Array.isArray(chunk)) {
      for (const item of chunk) {
        chunks.push(item);
      }
    }
  }
  return chunks;
}

async function runTrendingSnapshot() {
  const game = parseGameType();
  console.log(`📈 TRENDING SNAPSHOT: Starting for ${game.toUpperCase()}...`);

  const kv = new CloudflareKVClient();
  const KV_KEYS = getKVKeys(game);

  try {
    const mods = await getChunkedData(kv, KV_KEYS.MODS);
    if (!mods || mods.length === 0) {
      throw new Error('No mods in cache - run collector first');
    }

    /**
     * TRENDING CALCULATION MODEL:
     * We calculate a 'trendScore' based on:
     * - rankDelta: The change in position (rising/falling).
     * - positionWeight: Harder to rise in Top 100 than Top 5000 (1/sqrt(rank)).
     * - activityMultiplier: Logarithmic player count to ensure active mods get priority.
     */
    const periods = [
        { name: 'daily', days: 1, baseKey: `history:daily:${game}` },
        { name: 'weekly', days: 7, baseKey: `history:daily:${game}` },
        { name: 'monthly', days: 30, baseKey: `history:daily:${game}` }
    ];

    for (const p of periods) {
        // Paimame istorinį tašką iš visų blokų
        let prevEntry = await getFullHistoryPoint(kv, p.baseKey, p.days);
        
        if (!prevEntry && p.days > 30) {
            const monthsBack = Math.ceil(p.days / 30);
            prevEntry = await getFullHistoryPoint(kv, `history:monthly:${game}`, monthsBack);
            if (prevEntry) console.log(`  [SMART LOOKUP] Using monthly sharded snapshot for ${p.name} trend`);
        }
        
        if (!prevEntry) {
            prevEntry = await getFullHistoryPoint(kv, p.baseKey, 999); // Fallback to oldest available
        }

        const prevMap = new Map();
        if (prevEntry?.mods) {
            Object.entries(prevEntry.mods).forEach(([id, s]: any) => prevMap.set(id, s));
        }

        const rising: any[] = [];
        const falling: any[] = [];
        const newMods: any[] = [];
        
        // Gauname bendrą statistiką dinaminiams slenksčiams (0.5%)
        const stats = await kv.get(KV_KEYS.STATS, 'json') || { totalPlayers: 5000, totalServers: 500 };
        const MIN_TREND_PLAYERS = Math.max(5, Math.floor(stats.totalPlayers * 0.005));
        const MIN_TREND_SERVERS = Math.max(2, Math.floor(stats.totalServers * 0.005));

        console.log(`📊 Dynamic Thresholds: Personnel >= ${MIN_TREND_PLAYERS}, Deployments >= ${MIN_TREND_SERVERS}`);

        for (const mod of mods) {
            const prev = prevMap.get(mod.id);
            const currentRank = mod.overallRank || 50000;
            const currentPlayers = mod.totalPlayers || 0;
            const currentServers = mod.serverCount || 0;
            
            const prevRank = prev?.r || 50000;
            const prevPlayers = prev?.p || 0;
            const prevServers = prev?.s || 0;

            // Reikšmingumo filtras: modas turi turėti pakankamai veiklos dabar arba praeityje
            const isSignificant = (currentPlayers >= MIN_TREND_PLAYERS || prevPlayers >= MIN_TREND_PLAYERS) &&
                                  (currentServers >= MIN_TREND_SERVERS || prevServers >= MIN_TREND_SERVERS);

            if (!prev) {
                // New Popular: traukiami tik tie nauji modai, kurie pasiekė bazinį aktyvumo lygį
                if (isSignificant && currentRank < 10000) {
                    newMods.push({ ...mod, trendScore: (50000 - currentRank) });
                }
            } else {
                const rankDelta = prevRank - currentRank;
                
                // Ignoruojame neaktyvius modus arba tuos, kieno reitingas nepakito
                if (!isSignificant || rankDelta === 0) continue;

                // Matematinis modelis:
                // 1. Pozicijos svoris (sunkiau pakilti Top 100 nei Top 5000)
                const positionWeight = 100 / Math.sqrt(Math.min(currentRank, prevRank));
                
                // 2. Aktyvumo daugiklis (logaritminis žaidėjų skaičius)
                const activityMultiplier = Math.log10(Math.max(currentPlayers, prevPlayers) + 1.1);
                
                const trendScore = rankDelta * positionWeight * activityMultiplier;

                if (rankDelta > 0) {
                    rising.push({ ...mod, currentRank, prevRank, rankDelta, trendScore });
                } else {
                    falling.push({ ...mod, currentRank, prevRank, rankDelta, trendScore });
                }
            }
        }

        rising.sort((a, b) => b.trendScore - a.trendScore);
        falling.sort((a, b) => a.trendScore - b.trendScore);
        newMods.sort((a, b) => a.overallRank - b.overallRank);

        const result = {
            data: {
                rising: rising.slice(0, 50),
                new: newMods.slice(0, 50),
                falling: falling.slice(0, 50)
            },
            meta: {
                lastUpdated: new Date().toISOString(),
                comparisonDate: prevEntry?.time || null
            }
        };

        await kv.put(`${KV_KEYS.TRENDING}:${p.name}`, JSON.stringify(result));
        console.log(`✅ TRENDING UPDATED for ${p.name}`);
        await sleep(500);
    }

    console.log(`✅ ROLLUP & TRENDING COMPLETED SUCCESSFULLY`);
    return { success: true };

  } catch (kvErr) {
    console.error("⚠️ Failed to update history/trending:", kvErr);
    throw kvErr;
  }
}


// CLI
const command = process.argv[2];

// CLI Execution Wrapper
if (process.argv[1] && (process.argv[1].endsWith('collector.ts') || process.argv[1].endsWith('collector'))) {
  (async () => {
    try {
      if (command === 'collect') {
        await runCollector();
      } else if (command === 'trending') {
        await runTrendingSnapshot();
      } else {
        console.log('Usage: npm run collect | trending');
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }
  })();
}

// Usage examples:
// npm run collect              # Collect Reforger (default)
// npm run collect -- --game=arma3  # Collect Arma 3
// npm run trending             # Trending snapshot for Reforger
// npm run trending -- --game=arma3 # Trending snapshot for Arma 3

/**
 * Server Quality & Efficiency Index Scoring
 */
async function runServerScoring(game: string, kv: CloudflareKVClient, serverList: any[], modList: any[]): Promise<Record<string, number>> {
  const leaderboardKey = `cache:ranking:servers:${game}`;

  try {
      // 1. Prepare Mod Rank Lookup (Dynamic Averages)
      const modRankMap = new Map();
      modList.forEach(m => modRankMap.set(m.id, m.overallRank || modList.length));

      const GLOBAL_AVG = modList.length / 2;
      const SCALING_FACTOR = GLOBAL_AVG / 100;

      // Load previous leaderboard for Exponential Moving Average (EMA) smoothing
      const oldScoresMap = new Map<string, number>();
      try {
          const oldLeaderboard = await kv.get(leaderboardKey, 'json');
          if (oldLeaderboard && Array.isArray(oldLeaderboard)) {
              oldLeaderboard.forEach(item => {
                  if (item && item.id) {
                      oldScoresMap.set(item.id, item.points || 0);
                  }
              });
          }
          console.log(`[SERVER_SCORING] Loaded ${oldScoresMap.size} previous server scores for EMA smoothing.`);
      } catch (err) {
          console.log(`[SERVER_SCORING] Could not read old leaderboard for EMA, defaulting to current snapshot scores.`);
      }

      // Add missing servers from previous leaderboard to ensure they decay slowly (fadeaway)
      const currentServerIds = new Set(serverList.map(s => s.id));
      for (const [oldId, oldPoints] of oldScoresMap.entries()) {
          if (!currentServerIds.has(oldId) && oldPoints > 10) {
              serverList.push({
                  id: oldId,
                  name: `[OFFLINE] Server ${oldId}`,
                  ip: null,
                  port: null,
                  players: 0,
                  maxPlayers: 0,
                  mods: []
              });
          }
      }

      // 2. Calculate current scores for ALL servers using EMA smoothing
      const currentScores: Record<string, number> = {};
      const ALPHA = 0.10; // 10% new snapshot, 90% previous score – smoother rank transitions

      for (const s of serverList) {
          const players = s.players || 0;
          const modCount = s.mods?.length || 0;

          const baseScore = (players * 5) - (modCount * 1);

          let avgRank = 0;
          if (modCount > 0) {
              const totalRank = s.mods.reduce((acc: number, m: any) => acc + (modRankMap.get(m.id) || 14000), 0);
              avgRank = totalRank / modCount;
          }

          let uniquenessBonus = Math.floor((avgRank - GLOBAL_AVG) / SCALING_FACTOR);
          uniquenessBonus = Math.min(100, Math.max(-100, uniquenessBonus));

          const snapshotScore = Math.max(0, baseScore + uniquenessBonus);
          const oldScore = oldScoresMap.get(s.id);

          if (oldScore !== undefined) {
              currentScores[s.id] = Math.floor(ALPHA * snapshotScore + (1 - ALPHA) * oldScore);
          } else {
              currentScores[s.id] = Math.floor(snapshotScore);
          }
      }

      // 3. Pre-calculate ranks for this snapshot (used for history + leaderboard)
      // Apply elite inertia: top 3 servers from the previous leaderboard receive
      // a small ranking cushion so #1-#3 positions don't flip on tiny score differences.
      const ELITE_INERTIA_SIZE = 3;
      const ELITE_INERTIA_BONUS_PCT = 0.05; // 5% score cushion for ranking only
      const rankingScores: Record<string, number> = { ...currentScores };

      if (oldLeaderboard && Array.isArray(oldLeaderboard)) {
          for (let i = 0; i < Math.min(ELITE_INERTIA_SIZE, oldLeaderboard.length); i++) {
              const eliteId = oldLeaderboard[i]?.id;
              if (eliteId && rankingScores[eliteId] !== undefined) {
                  rankingScores[eliteId] = Math.floor(rankingScores[eliteId] * (1 + ELITE_INERTIA_BONUS_PCT));
              }
          }
      }

      const sortedIds = Object.keys(rankingScores).sort((a, b) => rankingScores[b] - rankingScores[a]);
      const currentRanks: Record<string, number> = {};
      sortedIds.forEach((id, idx) => { currentRanks[id] = idx + 1; });

      // 4. Enrich serverList with SQE data
      for (const s of serverList) {
          s.sqePoints = Math.floor(currentScores[s.id] || 0);
          s.sqeRank = currentRanks[s.id] || (sortedIds.length + 1);
      }

      // 5. Save TOP 200 leaderboard
      const leaderboard = serverList
          .filter(s => s.sqePoints > 0 || s.players > 0)
          .sort((a, b) => a.sqeRank - b.sqeRank)
          .slice(0, 200)
          .map(s => ({
              id: s.id,
              name: s.name,
              points: s.sqePoints,
              players: s.players,
              modCount: s.mods?.length || 0,
              rank: s.sqeRank
          }));

      await kv.put(leaderboardKey, JSON.stringify(leaderboard));
      console.log(`[SERVER_SCORING] Leaderboard updated, ${serverList.length} servers enriched with SQE data.`);

      return currentRanks;

  } catch (err) {
      console.error(`[SERVER_SCORING] Error:`, err);
      return {};
  }
}
