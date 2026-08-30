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
import { buildScenarioRanking } from '../web/functions/lib/scenario-ranking.js';
import { normalizeBmServerStatus, isBmServerOnline } from '../web/functions/lib/server-status.js';
import {
  isServerOnlineSample,
  mergeServerHistorySnapshot,
} from '../web/functions/lib/server-uptime-history.js';
import {
  sizeCacheKey,
  authorCacheKey,
  WORKSHOP_KV_TTL,
} from '../web/functions/lib/workshop-fetch.ts';
import {
  workshopListByIds,
  sizeAuthorFromApiRow,
} from '../web/functions/lib/workshop-api.ts';
import { persistModsSearchIndexFromWarm } from '../web/functions/lib/mods-search-index.ts';
import {
  findModAliasTarget,
  modAliasKey,
  modAliasIndexKey,
  MOD_ALIAS_TTL_SECONDS,
  type ModAliasRecord,
} from '../web/functions/lib/mod-alias.ts';
import {
  appendModpackDiffDay,
  buildModpackDiffDay,
  modpackDiffKeys,
  normalizeModIds,
  type ModpackDiffDay,
  type ModsetFingerprint,
} from '../web/functions/lib/modpack-diff.js';

type BattleMetricsServer = Awaited<ReturnType<BattleMetricsService['fetchAllServers']>>[number];

interface CloudflareKV {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
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

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    // TTL turi patekti i URL, kitaip cache:mod-size ir panasūs raktai rašomi be
    // galiojimo ir niekada nebeatnaujinami (stale dydžiai lieka amžinai).
    const url =
      options?.expirationTtl && options.expirationTtl > 0
        ? this.baseUrl(`/values/${key}?expiration_ttl=${options.expirationTtl}`)
        : this.baseUrl(`/values/${key}`);
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(url, {
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

  async get(key: string, type: 'json' | 'text' = 'json'): Promise<any> {
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
    if (type === 'text') return text;
    return JSON.parse(text);
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
    SCENARIO_RANKING: `cache:ranking:scenarios:${game}`,
    SERVER_BM_LAST_SEEN: `cache:server_bm_last_seen:${game}`,
  };
}

/** BattleMetrics scenario/mission label for server list and detail. */
function extractScenarioName(
  attributes: BattleMetricsServer['attributes'],
  game: GameType
): string | null {
  if (game === 'reforger') {
    const name = attributes.details?.reforger?.scenarioName;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  }
  const map = attributes.details?.map;
  const mission = attributes.details?.mission;
  if (typeof map === 'string' && map.trim() && typeof mission === 'string' && mission.trim()) {
    return `${map.trim()} · ${mission.trim()}`;
  }
  if (typeof mission === 'string' && mission.trim()) return mission.trim();
  if (typeof map === 'string' && map.trim()) return map.trim();
  return null;
}

/** Persist last collector run when each server had BM status online (or players > 0). */
async function attachBmLastSeenTimestamps(
  kv: CloudflareKVClient,
  game: GameType,
  serverList: Array<{
    id: string;
    bmStatus?: string | null;
    players?: number;
    bmLastSeenAt?: string | null;
  }>,
  runAt: string,
  lastSeenKey: string
): Promise<void> {
  let map: Record<string, string> = {};
  try {
    const raw = await kv.get(lastSeenKey, 'json');
    if (raw && typeof raw === 'object') map = raw as Record<string, string>;
  } catch {
    // start fresh
  }

  const serverIds = new Set(serverList.map((s) => s.id));

  for (const server of serverList) {
    const status = normalizeBmServerStatus(server.bmStatus);
    const online = isBmServerOnline(status) || (server.players ?? 0) > 0;
    if (online) {
      map[server.id] = runAt;
      server.bmLastSeenAt = runAt;
    } else {
      server.bmLastSeenAt = map[server.id] ?? null;
    }
  }

  const pruned: Record<string, string> = {};
  for (const [id, ts] of Object.entries(map)) {
    if (serverIds.has(id)) pruned[id] = ts;
  }

  try {
    await kv.put(lastSeenKey, JSON.stringify(pruned));
  } catch (err) {
    console.log(`[BM_LAST_SEEN] Could not persist last-seen map.`, err);
  }
}

/** Copy cached workshop authors into leaderboard mod rows (no live scrape). */
async function attachModAuthorsFromKvCache(
  kv: CloudflareKVClient,
  game: GameType,
  modList: Array<{ id: string; author?: string | null }>
): Promise<void> {
  if (game !== 'reforger') return;

  const concurrency = 25;
  let attached = 0;

  for (let i = 0; i < modList.length; i += concurrency) {
    const batch = modList.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (mod) => {
        if (mod.author) return;
        const key = `cache:mod-author:reforger:${mod.id.toUpperCase()}`;
        try {
          const raw = await kv.get(key, 'text');
          const author = typeof raw === 'string' ? raw.trim() : null;
          if (author) {
            mod.author = author;
            attached++;
          }
        } catch {
          /* cache miss */
        }
      })
    );
  }

  console.log(`  - author attached: ${attached}/${modList.length} from workshop KV cache`);
}

/** Copy workshop download sizes from KV into leaderboard mod rows (no live scrape). */
async function attachModSizesFromKvCache(
  kv: CloudflareKVClient,
  game: GameType,
  modList: Array<{ id: string; sizeBytes?: number | null }>
): Promise<void> {
  const gameKey = game === 'arma3' ? 'arma3' : 'reforger';
  const concurrency = 25;
  let attached = 0;

  for (let i = 0; i < modList.length; i += concurrency) {
    const batch = modList.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (mod) => {
        const key = `cache:mod-size:${gameKey}:${mod.id.toUpperCase()}`;
        try {
          const raw = await kv.get(key, 'json');
          const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
          if (Number.isFinite(n) && n > 0) {
            mod.sizeBytes = n;
            attached++;
          }
        } catch {
          /* cache miss */
        }
      })
    );
  }

  console.log(`  - sizeBytes attached: ${attached}/${modList.length} from workshop KV cache`);
}

/**
 * Re-upload aptikimas: senas itemas nepasiekiamas + LYGIAGAI VIENAS kandidatas
 * su ta pačia pavadinimo + autoriaus pora → rašom alias į KV. Dviprasmybė =
 * nesujungiam (žr. mod-alias.ts). Aliass vėliau naudoja edge 301 redirectui
 * ir seno ID slėpimui iš sąrašų.
 */
async function detectModAliases(
  kv: CloudflareKVClient,
  game: GameType,
  modList: Array<{ id: string; name?: string | null; author?: string | null }>,
  unavailableIds: string[]
): Promise<void> {
  if (game !== 'reforger' || !unavailableIds.length) return;

  let created = 0;
  for (const rawId of unavailableIds) {
    const upper = rawId.toUpperCase();
    try {
      const existing = await kv.get(modAliasKey('reforger', upper), 'text');
      // Jau nukreiptas – nieko nekeičiam (idempotentiška per pakartotinus run'us).
      if (existing) continue;

      const row = modList.find((m) => String(m.id).toUpperCase() === upper);
      // Be pavadinimo/autoriaus telemetrijos poros nesuderinam – paliekam kaip yra.
      if (!row || !row.name || !row.author) continue;

      const targetId = findModAliasTarget(row, modList);
      if (!targetId) continue;

      const record: ModAliasRecord = {
        targetId,
        matchedBy: 'name+author',
        createdAt: new Date().toISOString(),
      };
      await kv.put(modAliasKey('reforger', upper), JSON.stringify(record), {
        expirationTtl: MOD_ALIAS_TTL_SECONDS,
      });

      // Reverse index – edge sąrašams (/mods, trending, sitemap) filtruoti vienu read'u.
      const rawIndex = await kv.get(modAliasIndexKey('reforger'), 'json');
      const index: string[] = Array.isArray(rawIndex) ? rawIndex : [];
      if (!index.includes(upper)) index.push(upper);
      await kv.put(modAliasIndexKey('reforger'), JSON.stringify(index), {
        expirationTtl: MOD_ALIAS_TTL_SECONDS,
      });

      created++;
      console.log(`  - mod alias: ${upper} -> ${targetId}`);
    } catch (err) {
      console.log(`  - mod alias check failed for ${upper}:`, err);
    }
  }
  if (created) console.log(`  - mod aliases created: ${created}/${unavailableIds.length}`);
}
/** Fetch workshop version size for top-ranked mods missing KV cache (populates cache:mod-size). */
async function warmTopModSizesFromWorkshop(
  kv: CloudflareKVClient,
  game: GameType,
  modList: Array<{ id: string; overallRank: number; sizeBytes?: number | null; author?: string | null }>,
  limit = 300,
  unavailableIds: string[] = [],
  copiesOut?: Map<string, { summary?: string | null; description?: string | null }>
): Promise<void> {
  if (game !== 'reforger') return;

  const top = [...modList].sort((a, b) => a.overallRank - b.overallRank).slice(0, limit);
  const missing = top.filter((m) => (!m.sizeBytes || m.sizeBytes <= 0) || !m.author);
  if (!missing.length) {
    console.log(`  - workshop warm: skipped (top ${limit} already sized + authored)`);
    return;
  }

  // Batch via official Workshop API (up to 50/request) instead of 1 HTML fetch per mod.
  const ids = missing.map((m) => m.id);
  const { rows, networkError } = await workshopListByIds(ids);
  if (networkError) {
    // API laikinai nepasiekiama — NEŽYMĖTI modų kaip unavailable (apsauga nuo klaidingų alias'ų).
    console.warn('  - workshop warm: API network error — skipping unavailable marking');
    return;
  }
  const rowById = new Map(rows.map((r) => [r.id.toUpperCase(), r]));

  let warmed = 0;
  for (const mod of missing) {
    const row = rowById.get(mod.id.toUpperCase());
    if (!row) {
      unavailableIds.push(mod.id);
      continue;
    }
    const { sizeBytes, author, blocked } = sizeAuthorFromApiRow(row);
    if (blocked) {
      unavailableIds.push(mod.id);
      continue;
    }
    if (sizeBytes && sizeBytes > 0) {
      await kv.put(sizeCacheKey('reforger', mod.id), String(sizeBytes), { expirationTtl: WORKSHOP_KV_TTL });
      mod.sizeBytes = sizeBytes;
    }
    if (author) {
      await kv.put(authorCacheKey('reforger', mod.id), author, { expirationTtl: WORKSHOP_KV_TTL });
      mod.author = author;
    }
    if ((row.summary || undefined) && copiesOut) {
      copiesOut.set(mod.id.toUpperCase(), { summary: row.summary ?? null, description: null });
    }
    if (sizeBytes || author) warmed++;
  }

  console.log(`  - workshop warm: ${warmed}/${missing.length} top-mod fetches (cap ${limit}, via API batch)`);
}

/** Warm workshop sizes for mods on active servers (beyond global top-300). */
async function warmServerModpackModSizes(
  kv: CloudflareKVClient,
  game: GameType,
  serverList: Array<{ players?: number; mods?: Array<{ id: string }> }>,
  modList: Array<{ id: string; sizeBytes?: number | null; author?: string | null }>,
  limit = 500,
  unavailableIds: string[] = [],
  copiesOut?: Map<string, { summary?: string | null; description?: string | null }>
): Promise<void> {
  if (game !== 'reforger') return;

  const fullyCachedIds = new Set(
    modList
      .filter(
        (m) =>
          typeof m.sizeBytes === 'number' &&
          m.sizeBytes > 0 &&
          typeof m.author === 'string' &&
          m.author.length > 0
      )
      .map((m) => m.id.toUpperCase())
  );

  const orderedServers = [...serverList].sort((a, b) => (b.players ?? 0) - (a.players ?? 0));
  const missingIds: string[] = [];
  const seen = new Set<string>();

  for (const server of orderedServers) {
    if ((server.players ?? 0) <= 0) continue;
    for (const mod of server.mods ?? []) {
      const upper = mod.id.toUpperCase();
      if (fullyCachedIds.has(upper) || seen.has(upper)) continue;
      seen.add(upper);
      missingIds.push(mod.id);
      if (missingIds.length >= limit) break;
    }
    if (missingIds.length >= limit) break;
  }

  if (!missingIds.length) {
    console.log('  - server modpack warm: skipped (all active-server mods sized)');
    return;
  }

  // Batch via official Workshop API (up to 50/request) instead of 1 HTML fetch per mod.
  const { rows, networkError } = await workshopListByIds(missingIds);
  if (networkError) {
    // API laikinai nepasiekiama — NEŽYMĖTI modų kaip unavailable (apsauga nuo klaidingų alias'ų).
    console.warn('  - server modpack warm: API network error — skipping unavailable marking');
    return;
  }
  const rowById = new Map(rows.map((r) => [r.id.toUpperCase(), r]));

  let warmed = 0;
  for (const modId of missingIds) {
    const row = rowById.get(modId.toUpperCase());
    if (!row) {
      unavailableIds.push(modId);
      continue;
    }
    const { sizeBytes, author, blocked } = sizeAuthorFromApiRow(row);
    if (blocked) {
      unavailableIds.push(modId);
      continue;
    }
    if (sizeBytes && sizeBytes > 0) {
      await kv.put(sizeCacheKey('reforger', modId), String(sizeBytes), { expirationTtl: WORKSHOP_KV_TTL });
    }
    if (author) {
      await kv.put(authorCacheKey('reforger', modId), author, { expirationTtl: WORKSHOP_KV_TTL });
    }
    if ((row.summary || undefined) && copiesOut) {
      copiesOut.set(modId.toUpperCase(), { summary: row.summary ?? null, description: null });
    }
    const modRow = modList.find((m) => m.id.toUpperCase() === modId.toUpperCase());
    if (modRow) {
      if (sizeBytes) modRow.sizeBytes = sizeBytes;
      if (author) modRow.author = author;
    }
    if (sizeBytes || author) warmed++;
  }
  console.log(`  - server modpack warm: ${warmed}/${missingIds.length} fetches (cap ${limit}, via API batch)`);
}

function attachServerModpackSizes(
  serverList: Array<{
    mods?: Array<{ id: string }>;
    modpackKnownBytes?: number;
    modpackEstimatedBytes?: number;
    modpackSizedCount?: number;
    modpackModCount?: number;
    modpackCoverage?: number;
  }>,
  modSizeById: Map<string, number>
): void {
  let withSizes = 0;
  for (const server of serverList) {
    const mods = server.mods ?? [];
    let knownBytes = 0;
    let knownCount = 0;
    for (const mod of mods) {
      const size =
        modSizeById.get(mod.id.toUpperCase()) ?? modSizeById.get(mod.id) ?? 0;
      if (size > 0) {
        knownBytes += size;
        knownCount++;
      }
    }
    const modCount = mods.length;
    let estimatedBytes = knownBytes;
    if (knownCount > 0 && knownCount < modCount) {
      const avg = knownBytes / knownCount;
      estimatedBytes = Math.round(knownBytes + avg * (modCount - knownCount));
    }
    server.modpackKnownBytes = knownBytes;
    server.modpackEstimatedBytes = estimatedBytes;
    server.modpackSizedCount = knownCount;
    server.modpackModCount = modCount;
    server.modpackCoverage = modCount > 0 ? knownCount / modCount : 0;
    if (knownCount > 0) withSizes++;
  }
  console.log(`  - modpack sizes attached: ${withSizes}/${serverList.length} servers`);
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
      gameMods = (attributes.details?.reforger?.mods || []).map((sm) => ({
        modId: String(sm.modId).toUpperCase(),
        name: sm.name,
      }));
    }

    serverList.push({
      id,
      name: attributes.name,
      ip: attributes.ip || '',
      port: attributes.port || 0,
      players: attributes.players,
      maxPlayers: attributes.maxPlayers,
      scenarioName: extractScenarioName(attributes, game),
      bmStatus: normalizeBmServerStatus(attributes.status),
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
    const modNameById = new Map(modList.map((row) => [row.id, row.name]));
    
    for (const serverId of serverIds) {
      const otherMods = serverToModsMap.get(serverId) || [];
      for (const other of otherMods) {
        if (other.id === m.id) continue;
        const existing = freq.get(other.id);
        if (existing) {
          existing.count++;
        } else {
          freq.set(other.id, { name: modNameById.get(other.id) ?? other.name, count: 1 });
        }
      }
    }

    const coDeployed = Array.from(freq.entries())
      .map(([id, data]) => ({
        id,
        name: modNameById.get(id) ?? data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...m,
      coDeployed
    };
  });

  // Attach workshop download sizes from KV cache (filled by mod detail / metadata fetch).
  const unavailableWorkshopIds: string[] = [];
  const warmedCopies = new Map<string, { summary?: string | null; description?: string | null }>();
  await attachModSizesFromKvCache(kv, game, modList);
  await attachModAuthorsFromKvCache(kv, game, modList);
  await warmTopModSizesFromWorkshop(kv, game, modList, 300, unavailableWorkshopIds, warmedCopies);
  await warmServerModpackModSizes(kv, game, serverList, modList, 500, unavailableWorkshopIds, warmedCopies);
  const searchIndexSize = await persistModsSearchIndexFromWarm(kv, game, modList, warmedCopies);
  if (searchIndexSize > 0) {
    console.log(`  - mods search index: ${searchIndexSize} entries (${warmedCopies.size} warmed this run)`);
  }
  await detectModAliases(kv, game, modList, unavailableWorkshopIds);

  const modSizeById = new Map<string, number>();
  for (const m of modList) {
    if (typeof m.sizeBytes === 'number' && m.sizeBytes > 0) {
      modSizeById.set(m.id.toUpperCase(), m.sizeBytes);
    }
  }
  attachServerModpackSizes(serverList, modSizeById);

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

    const runAt = new Date().toISOString();
    await attachBmLastSeenTimestamps(kv, game, serverList, runAt, KV_KEYS.SERVER_BM_LAST_SEEN);

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

    const scenarioRanking = buildScenarioRanking(serverList);
    await kv.put(KV_KEYS.SCENARIO_RANKING, JSON.stringify(scenarioRanking));
    console.log(`  - ${scenarioRanking.length} scenarios ranked`);

    console.log(`✅ KV write completed successfully`);

    // 6. Precomputed pages — „bendras šildymas“ (compute-at-write).
    // Karšti default view puslapiai (24/page) ir serverių sąrašas kolektoriaus
    // run metu tampa paruoštais KV raktais visiems vartotojams.
    if (game === 'reforger') {
      const {
        PRECOMPUTED_MODS_PAGE_SIZE,
        PRECOMPUTED_MODS_SIZE,
        PRECOMPUTED_SERVERS_SIZE,
        PRECOMPUTED_TTL_SECONDS,
        precomputedModsCacheKey,
        precomputedServersCacheKey,
        precomputedStatsCacheKey,
      } = await import('../web/functions/lib/precomputed-pages.ts');

      // Aliased-cleanup ta pati, kaip ir workerio isDefaultView filtravimas.
      const aliasedIds = await import('../web/functions/lib/mod-alias.ts')
        .then((m) => m.loadAliasedModIdSet(kv as any, 'reforger'));
      const filteredForPage = modList.filter(
        (m: { id: string }) => !aliasedIds.has(String(m.id).toUpperCase())
      );

      const attachCachedFieldsForPage = async (rows: Array<Record<string, unknown>>) => {
        await Promise.all(
          rows.map(async (mod) => {
            const id = String((mod as { id: string }).id);
            const needsAuthor = (mod as { author?: string }).author === undefined;
            const needsThumb = (mod as { thumbnail?: string }).thumbnail === undefined;
            const needsStatus = (mod as { workshopStatus?: string }).workshopStatus === undefined;
            const { authorCacheKey, ogImageCacheKey, statusCacheKey } =
              await import('../web/functions/lib/workshop-fetch.ts');
            const [author, thumb, statusRaw] = await Promise.all([
              needsAuthor ? kv.get(authorCacheKey('reforger', id), 'text') : null,
              needsThumb ? kv.get(ogImageCacheKey('reforger', id), 'text') : null,
              needsStatus ? kv.get(statusCacheKey('reforger', id), 'text') : null,
            ]);
            if (needsAuthor) (mod as Record<string, unknown>).author = author ?? null;
            if (needsThumb) (mod as Record<string, unknown>).thumbnail = thumb ?? null;
            if (needsStatus) {
              if (statusRaw) {
                try {
                  const p = JSON.parse(statusRaw) as { status?: string; checkedAt?: string | null };
                  if (p.status === 'available' || p.status === 'unavailable') {
                    (mod as Record<string, unknown>).workshopStatus = p.status;
                    (mod as Record<string, unknown>).workshopStatusCheckedAt = p.checkedAt ?? null;
                  } else (mod as Record<string, unknown>).workshopStatus = 'unknown';
                } catch { (mod as Record<string, unknown>).workshopStatus = 'unknown'; }
              } else (mod as Record<string, unknown>).workshopStatus = 'unknown';
            }
          })
        );
      };

      // Modų puslapiai: pirma [PRECOMPUTED_MODS_SIZE] įrašų (4×24) su įlietu workshop cache.
      const modsSlice = filteredForPage.slice(0, PRECOMPUTED_MODS_SIZE);
      await attachCachedFieldsForPage(modsSlice as Array<Record<string, unknown>>);
      const modsPayload = {
        header: {
          generatedAt: new Date().toISOString(),
          pages: Math.ceil(modsSlice.length / PRECOMPUTED_MODS_PAGE_SIZE),
          pageSize: PRECOMPUTED_MODS_PAGE_SIZE,
          total: filteredForPage.length,
        },
        mods: modsSlice,
      };
      await kv.put(precomputedModsCacheKey('reforger'), JSON.stringify(modsPayload), {
        expirationTtl: PRECOMPUTED_TTL_SECONDS,
      });
      console.log(`  - precomputed mods pages: ${modsSlice.length} row'ų į ${precomputedModsCacheKey('reforger')}`);

      // Serverių sąrašas — pilna 200 (serversApi.getList default), enriched su SQE.
      const serversSlice = [...serverList]
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const ra = Number((a.sqeRank as number | undefined) ?? Number.MAX_SAFE_INTEGER);
          const rb = Number((b.sqeRank as number | undefined) ?? Number.MAX_SAFE_INTEGER);
          if (ra !== rb) return ra - rb;
          return (((b.players as number) | 0) - ((a.players as number) | 0));
        })
        .slice(0, PRECOMPUTED_SERVERS_SIZE) as Array<Record<string, unknown>>;
      const serversPayload = {
        header: {
          generatedAt: new Date().toISOString(),
          pages: 1,
          pageSize: PRECOMPUTED_SERVERS_SIZE,
          total: serverList.length,
        },
        servers: serversSlice,
      };
      await kv.put(precomputedServersCacheKey('reforger'), JSON.stringify(serversPayload), {
        expirationTtl: PRECOMPUTED_TTL_SECONDS,
      });
      console.log(`  - precomputed servers: ${serversSlice.length} row'ų į ${precomputedServersCacheKey('reforger')}`);

      const statsPayload = {
        generatedAt: new Date().toISOString(),
        totalMods: modList.length,
        totalPlayers: currentPlayers,
        totalServers: serverList.length,
      };
      await kv.put(precomputedStatsCacheKey('reforger'), JSON.stringify(statsPayload), {
        expirationTtl: PRECOMPUTED_TTL_SECONDS,
      });
    }

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

    // Server history snapshot (rank + players + uptime samples) for shared history
    const serverHistoryMap: Record<string, { rank: number; players: number; online: boolean }> = {};
    for (const s of serverList) {
      if (s.sqeRank) {
        serverHistoryMap[s.id] = {
          rank: s.sqeRank,
          players: s.players || 0,
          online: isServerOnlineSample(s.bmStatus, s.players, isBmServerOnline),
        };
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
        // Merge server history (peak rank/players + uptime sample counts)
        const mergedServers: Record<string, { rank: number; players: number; online: boolean; on?: number; n?: number }> = {
          ...(existingPoint.servers || {}),
        };
        for (const [id, data] of Object.entries(serverHistoryMap)) {
          mergedServers[id] = mergeServerHistorySnapshot(mergedServers[id], data);
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

  // Once per UTC day: modlist added/removed diffs (sparse ring, 30d retention).
  try {
    await updateModpackDiffDaily(kv, game, serverList, modList, today, buildChunks);
  } catch (diffErr) {
    console.error('⚠️ Modpack diff update failed:', diffErr);
  }

  console.log('✅ COLLECTOR: Complete!');
  return { servers: totalServers, mods: totalMods };
}

/**
 * Daily fingerprint + sparse diffs. First run of the day after bootstrap writes
 * only non-empty { a, r } per server. Suspicious BM drops are skipped.
 */
async function updateModpackDiffDaily(
  kv: CloudflareKVClient,
  game: GameType,
  serverList: Array<{ id: string; mods?: Array<{ id: string; name: string }> }>,
  modList: Array<{ id: string; name: string }>,
  today: string,
  chunkFn: (items: any[], maxBytes: number) => any[][]
): Promise<void> {
  const keys = modpackDiffKeys(game);
  const fp = (await kv.get(keys.fingerprint, 'json')) as ModsetFingerprint | null;

  const currentServers: Record<string, string[]> = {};
  const nameById = new Map<string, string>();
  for (const m of modList) {
    if (m?.id) nameById.set(m.id, m.name || m.id);
  }
  for (const s of serverList) {
    for (const m of s.mods || []) {
      if (m?.id) nameById.set(m.id, m.name || m.id);
    }
    currentServers[s.id] = normalizeModIds(s.mods || []);
  }

  if (fp?.date === today) {
    console.log('  - modpack diff: already recorded for today, skip');
    return;
  }

  if (!fp?.date || !fp.servers) {
    await kv.put(keys.fingerprint, JSON.stringify({ date: today, servers: currentServers } satisfies ModsetFingerprint));
    console.log(`  - modpack diff: fingerprint bootstrapped (${Object.keys(currentServers).length} servers)`);
    return;
  }

  const built = buildModpackDiffDay(today, fp, currentServers, nameById);
  if (!built) {
    console.log('  - modpack diff: nothing to write');
    return;
  }

  if (built.changedServers > 0) {
    const history = (await getChunkedData(kv, keys.history)) as ModpackDiffDay[];
    const updated = appendModpackDiffDay(history, built.day);
    const chunks = chunkFn(updated, CHUNK_SIZE_HISTORY);
    for (let i = 0; i < chunks.length; i++) {
      await kv.put(`${keys.history}:${i}`, JSON.stringify(chunks[i]));
    }
    await kv.put(`${keys.history}:meta`, JSON.stringify({ total: updated.length, chunks: chunks.length }));
  }

  await kv.put(keys.fingerprint, JSON.stringify({ date: today, servers: currentServers } satisfies ModsetFingerprint));

  console.log(
    `  - modpack diff: ${built.changedServers} servers changed, ${built.skippedSuspicious} suspicious skips`
  );
}

// Helper function to retrieve a history point (used for trending calculations)
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
        // Retrieve the historical point from all sharded blocks
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
        
        // Fetch global statistics for dynamic thresholds (0.5%)
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

            // Significance filter: mod must have enough activity currently or historically
            const isSignificant = (currentPlayers >= MIN_TREND_PLAYERS || prevPlayers >= MIN_TREND_PLAYERS) &&
                                  (currentServers >= MIN_TREND_SERVERS || prevServers >= MIN_TREND_SERVERS);

            if (!prev) {
                // New Popular: extract only new mods that have reached the baseline activity level
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
                
                // 2. Activity Multiplier (logarithmic player count)
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

      // --- Continuity for EVERY server (not just top-200) ---
      // Persisting a running EMA score + age per server means no server re-enters at full
      // snapshot each run. Without it, any newcomer (or any server outside the previous
      // top-200) bypassed EMA entirely and could leapfrog to #1 on a single snapshot.
      const emaKey = `cache:server_ema:${game}`;
      // Half-life H=10 days (120 runs × 2h) — Pareto optimum from backtest
      // (1.23.9: H=10 τ0.8 noise 11.6% response 17.5d; production was H=0.55d).
      // alpha_run = 1 - 2^(-1 / (H*12)) — time-calibrated, not magic.
      const HALF_LIFE_DAYS = 10;
      const ALPHA = 1 - Math.pow(2, -1 / (HALF_LIFE_DAYS * 12)); // ≈0.0058
      const RAMP_RUNS = 168;          // ~14 days (168 runs x 2h) for a new server to reach full rank weight
      const TENURE_FLOOR = 0.25;      // a brand-new server's rank starts at 25% weight, ramping to 100%
      const TAU = 0.80;               // P(swap) > tau to overtake — hysteresis (0.5 = none)

      // Previous top-200 leaderboard — elite inertia source + EMA warm-start seed.
      const oldScoresMap = new Map<string, number>();
      let oldLeaderboard: Array<{ id?: string; points?: number }> | null = null;
      try {
          oldLeaderboard = await kv.get(leaderboardKey, 'json');
          if (oldLeaderboard && Array.isArray(oldLeaderboard)) {
              oldLeaderboard.forEach(item => {
                  if (item && item.id) oldScoresMap.set(item.id, item.points || 0);
              });
          }
      } catch (err) {
          console.log(`[SERVER_SCORING] Could not read previous leaderboard.`);
      }

      // Running EMA map persisted across runs: { id: { s: emaScore, a: age } }.
      // age = consecutive runs the server has been seen online.
      type EmaEntry = { s: number; a: number };
      let emaMap: Record<string, EmaEntry> = {};
      try {
          const persisted = await kv.get(emaKey, 'json');
          if (persisted && typeof persisted === 'object') emaMap = persisted as Record<string, EmaEntry>;
      } catch (err) {
          console.log(`[SERVER_SCORING] Could not read persisted EMA map, starting fresh.`);
      }

      // Warm-start: on first run after deploy there is no persisted EMA. Seed it from the
      // previous top-200 so established servers keep their rank/age instead of collapsing
      // to the new-entrant seed fraction.
      if (Object.keys(emaMap).length === 0 && oldScoresMap.size > 0) {
          for (const [id, points] of oldScoresMap.entries()) {
              emaMap[id] = { s: points, a: RAMP_RUNS };
          }
          console.log(`[SERVER_SCORING] Warm-started EMA map from ${oldScoresMap.size} previous scores.`);
      }

      // Fadeaway: re-add offline but still-relevant servers so they decay slowly instead of
      // vanishing. Sourced from the EMA map (all seen servers), bounded by a score floor.
      const currentServerIds = new Set(serverList.map(s => s.id));
      for (const [oldId, entry] of Object.entries(emaMap)) {
          if (!currentServerIds.has(oldId) && entry.s > 10) {
              serverList.push({
                  id: oldId,
                  name: `[OFFLINE] Server ${oldId}`,
                  ip: null,
                  port: null,
                  players: 0,
                  maxPlayers: 0,
                  bmStatus: 'offline',
                  mods: []
              });
          }
      }

      // 2. Score every server: EMA continuity for known servers, seed fraction for newcomers.
      const currentScores: Record<string, number> = {};

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
          const prev = emaMap[s.id];

          let newScore: number;
          let age: number;
          if (prev) {
              // Known server: blend the new snapshot into history. An offline (players 0)
              // snapshot is ~0, so the score fades ~10%/run — the slow decay.
              newScore = ALPHA * snapshotScore + (1 - ALPHA) * prev.s;
              age = players > 0 ? prev.a + 1 : prev.a;   // age only accrues while online
          } else {
              // First sighting: enter at full quality — tenure weighting (below) gates the rank.
              newScore = snapshotScore;
              age = 1;
          }

          currentScores[s.id] = Math.floor(newScore);
          emaMap[s.id] = { s: Math.floor(newScore), a: age };
      }

      // Persist the EMA map, pruning dead low-score offline servers to bound growth.
      const persistedEma: Record<string, EmaEntry> = {};
      for (const [id, entry] of Object.entries(emaMap)) {
          if (entry.s > 10 || currentServerIds.has(id)) persistedEma[id] = entry;
      }
      try {
          await kv.put(emaKey, JSON.stringify(persistedEma));
      } catch (err) {
          console.log(`[SERVER_SCORING] Could not persist EMA map.`);
      }
      console.log(`[SERVER_SCORING] Scored ${serverList.length} servers (${Object.keys(persistedEma).length} tracked in EMA map).`);

      // 3. Tenure weighting — the "sustained performance" signal. Rank rewards servers that
      // have proven themselves over time: a brand-new server's rank starts at TENURE_FLOOR and
      // ramps to full weight over RAMP_RUNS (~14 days) of being seen online. This is level x
      // longevity: one good snapshot can no longer crown a newcomer, and a month of strong
      // performance outranks a week of it.
      const rankingScores: Record<string, number> = {};
      const displayedScores: Record<string, number> = {};
      for (const id of Object.keys(currentScores)) {
          const age = emaMap[id]?.a ?? 1;
          const tenure = TENURE_FLOOR + (1 - TENURE_FLOOR) * Math.min(1, age / RAMP_RUNS);
          const weighted = Math.floor(currentScores[id] * tenure);
          displayedScores[id] = weighted;     // shown points = quality x tenure (no elite cushion)
          rankingScores[id] = weighted;
      }

      // Probabilistic rank hysteresis (Thurstone): top-200 order kept from
      // previous run; an adjacent pair swaps only when P(better)=Φ((μb−μa)/√(σ²a+σ²b)) > TAU.
      // σ estimated as 50/√age (age in runs) — newcomers uncertain, veterans tight.
      // This replaces the ad-hoc elite inertia (top-3 cushion) with a principled
      // incumbency advantage that scales with uncertainty.
      const prevOrder: string[] = Array.isArray(oldLeaderboard)
        ? oldLeaderboard.map((e) => e.id).filter(Boolean) as string[]
        : [];
      const sdFor = (id: string): number => {
        const age = emaMap[id]?.a ?? 1;
        return 50 / Math.sqrt(Math.max(1, age));
      };
      const normalCdfLocal = (x: number): number => {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.39894228 * Math.exp(-(x * x) / 2);
        let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
        return x >= 0 ? 1 - p : p;
      };
      const probBetter = (idA: string, idB: string): number => {
        const muA = rankingScores[idA] ?? 0, muB = rankingScores[idB] ?? 0;
        const sdA = sdFor(idA), sdB = sdFor(idB);
        return normalCdfLocal((muB - muA) / Math.sqrt(sdA * sdA + sdB * sdB));
      };

      // Build initial top-200 order from previous run (present servers) + newcomers by mu
      const allIdsSortedByMu = Object.keys(rankingScores).sort((a, b) => rankingScores[b] - rankingScores[a]);
      let band: string[];
      if (prevOrder.length === 0 || TAU <= 0.5) {
        band = allIdsSortedByMu.slice(0, 200);
      } else {
        const pos = new Map(prevOrder.map((id, i) => [id, i]));
        const inBand = allIdsSortedByMu.slice(0, 220);
        inBand.sort((a, b) => {
          const pa = pos.has(a) ? pos.get(a)! : 1000;
          const pb = pos.has(b) ? pos.get(b)! : 1000;
          return pa - pb;
        });
        band = inBand.slice(0, 200);
        let swapped = true;
        while (swapped) {
          swapped = false;
          for (let i = 0; i < band.length - 1; i++) {
            if (probBetter(band[i], band[i + 1]) > TAU) {
              const tmp = band[i]; band[i] = band[i + 1]; band[i + 1] = tmp; swapped = true;
            }
          }
        }
      }

      const bandSet = new Set(band);
      const sortedIds = band.length ? [...band, ...allIdsSortedByMu.filter((id) => !bandSet.has(id))] : allIdsSortedByMu;
      const currentRanks: Record<string, number> = {};
      sortedIds.forEach((id, idx) => { currentRanks[id] = idx + 1; });

      // 4. Enrich serverList with SQE data + tier (S/A/B/C by rank percentile).
      // Tiers are the platform's quality mark — collision-free (unlike evocative names like
      // "Apex"/"Vanguard" that servers use themselves) and they fall out of the tenure-weighted
      // rank, so elite tiers are only reachable by established servers.
      const totalRanked = sortedIds.length;
      const tierForRank = (rank: number): 'S' | 'A' | 'B' | 'C' | null => {
          const sCut = Math.max(3, Math.floor(totalRanked * 0.02));
          const aCut = Math.max(10, Math.floor(totalRanked * 0.08));
          const bCut = Math.max(30, Math.floor(totalRanked * 0.25));
          const cCut = Math.max(80, Math.floor(totalRanked * 0.60));
          if (rank <= sCut) return 'S';
          if (rank <= aCut) return 'A';
          if (rank <= bCut) return 'B';
          if (rank <= cCut) return 'C';
          return null;
      };
      for (const s of serverList) {
          s.sqePoints = Math.floor(displayedScores[s.id] || 0);
          s.sqeRank = currentRanks[s.id] || (totalRanked + 1);
          s.sqeTier = tierForRank(s.sqeRank);
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
              rank: s.sqeRank,
              tier: s.sqeTier
          }));

      await kv.put(leaderboardKey, JSON.stringify(leaderboard));

      // Compact SQE index for API enrichment (servers chunks can be large; this is ~300KB)
      const sqeIndex: Record<string, { r: number; p: number; t?: string | null }> = {};
      for (const s of serverList) {
        if (s.sqeRank != null) {
          sqeIndex[s.id] = { r: s.sqeRank, p: s.sqePoints ?? 0, t: s.sqeTier };
        }
      }
      await kv.put(`cache:server_sqe:${game}`, JSON.stringify(sqeIndex));

      console.log(`[SERVER_SCORING] Leaderboard updated, ${serverList.length} servers enriched with SQE data.`);

      return currentRanks;

  } catch (err) {
      console.error(`[SERVER_SCORING] Error:`, err);
      return {};
  }
}
