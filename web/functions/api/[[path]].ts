/**
 * @file [[path]].ts
 * @description API Gateway for Arma Mods Leaderboard.
 * Built with Hono and deployed as Cloudflare Pages Functions.
 *
 * PERFORMANCE STRATEGY:
 * 1. Global Edge Caching: Leverages Cloudflare Cache API for sub-1ms response times.
 * 2. CPU Efficiency: Utilizes string-based scanning within large JSON blobs to
 *    minimize V8 parsing overhead.
 * 3. Sharded Data Retrieval: Orchestrates multi-key KV reads for datasets
 *    exceeding 25MB.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';
import {
  auditHighlights,
  buildModAuditRow,
  parseServerConfig,
  REFORGER_PATCH_17,
  sortAuditRowsWorstFirst,
  type AuditStatus,
  type HistoryPoint,
} from './audit-config';
import { resolveHistoryQuery, type GameType as HistoryGameType } from './history-query';
import {
  defaultOgImage,
  lookupModsByIds,
  type ShareGame,
} from '../lib/share-meta';
import { authorCacheKey, ogImageCacheKey, statusCacheKey, resolveModDependencies, resolveModAuthor, resolveModWorkshopCopy, resolveModGallery, resolveModThumbnailUrl, resolveModWorkshopDates, resolveModWorkshopStatus, resolveModSizeBytes, resolveModSizesBatch } from '../lib/workshop-fetch';
import { findServerById, ServerLookup } from '../lib/server-lookup';
import { findReverseDependentsOnServer } from '../lib/reverse-deps';
import { analyzeStoragePlan } from '../lib/storage-calc';
import { buildServerStoragePack } from '../lib/storage-service';
import { matchesModSearch, matchesModSearchByNameOrId, matchesServerSearch } from '../lib/search-match';
import { buildScenarioRanking, scenarioKey } from '../lib/scenario-ranking';
import { parseServerHistoryFields } from '../lib/server-uptime-history';
import { extractModFromChunks } from '../lib/mod-lookup';

type Bindings = {
  TRENDING_KV: KVNamespace;
};

type GameType = 'reforger' | 'arma3';

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Setup Middleware
app.use('*', cors());
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`[REQUEST] ${c.req.method} ${c.req.url} started`);
  await next();
  const ms = Date.now() - start;
  console.log(`[RESPONSE] ${c.req.method} ${c.req.url} finished in ${ms}ms - Status: ${c.res.status}`);
});

// Global Error Handler
app.onError((err, c) => {
    console.error(`[CRITICAL ERROR]`, err);
    return c.json({ 
        error: 'Internal Worker error', 
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString()
    }, 503);
});

// Helper logic
function getGameFromQuery(c: any): GameType {
  const game = c.req.query('game');
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
    HISTORY_HOURLY: `history:hourly:${game}`,
    HISTORY_DAILY: `history:daily:${game}`,
    SERVER_SQE: `cache:server_sqe:${game}`,
    SERVER_RANKING: `cache:ranking:servers:${game}`,
    SCENARIO_RANKING: `cache:ranking:scenarios:${game}`,
  };
}

type SqeIndexEntry = { r: number; p: number };
type SqeIndex = Record<string, SqeIndexEntry>;

async function loadSqeIndex(kv: KVNamespace, game: GameType): Promise<SqeIndex | null> {
  const keys = getKVKeys(game);
  const index = await kv.get(keys.SERVER_SQE, 'json') as SqeIndex | null;
  if (index && Object.keys(index).length > 0) return index;

  // Fallback: top-200 leaderboard until full index is written
  const ranking = await kv.get(keys.SERVER_RANKING, 'json') as Array<{ id?: string; rank?: number; points?: number }> | null;
  if (!ranking?.length) return null;

  const fallback: SqeIndex = {};
  for (const item of ranking) {
    if (item?.id && item.rank != null) {
      fallback[item.id] = { r: item.rank, p: item.points ?? 0 };
    }
  }
  return Object.keys(fallback).length > 0 ? fallback : null;
}

function enrichServersWithSqe(servers: any[], sqeIndex: SqeIndex | null): any[] {
  if (!sqeIndex) return servers;
  return servers.map((server) => {
    if (server.sqeRank != null) return server;
    const sqe = sqeIndex[server.id];
    if (!sqe) return server;
    return { ...server, sqeRank: sqe.r, sqePoints: sqe.p };
  });
}

function enrichServerWithSqe(server: any, sqeIndex: SqeIndex | null): any {
  if (!server || server.sqeRank != null || !sqeIndex) return server;
  const sqe = sqeIndex[server.id];
  if (!sqe) return server;
  return { ...server, sqeRank: sqe.r, sqePoints: sqe.p };
}

/**
 * getChunkedData
 * @description Efficiently reconstructs sharded JSON datasets from Cloudflare KV.
 * Implements performance monitoring for slow I/O operations.
 */
async function getChunkedData(kv: KVNamespace, baseKey: string, maxChunks?: number): Promise<any[]> {
  const start = Date.now();
  try {
    const meta = await kv.get(`${baseKey}:meta`, 'json') as any;
    if (!meta || !meta.chunks) {
        console.log(`[KV] No meta or chunks for ${baseKey}`);
        return [];
    }

    const chunksToFetch = maxChunks ? Math.min(maxChunks, meta.chunks) : meta.chunks;
    console.log(`[KV] Fetching ${chunksToFetch} of ${meta.chunks} chunks for ${baseKey}`);
    const chunkArrays = await Promise.all(
      Array.from({ length: chunksToFetch }, (_, i) =>
        kv.get(`${baseKey}:${i}`, 'json').then((chunk) =>
          chunk && Array.isArray(chunk) ? (chunk as any[]) : []
        )
      )
    );
    const chunks: any[] = [];
    for (const chunk of chunkArrays) {
      for (const item of chunk) {
        chunks.push(item);
      }
    }
    const totalTime = Date.now() - start;
    console.log(`[KV] Finished ${baseKey} total fetch in ${totalTime}ms`);
    return chunks;
  } catch (err) {
    console.error(`[KV ERROR] Error reading chunks for ${baseKey}:`, err);
    return [];
  }
}



// ---------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------

app.get('/stats', async (c) => {
  const cache = await caches.open('armamods:stats');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const stats = await c.env.TRENDING_KV.get(keys.STATS, 'json');
  const data = stats || { totalMods: 0, totalPlayers: 0, totalServers: 0, game };
  
  const response = c.json(data);
  response.headers.set('Cache-Control', 'public, max-age=600'); // 10 minutes cache
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

function matchesPlayerActivityFilter(totalPlayers: number, filter: string): boolean {
  if (filter === 'high') return totalPlayers >= 500;
  if (filter === 'medium') return totalPlayers >= 100 && totalPlayers < 500;
  if (filter === 'low') return totalPlayers < 100;
  return true;
}

/** Read cached workshop authors only — no live scrape during list sort. */
async function attachCachedAuthors(
  kv: KVNamespace,
  game: ShareGame,
  mods: Array<{ id: string; author?: string | null }>
): Promise<void> {
  if (game === 'arma3') return;

  const batchSize = 100;
  for (let i = 0; i < mods.length; i += batchSize) {
    const slice = mods.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (mod) => {
        if (mod.author) return;
        const cached = await kv.get(authorCacheKey(game, mod.id), 'text');
        if (cached) mod.author = cached;
      })
    );
  }
}

type ListModRow = {
  id: string;
  author?: string | null;
  thumbnail?: string | null;
  workshopStatus?: string;
  workshopStatusCheckedAt?: string | null;
};

/** Embed cached workshop fields for one leaderboard page — avoids N per-row API calls. */
async function attachCachedListFields(
  kv: KVNamespace,
  game: ShareGame,
  mods: ListModRow[]
): Promise<void> {
  if (game === 'arma3' || mods.length === 0) return;

  await Promise.all(
    mods.map(async (mod) => {
      const needsAuthor = mod.author === undefined;
      const needsThumb = mod.thumbnail === undefined;
      const needsStatus = mod.workshopStatus === undefined;

      const [author, thumb, statusRaw] = await Promise.all([
        needsAuthor ? kv.get(authorCacheKey(game, mod.id), 'text') : null,
        needsThumb ? kv.get(ogImageCacheKey(game, mod.id), 'text') : null,
        needsStatus ? kv.get(statusCacheKey(game, mod.id), 'text') : null,
      ]);

      if (needsAuthor) mod.author = author ?? null;
      if (needsThumb) mod.thumbnail = thumb ?? null;

      if (needsStatus) {
        if (statusRaw) {
          try {
            const parsed = JSON.parse(statusRaw) as {
              status?: string;
              checkedAt?: string | null;
            };
            if (parsed.status === 'available' || parsed.status === 'unavailable') {
              mod.workshopStatus = parsed.status;
              mod.workshopStatusCheckedAt = parsed.checkedAt ?? null;
            } else {
              mod.workshopStatus = 'unknown';
            }
          } catch {
            mod.workshopStatus = 'unknown';
          }
        } else {
          mod.workshopStatus = 'unknown';
        }
      }
    })
  );
}

function compareAuthors(a: string, b: string, dir: number): number {
  const aa = (a || '').toLowerCase();
  const ab = (b || '').toLowerCase();
  if (!aa && !ab) return 0;
  if (!aa) return 1;
  if (!ab) return -1;
  return dir * aa.localeCompare(ab);
}

app.get('/mods', async (c) => {
  const cache = await caches.open('armamods:mods');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';
  const sortBy = c.req.query('sortBy') || 'overall';
  const sortDir = c.req.query('sortDir') === 'desc' ? 'desc' : 'asc';
  const playerFilter = c.req.query('playerFilter') || 'all';

  // Default view: rank asc, no search/filter — only first chunk (pre-sorted by rank).
  const isDefaultView =
    !search &&
    playerFilter === 'all' &&
    (sortBy === 'overall' || !sortBy) &&
    sortDir === 'asc';
  const mods = await getChunkedData(c.env.TRENDING_KV, keys.MODS, isDefaultView ? 1 : undefined);
  let filtered = [...mods];

  // Author lives in workshop KV cache — only load when name/id search finds nothing.
  if (search) {
    const byNameOrId = filtered.filter((m) => matchesModSearchByNameOrId(m, search));
    if (byNameOrId.length > 0) {
      filtered = byNameOrId;
    } else if (game !== 'arma3') {
      // Fast path: author already on leaderboard rows (collector embeds after warm).
      const withEmbeddedAuthor = filtered.filter((m) => m.author && matchesModSearch(m, search));
      if (withEmbeddedAuthor.length > 0) {
        filtered = withEmbeddedAuthor;
      } else {
        await attachCachedAuthors(c.env.TRENDING_KV, game as ShareGame, filtered);
        filtered = filtered.filter((m) => matchesModSearch(m, search));
      }
    } else {
      filtered = [];
    }
  }

  if (playerFilter !== 'all') {
    filtered = filtered.filter((m) =>
      matchesPlayerActivityFilter(m.totalPlayers || 0, playerFilter)
    );
  }

  const dir = sortDir === 'asc' ? 1 : -1;
  const byNum = (a: number, b: number) => dir * (a - b);
  const byStr = (a: string, b: string) => dir * (a || '').localeCompare(b || '');

  if (sortBy === 'author') {
    await attachCachedAuthors(c.env.TRENDING_KV, game as ShareGame, filtered);
    filtered.sort((a, b) => compareAuthors(a.author || '', b.author || '', dir));
  } else if (sortBy === 'players') filtered.sort((a, b) => byNum(a.totalPlayers || 0, b.totalPlayers || 0));
  else if (sortBy === 'servers') filtered.sort((a, b) => byNum(a.serverCount || 0, b.serverCount || 0));
  else if (sortBy === 'share') filtered.sort((a, b) => byNum(a.marketShare || 0, b.marketShare || 0));
  else if (sortBy === 'size') filtered.sort((a, b) => byNum(a.sizeBytes || 0, b.sizeBytes || 0));
  else if (sortBy === 'name') filtered.sort((a, b) => byStr(a.name || '', b.name || ''));
  else filtered.sort((a, b) => byNum(a.overallRank || 9999, b.overallRank || 9999));

  const page = filtered.slice(offset, offset + limit);
  if (game !== 'arma3') {
    await attachCachedListFields(c.env.TRENDING_KV, game as ShareGame, page);
  }

  const response = c.json({ 
    data: page, 
    meta: { total: filtered.length, limit, offset } 
  });

  // Increased cache time to save Worker calls
  response.headers.set('Cache-Control', 'public, max-age=900'); // 15 minutes cache
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId', async (c) => {
  const cache = await caches.open('armamods:details');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) {
      console.log(`[CACHE HIT] Detail data for ${c.req.url}`);
      return cacheResponse;
  }

  const start = Date.now();
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const keys = getKVKeys(game);

  console.log(`[MODS_DETAIL] Starting optimized fetch for ${modId}...`);
  let mod = null;
  let totalModsCount = 0;
  let modChunksText: (string | null)[] = [];

  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.MODS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        totalModsCount = meta.total;
        
        const chunkPromises = [];
        for (let i = 0; i < meta.chunks; i++) {
            chunkPromises.push(c.env.TRENDING_KV.get(`${keys.MODS}:${i}`, 'text'));
        }
        modChunksText = await Promise.all(chunkPromises);
        mod = extractModFromChunks(modChunksText, modId);
    }
  } catch (err) {
      console.error('[MODS_DETAIL] KV mod lookup error:', err);
  }

  if (!mod) return c.json({ error: 'Not found' }, 404);

  if (game === 'reforger') {
    const [author, workshopDates, sizeBytes, workshopStatus, workshopCopy] = await Promise.all([
      resolveModAuthor(c.env.TRENDING_KV, game, modId),
      resolveModWorkshopDates(c.env.TRENDING_KV, game, modId),
      mod.sizeBytes && mod.sizeBytes > 0
        ? Promise.resolve(mod.sizeBytes as number)
        : resolveModSizeBytes(c.env.TRENDING_KV, game, modId),
      resolveModWorkshopStatus(c.env.TRENDING_KV, game, modId),
      resolveModWorkshopCopy(c.env.TRENDING_KV, game, modId),
    ]);
    if (author) mod = { ...mod, author };
    if (workshopCopy.summary) mod = { ...mod, workshopSummary: workshopCopy.summary };
    if (workshopCopy.description) mod = { ...mod, workshopDescription: workshopCopy.description };
    if (workshopDates.created || workshopDates.modified) {
      mod = {
        ...mod,
        workshopCreated: workshopDates.created,
        workshopModified: workshopDates.modified,
      };
    }
    mod = {
      ...mod,
      sizeBytes: sizeBytes ?? mod.sizeBytes ?? null,
      workshopStatus: workshopStatus.status,
      workshopStatusCheckedAt: workshopStatus.checkedAt,
    };
  }

  if (Array.isArray(mod.coDeployed) && mod.coDeployed.length > 0 && modChunksText.length > 0) {
    mod.coDeployed = mod.coDeployed.map((co: { id: string; name: string; count: number }) => {
      const full = extractModFromChunks(modChunksText, co.id);
      if (!full) return co;
      return {
        ...co,
        totalPlayers: full.totalPlayers,
        serverCount: full.serverCount,
        overallRank: full.overallRank,
        marketShare: full.marketShare,
      };
    });
  }

  /**
   * ULTRA-OPTIMIZED SERVER LOOKUP:
   * Instead of parsing 20MB+ of JSON, we first scan the raw string for the modId.
   * This drastically reduces CPU time and prevents 503 Gateway Timeouts on 
   * the free/bundled Worker plans.
   */
  const modServers: any[] = [];
  const MAX_SERVERS_PER_MOD = 100; // Limit to 100 servers to save CPU
  
  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        console.log(`[MODS_DETAIL] Scanning server chunks for mod inclusion (max ${MAX_SERVERS_PER_MOD} results)...`);
        
        // Parallel retrieval of server chunks
        const chunkPromises = [];
        for (let i = 0; i < meta.chunks; i++) {
            chunkPromises.push(c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text'));
        }
        const chunksText = await Promise.all(chunkPromises);
        
        for (let i = 0; i < chunksText.length; i++) {
            if (modServers.length >= MAX_SERVERS_PER_MOD) break;
            
            const chunkText = chunksText[i];
            if (chunkText && chunkText.includes(`"${modId}"`)) {
                // Instead of parsing the entire 2MB JSON, split it into individual servers
                // and parse only those containing the target modId.
                const serverStrings = splitJsonArray(chunkText);
                for (const serverStr of serverStrings) {
                    if (serverStr.includes(`"${modId}"`)) {
                        try {
                            const s = JSON.parse(serverStr);
                            if (s.mods && s.mods.some((m: any) => String(m.id).toUpperCase() === modId.toUpperCase())) {
                                modServers.push(s);
                                if (modServers.length >= MAX_SERVERS_PER_MOD) break;
                            }
                        } catch (e) {
                            /* ignore parse errors for individual servers */
                        }
                    }
                }
            }
        }
    }
  } catch (err) {
      console.error('[MODS_DETAIL] Server chunk error:', err);
  }

  const finished = Date.now() - start;
  console.log(`[MODS_DETAIL] Response ready for ${modId} in ${finished}ms`);
  const finalResponse = c.json({ data: { ...mod, stats: { ...mod, totalMods: totalModsCount }, servers: modServers } });
  
  // Cache the response for 5 minutes
  finalResponse.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  
  return finalResponse;
});


// Find matching closing brace for a JSON object with nested structures
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

// Splits a JSON array of objects into individual object strings without parsing it.
// Extremely fast and low CPU memory overhead compared to JSON.parse on the entire chunk.
function splitJsonArray(jsonText: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let startPos = -1;
  let inStr = false;
  
  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    if (ch === '\\' && inStr) { i++; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    
    if (ch === '{') {
      if (depth === 0) {
        startPos = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && startPos !== -1) {
        results.push(jsonText.slice(startPos, i + 1));
        startPos = -1;
      }
    }
  }
  return results;
}

// Helper to scan history text for a specific modId (Used in shards)
function scanHistoryPoints(historyText: string, modId: string): any[] {
  const modHistory = [];
  const searchStr = '"time":"';
  let pos = historyText.indexOf(searchStr);

  while (pos !== -1) {
    const timeStart = pos + searchStr.length;
    const timeEnd = historyText.indexOf('"', timeStart);
    if (timeEnd === -1) break;
    const time = historyText.slice(timeStart, timeEnd);
    
    // Find where the "mods" object starts for this time point
    const modsKeyStr = '"mods":{';
    const modsStartPos = historyText.indexOf(modsKeyStr, timeEnd);
    if (modsStartPos === -1) break;

    // Find where the NEXT time point starts to know where this block ends
    let nextTimePos = historyText.indexOf(searchStr, modsStartPos);
    if (nextTimePos === -1) nextTimePos = historyText.length;

    const pointBlock = historyText.slice(modsStartPos, nextTimePos);
    const modStrPos = pointBlock.indexOf(`"${modId}":{`);
    
    if (modStrPos !== -1) {
      const startStats = pointBlock.indexOf('{', modStrPos);
      const endStats = pointBlock.indexOf('}', startStats);
      if (startStats !== -1 && endStats !== -1) {
          try {
            const statsStr = pointBlock.slice(startStats, endStats + 1);
            const stats = JSON.parse(statsStr);
            modHistory.push({ 
                date: time, 
                totalPlayers: stats.p || 0, 
                serverCount: stats.s || 0, 
                overallRank: stats.r || 9999 
            });
          } catch { /* ignore parse errors */ }
      }
    } else {
        modHistory.push({ date: time, totalPlayers: 0, serverCount: 0, overallRank: 9999 });
    }
    
    pos = historyText.indexOf(searchStr, nextTimePos - 1);
    if (pos === -1) break;
    if (pos <= modsStartPos) pos = historyText.indexOf(searchStr, nextTimePos + 1);
  }
  return modHistory;
}

/** Scan multiple modIds in a single pass of a shard (less CPU than 91x scanHistoryPoints) */
function scanMultipleModsHistory(historyText: string, modIds: Set<string>): Map<string, any[]> {
  const modHistory = new Map<string, any[]>();
  for (const id of modIds) modHistory.set(id, []);

  const searchStr = '"time":"';
  let pos = historyText.indexOf(searchStr);

  while (pos !== -1) {
    const timeStart = pos + searchStr.length;
    const timeEnd = historyText.indexOf('"', timeStart);
    if (timeEnd === -1) break;
    const time = historyText.slice(timeStart, timeEnd);

    const modsKeyStr = '"mods":{';
    const modsStartPos = historyText.indexOf(modsKeyStr, timeEnd);
    if (modsStartPos === -1) break;

    let nextTimePos = historyText.indexOf(searchStr, modsStartPos);
    if (nextTimePos === -1) nextTimePos = historyText.length;

    const pointBlock = historyText.slice(modsStartPos, nextTimePos);

    for (const modId of modIds) {
      const list = modHistory.get(modId)!;
      const modStrPos = pointBlock.indexOf(`"${modId}":{`);
      if (modStrPos !== -1) {
        const startStats = pointBlock.indexOf('{', modStrPos);
        const endStats = pointBlock.indexOf('}', startStats);
        if (startStats !== -1 && endStats !== -1) {
          try {
            const stats = JSON.parse(pointBlock.slice(startStats, endStats + 1));
            list.push({
              date: time,
              totalPlayers: stats.p || 0,
              serverCount: stats.s || 0,
              overallRank: stats.r || 9999,
            });
          } catch {
            list.push({ date: time, totalPlayers: 0, serverCount: 0, overallRank: 9999 });
          }
        }
      } else {
        list.push({ date: time, totalPlayers: 0, serverCount: 0, overallRank: 9999 });
      }
    }

    pos = historyText.indexOf(searchStr, nextTimePos - 1);
    if (pos === -1) break;
    if (pos <= modsStartPos) pos = historyText.indexOf(searchStr, nextTimePos + 1);
  }
  return modHistory;
}

// Helper to fill gaps (zeros) in history data with average values
/**
 * smoothHistoryData
 * @description Data integrity helper. Implements linear interpolation to fill 
 * temporal gaps in the history dataset (e.g., during collector downtime).
 */
function smoothHistoryData(data: any[]) {
  if (data.length < 3) return data;
  
  const smoothed = [...data];
  for (let i = 0; i < smoothed.length; i++) {
    // If we have a zero point but it's likely a missing data gap
    if (smoothed[i].totalPlayers === 0 || smoothed[i].serverCount === 0) {
      // Find previous non-zero point
      let prev = null;
      for (let j = i - 1; j >= 0; j--) {
        if (smoothed[j].totalPlayers > 0) {
          prev = { valP: smoothed[j].totalPlayers, valS: smoothed[j].serverCount, idx: j };
          break;
        }
      }
      
      // Find next non-zero point
      let next = null;
      for (let j = i + 1; j < smoothed.length; j++) {
        if (smoothed[j].totalPlayers > 0) {
          next = { valP: smoothed[j].totalPlayers, valS: smoothed[j].serverCount, idx: j };
          break;
        }
      }
      
      if (prev && next) {
        // Linear interpolation only when we have a gap between two valid points
        const step = (i - prev.idx) / (next.idx - prev.idx);
        smoothed[i].totalPlayers = Math.round(prev.valP + (next.valP - prev.valP) * step);
        smoothed[i].serverCount = Math.round(prev.valS + (next.valS - prev.valS) * step);
        
        // Also smooth rank if missing (using linear logic)
        if (smoothed[i].overallRank >= 9999) {
          const prevRank = smoothed[prev.idx].overallRank || 9999;
          const nextRank = smoothed[next.idx].overallRank || 9999;
          smoothed[i].overallRank = Math.round(prevRank + (nextRank - prevRank) * step);
        }
        smoothed[i].isInterpolated = true;
      }
      // If no prev exists, it's a leading zero - LEAVE IT AS ZERO
      // If no next exists, it's a trailing zero - LEAVE IT AS ZERO
    }
  }
  return smoothed;
}

async function fetchModHistoryPoints(
  kv: KVNamespace,
  modId: string,
  baseKey: string
): Promise<any[]> {
  const modHistory: any[] = [];
  const meta = (await kv.get(`${baseKey}:meta`, 'json')) as { chunks?: number } | null;

  if (meta?.chunks) {
    const shardPromises = [];
    for (let i = 0; i < meta.chunks; i++) {
      shardPromises.push(kv.get(`${baseKey}:${i}`, 'text'));
    }
    const shardsText = await Promise.all(shardPromises);

    for (const shardText of shardsText) {
      if (shardText?.includes(`"${modId}":{`)) {
        modHistory.push(...scanHistoryPoints(shardText, modId));
      }
    }
  } else {
    const historyText = await kv.get(baseKey, 'text');
    if (historyText) modHistory.push(...scanHistoryPoints(historyText, modId));
  }

  return modHistory;
}

app.get('/mods/:modId/workshop-status', async (c) => {
  const cache = await caches.open('armamods:mod_workshop_status');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');

  if (game === 'arma3') {
    const response = c.json({
      data: { status: 'unknown', checkedAt: null },
      meta: { modId, game, supported: false },
    });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  }

  const workshopStatus = await resolveModWorkshopStatus(c.env.TRENDING_KV, game, modId);
  const response = c.json({
    data: { status: workshopStatus.status, checkedAt: workshopStatus.checkedAt },
    meta: { modId, game, supported: true },
  });
  const edgeMaxAge = workshopStatus.status === 'unavailable' ? 43200 : 86400;
  response.headers.set(
    'Cache-Control',
    `public, max-age=${edgeMaxAge}, stale-while-revalidate=604800`
  );
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId/author', async (c) => {
  const cache = await caches.open('armamods:mod_authors');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');

  if (game === 'arma3') {
    const response = c.json({
      data: { author: null },
      meta: { modId, game, supported: false },
    });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  }

  const author = await resolveModAuthor(c.env.TRENDING_KV, game, modId);
  const response = c.json({
    data: { author },
    meta: { modId, game },
  });
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId/thumbnail/img', async (c) => {
  const cache = await caches.open('armamods:mod_thumb_img');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');
  const width = Math.min(128, Math.max(32, parseInt(c.req.query('w') || '64', 10) || 64));
  const url = await resolveModThumbnailUrl(c.env.TRENDING_KV, game, modId);

  if (!url || url.includes('og-image')) {
    return c.redirect(defaultOgImage(), 302);
  }

  try {
    const imageResponse = await fetch(url, {
      cf: { image: { width, height: width, fit: 'cover', quality: 75 } },
    } as RequestInit);
    if (!imageResponse.ok) throw new Error('upstream');

    const response = new Response(imageResponse.body, {
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  } catch {
    return c.redirect(url, 302);
  }
});

app.get('/mods/:modId/thumbnail', async (c) => {
  const cache = await caches.open('armamods:mod_thumbnails');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');
  const url = await resolveModThumbnailUrl(c.env.TRENDING_KV, game, modId);

  const response = c.json({
    data: { url },
    meta: { modId, game, direct: true },
  });
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId/gallery', async (c) => {
  const cache = await caches.open('armamods:mod_gallery');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');

  if (game === 'arma3') {
    const response = c.json({
      data: [],
      meta: { source: 'steam_workshop', supported: false, modId, count: 0 },
    });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  }

  const images = await resolveModGallery(c.env.TRENDING_KV, game, modId);
  const response = c.json({
    data: images,
    meta: {
      source: 'reforger_workshop',
      supported: true,
      modId,
      count: images.length,
    },
  });
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId/dependencies', async (c) => {
  const cache = await caches.open('armamods:mod_deps');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');

  if (game === 'arma3') {
    const response = c.json({
      data: [],
      meta: { source: 'steam_workshop', supported: false, message: 'Dependency scrape not yet supported for Arma 3' },
    });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  }

  const dependencies = await resolveModDependencies(c.env.TRENDING_KV, game, modId);
  const response = c.json({
    data: dependencies,
    meta: {
      source: 'reforger_workshop',
      supported: true,
      modId,
      count: dependencies.length,
    },
  });
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get('/mods/:modId/size', async (c) => {
  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');

  if (game === 'arma3') {
    return c.json({
      data: { sizeBytes: null },
      meta: { supported: false, source: 'steam_workshop' },
    });
  }

  const sizeBytes = await resolveModSizeBytes(c.env.TRENDING_KV, game, modId);
  const response = c.json({
    data: { sizeBytes },
    meta: { supported: true, source: 'reforger_workshop', modId },
  });
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  return response;
});

app.get('/mods/:modId/history', async (c) => {
  const cache = await caches.open('armamods:history');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const start = Date.now();
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const daysString = c.req.query('days') || '30';
  const requestingAll = daysString === 'all';
  const days = requestingAll ? 9999 : parseInt(daysString);
  const plan = resolveHistoryQuery(days, game as HistoryGameType);

  console.log(`[HISTORY] Fetching ${plan.baseKey} shards for ${modId}...`);

  let modHistory = await fetchModHistoryPoints(c.env.TRENDING_KV, modId, plan.baseKey);
  let finalHistory = smoothHistoryData(modHistory.slice(plan.sliceCount));

  if (plan.fallbackKey && finalHistory.length < 4) {
    console.log(
      `[HISTORY] Weekly sparse (${finalHistory.length} pts), fallback ${plan.fallbackKey}`
    );
    modHistory = await fetchModHistoryPoints(c.env.TRENDING_KV, modId, plan.fallbackKey);
    finalHistory = smoothHistoryData(modHistory.slice(plan.fallbackSlice ?? -12));
  }
  const finished = Date.now() - start;
  console.log(`[HISTORY] Prepared ${finalHistory.length} nodes in ${finished}ms`);
  
  const finalResponse = c.json({ data: finalHistory });
  
  // Cache the response for 5 minutes
  finalResponse.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  
  return finalResponse;
});

app.get('/servers', async (c) => {
  const cache = await caches.open('armamods:servers');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) {
      console.log(`[CACHE HIT] Servers data for ${c.req.url}`);
      return cacheResponse;
  }

  const start = Date.now();
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const full = c.req.query('full') === '1';
  const search = c.req.query('search') || '';
  const requestedLimit = parseInt(c.req.query('limit') || '100', 10);
  const limit = full || search
    ? Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 5000)
    : Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 500);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  console.log(`[SERVERS] Fetching data for ${game}...`);
  const servers = await getChunkedData(
    c.env.TRENDING_KV,
    keys.SERVERS,
    full || search ? undefined : 1
  );
  
  if (!servers || servers.length === 0) {
    console.log(`[SERVERS] No data found in KV for ${game}`);
    return c.json({ data: [], meta: { total: 0, limit, offset } });
  }

  let filtered = enrichServersWithSqe([...servers], await loadSqeIndex(c.env.TRENDING_KV, game));

  if (search) {
    filtered = filtered.filter((s) => matchesServerSearch(s, search));
  }

  try {
    filtered.sort((a, b) => {
      const rankA = a.sqeRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.sqeRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return (b.players || 0) - (a.players || 0);
    });
  } catch (sortErr) {
    console.error(`[SERVERS] Sort error:`, sortErr);
  }

  const result = filtered.slice(offset, offset + limit);
  const response = c.json({ 
    data: result, 
    meta: { total: filtered.length, limit, offset } 
  });

  // Cache for 5 minutes to ensure fresh SQE data after collector runs
  response.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));

  const finished = Date.now() - start;
  console.log(`[SERVERS] Prepared in ${finished}ms`);
  
  return response;
});

// Scenario leaderboard — persisted by collector; live fallback until next run
app.get('/scenarios', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const cache = await caches.open('armamods:scenarios');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  let source: 'kv' | 'live' = 'kv';
  let ranking = await c.env.TRENDING_KV.get(keys.SCENARIO_RANKING, 'json') as any[] | null;

  if (!ranking?.length) {
    source = 'live';
    const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS);
    if (!servers?.length) {
      return c.json({ data: [], meta: { total: 0, source: 'empty' } });
    }
    ranking = buildScenarioRanking(servers);
  }

  const response = c.json({
    data: ranking,
    meta: { total: ranking.length, source },
  });
  response.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

// Servers running a specific scenario (on-demand drill-down)
app.get('/scenarios/servers', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const scenarioName = c.req.query('name')?.trim();
  if (!scenarioName) {
    return c.json({ error: 'Missing name query parameter' }, 400);
  }

  const cache = await caches.open('armamods:scenario-servers');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS);
  const sqeIndex = await loadSqeIndex(c.env.TRENDING_KV, game);
  const enriched = enrichServersWithSqe(servers ?? [], sqeIndex);
  const matched = enriched
    .filter((s) => scenarioKey(s.scenarioName) === scenarioName)
    .sort((a, b) => {
      const rankA = a.sqeRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.sqeRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return (b.players || 0) - (a.players || 0);
    });

  const response = c.json({
    data: matched,
    meta: { total: matched.length, scenario: scenarioName },
  });
  response.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

// Get Top Ranked Servers (Leaderboard) — must be registered before /servers/:serverId
app.get('/servers/ranking', async (c) => {
  const game = c.req.query('game') || 'reforger';
  const cache = await caches.open('armamods:ranking:servers');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const ranking = await c.env.TRENDING_KV.get(`cache:ranking:servers:${game}`, 'json');
  if (!ranking) return c.json({ data: [] });

  const response = c.json({ data: ranking });
  response.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

// Reverse workshop dependency lookup — must be before /servers/:serverId
app.get('/servers/:serverId/reverse-deps/:targetModId', async (c) => {
  const serverId = c.req.param('serverId');
  const targetModId = c.req.param('targetModId');
  const game = getGameFromQuery(c) as ShareGame;

  if (game === 'arma3') {
    return c.json({
      error: 'Workshop dependency lookup is Reforger-only',
    }, 501);
  }

  const server = await findServerById(c.env.TRENDING_KV, game, serverId);
  if (!server) return c.json({ error: 'Server not found' }, 404);

  const mods = Array.isArray(server.mods)
    ? (server.mods as Array<{ id: string; name: string }>)
    : [];

  try {
    const analysis = await findReverseDependentsOnServer(
      c.env.TRENDING_KV,
      game,
      mods,
      targetModId
    );

    const response = c.json({
      data: analysis,
      meta: {
        serverId,
        serverName: server.name,
        disclaimer:
          'Workshop-declared dependencies only — not co-deploy stats. Uncached mods may appear after first workshop scrape.',
      },
    });
    response.headers.set('Cache-Control', 'public, max-age=900');
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    if (message.includes('not on server')) {
      return c.json({ error: 'Target mod is not installed on this server' }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

// Server modpack storage breakdown — must be before /servers/:serverId
app.get('/servers/:serverId/storage', async (c) => {
  const serverId = c.req.param('serverId');
  const game = getGameFromQuery(c) as ShareGame;

  if (game === 'arma3') {
    return c.json({
      error: 'Storage planner not yet supported for Arma 3',
    }, 501);
  }

  const server = await findServerById(c.env.TRENDING_KV, game, serverId);
  if (!server) return c.json({ error: 'Server not found' }, 404);

  const pack = await buildServerStoragePack(c.env.TRENDING_KV, game, {
    id: String(server.id),
    name: String(server.name ?? 'Server'),
    mods: Array.isArray(server.mods) ? server.mods as Array<{ id: string; name: string }> : [],
  });

  const response = c.json({
    data: pack,
    meta: {
      disclaimer:
        'Sizes from Reforger Workshop (version download). Partial coverage when sizes are not cached yet — refresh to load more.',
    },
  });
  response.headers.set('Cache-Control', 'public, max-age=300');
  return response;
});

// Get Single Server Details
app.get('/servers/:serverId', async (c) => {
  const cache = await caches.open('armamods:server_details');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const serverId = c.req.param('serverId');
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);

  console.log(`[SERVERS_DETAIL] Starting optimized fetch for ${serverId}...`);
  let server = null;

  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        // Parallel retrieval of server chunks
        const chunkPromises = [];
        for (let i = 0; i < meta.chunks; i++) {
            chunkPromises.push(c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text'));
        }
        const chunksText = await Promise.all(chunkPromises);
        
        for (let i = 0; i < chunksText.length; i++) {
            const chunkText = chunksText[i];
            if (chunkText && chunkText.includes(`"id":"${serverId}"`)) {
                // Surgical extraction: find object boundaries
                const searchStr = `"id":"${serverId}"`;
                const idPos = chunkText.indexOf(searchStr);
                const startPos = chunkText.lastIndexOf('{', idPos);
                const endPos = findMatchingBrace(chunkText, startPos);
                if (startPos !== -1 && endPos !== -1) {
                    try {
                        server = JSON.parse(chunkText.slice(startPos, endPos + 1));
                        if (server) break;
                    } catch (e) { /* fallback */ }
                }
            }
        }
    }
  } catch (err) {
      console.error('[SERVERS_DETAIL] KV server lookup error:', err);
  }

  if (!server) return c.json({ error: 'Server not found' }, 404);

  const sqeIndex = await loadSqeIndex(c.env.TRENDING_KV, game);
  server = enrichServerWithSqe(server, sqeIndex);

  const response = c.json({ data: server });
  
  // Cache for 5 minutes to ensure fresh SQE data
  response.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  
  return response;
});

/** OG image redirect – Discord follows to workshop thumbnail or site default */
app.get('/og/preview/mod/:modId', async (c) => {
  const game = getGameFromQuery(c) as ShareGame;
  const modId = c.req.param('modId');
  const image = await resolveModThumbnailUrl(c.env.TRENDING_KV, game, modId);
  return c.redirect(image, 302);
});

app.get('/og/preview/server/:serverId', async (c) => {
  return c.redirect(defaultOgImage(), 302);
});

/** XML-escape for embedding user-controlled strings (server names) in SVG. */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (ch) =>
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === "'" ? '&apos;' : '&quot;'
  );
}

const BADGE_TIER_COLORS: Record<string, string> = {
  S: '#ff6b00',
  A: '#ff8c3a',
  B: '#8a8a8a',
  C: '#5a5a5a',
};

/** Embeddable SVG server badge: tier chip + rank + name + site brand. */
function serverBadgeSvg(opts: { tier: string | null; rank: number | null; name: string }): string {
  const { tier, rank, name } = opts;
  const tierColor = tier ? BADGE_TIER_COLORS[tier] ?? '#5a5a5a' : '#3a3a3a';
  const tierLabel = tier ?? '—';
  const rankLabel = rank ? `RANK #${rank}` : 'UNRANKED';
  const safeName = escapeXml((name || 'Server').slice(0, 30));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="76" viewBox="0 0 320 76" font-family="monospace">
  <rect width="320" height="76" fill="#0a0a0a" stroke="${tierColor}" stroke-width="1.5"/>
  <rect x="0" y="0" width="64" height="76" fill="${tierColor}"/>
  <text x="32" y="49" font-size="32" font-weight="900" fill="#0a0a0a" text-anchor="middle">${tierLabel}</text>
  <text x="76" y="28" font-size="11" font-weight="900" fill="#ff6b00" letter-spacing="2">${rankLabel}</text>
  <text x="76" y="48" font-size="12" font-weight="700" fill="#e0e0e0">${safeName}</text>
  <text x="76" y="65" font-size="8" font-weight="700" fill="#777" letter-spacing="2">REFORGERMODS.COM</text>
</svg>`;
}

/**
 * GET /badge/server/:serverId — embeddable SVG badge (tier + rank + name) for owners to
 * display on their Discord/website. Reads the server object from chunks (tier is baked in
 * by the collector). Cached 10 min.
 */
app.get('/badge/server/:serverId', async (c) => {
  const cache = await caches.open('armamods:badge');
  const cached = await cache.match(c.req.raw);
  if (cached) return cached;

  const serverId = c.param('serverId');
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);

  let server: any = null;
  try {
    const meta = (await c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json')) as { chunks?: number } | null;
    if (meta?.chunks) {
      const chunksText = await Promise.all(
        Array.from({ length: meta.chunks }, (_, i) => c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text'))
      );
      const needle = `"id":"${serverId}"`;
      for (const chunkText of chunksText) {
        if (!chunkText || !chunkText.includes(needle)) continue;
        const idPos = chunkText.indexOf(needle);
        const startPos = chunkText.lastIndexOf('{', idPos);
        const endPos = findMatchingBrace(chunkText, startPos);
        if (startPos !== -1 && endPos !== -1) {
          try {
            server = JSON.parse(chunkText.slice(startPos, endPos + 1));
            break;
          } catch {
            /* skip malformed */
          }
        }
      }
    }
  } catch (err) {
    console.error('[BADGE] lookup error:', err);
  }

  if (!server) return c.text('Server not found', 404);

  const svg = serverBadgeSvg({
    tier: server.sqeTier ?? null,
    rank: server.sqeRank ?? null,
    name: server.name ?? '',
  });
  const response = new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

// Trending logic (Pre-calculated by collector)
app.get('/trending/:period?', async (c) => {
    const cache = await caches.open('armamods:trending');
    const cacheResponse = await cache.match(c.req.raw);
    if (cacheResponse) return cacheResponse;

    const game = getGameFromQuery(c);
    const keys = getKVKeys(game);
    
    // Support both path param and query param, and map 24h -> daily etc.
    let periodInput = c.req.param('period') || c.req.query('period') || 'daily';
    
    // Normalize naming to match collector
    let period = 'daily';
    if (periodInput === 'weekly' || periodInput === '7d') period = 'weekly';
    if (periodInput === 'monthly' || periodInput === '30d') period = 'monthly';
    if (periodInput === '24h') period = 'daily';

    console.log(`[TRENDING] Fetching ${period} trending for ${game}...`);
    const trendingData = await c.env.TRENDING_KV.get(`${keys.TRENDING}:${period}`, 'json') as any;
    
    if (!trendingData) {
        console.log(`[TRENDING] No data found for key ${keys.TRENDING}:${period}`);
        return c.json({ data: { rising: [], falling: [], new: [] }, meta: { lastUpdated: new Date().toISOString() } });
    }

    const response = c.json(trendingData);
    response.headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
});

// ──────────────────────────────────────────────
// COMPREHENSIVE HEALTH CHECK
// ──────────────────────────────────────────────
app.get('/health', async (c) => {
  const start = Date.now();
  const checks: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const game of ['reforger', 'arma3'] as const) {
    const keys = getKVKeys(game);
    const gameStart = Date.now();
    try {
      const [stats, modsMeta, serversMeta, lastUpdate] = await Promise.all([
        c.env.TRENDING_KV.get(keys.STATS, 'json').catch(() => null),
        c.env.TRENDING_KV.get(`${keys.MODS}:meta`, 'json').catch(() => null),
        c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json').catch(() => null),
        c.env.TRENDING_KV.get(keys.LAST_UPDATE, 'text').catch(() => null),
      ]);

      const now = Date.now();
      const lastUpdateTime = lastUpdate ? new Date(lastUpdate).getTime() : null;
      const staleHours = lastUpdateTime ? (now - lastUpdateTime) / 3600000 : null;

      checks[game] = {
        kv: stats || modsMeta ? 'ok' : 'missing',
        stats: stats ? true : false,
        mods: modsMeta ? { chunks: (modsMeta as { chunks?: number }).chunks ?? 0, total: (modsMeta as { total?: number }).total ?? 0 } : null,
        servers: serversMeta ? { chunks: (serversMeta as { chunks?: number }).chunks ?? 0, total: (serversMeta as { total?: number }).total ?? 0 } : null,
        lastUpdate,
        staleHours: staleHours !== null ? Math.round(staleHours * 10) / 10 : null,
        isStale: staleHours !== null && staleHours > 3,
        timingMs: Date.now() - gameStart,
      };
      if (!stats) errors.push(`${game}: stats missing`);
      if (!modsMeta) errors.push(`${game}: mods meta missing`);
      if (!serversMeta) errors.push(`${game}: servers meta missing`);
    } catch (e: unknown) {
      errors.push(`${game}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const duration = Date.now() - start;
  const errorCount = errors.length;

  return c.json({
    status: errorCount === 0 ? 'healthy' : 'degraded',
    healthy: errorCount === 0,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    errorCount,
    errors: errors.slice(0, 20),
    checks,
  });
});

// DEBUG & DIAGNOSTICS ENDPOINT: Full system health check
app.get('/diagnostics', async (c) => {
    const game = getGameFromQuery(c);
    const keys = getKVKeys(game);
    
    const [stats, lastUpdate, modsMeta, serversMeta, historyMeta] = await Promise.all([
        c.env.TRENDING_KV.get(keys.STATS, 'json'),
        c.env.TRENDING_KV.get(keys.LAST_UPDATE, 'text'),
        c.env.TRENDING_KV.get(`${keys.MODS}:meta`, 'json') as Promise<any>,
        c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json') as Promise<any>,
        c.env.TRENDING_KV.get(`${keys.HISTORY_DAILY}:meta`, 'json') as Promise<any>
    ]);

    // Check history integrity (get first and last point if sharded)
    const historyRange = { start: null, end: null, count: 0 };
    if (historyMeta && historyMeta.chunks) {
        const firstChunk = await c.env.TRENDING_KV.get(`${keys.HISTORY_DAILY}:0`, 'json') as any[];
        const lastChunk = await c.env.TRENDING_KV.get(`${keys.HISTORY_DAILY}:${historyMeta.chunks - 1}`, 'json') as any[];
        
        if (firstChunk && firstChunk.length > 0) historyRange.start = firstChunk[0].time;
        if (lastChunk && lastChunk.length > 0) historyRange.end = lastChunk[lastChunk.length - 1].time;
        historyRange.count = historyMeta.total;
    }

    return c.json({
        status: 'HEALTHY',
        game,
        timestamp: new Date().toISOString(),
        data: {
            lastUpdate,
            stats,
            kv: {
                mods: modsMeta,
                servers: serversMeta,
                history: historyMeta
            },
            historyRange
        },
        version: '1.14.1-diag'
    });
});


// --- SERVER RANKING ENDPOINTS ---

// Get Points History for a specific server — reads from shared history shards
app.get('/servers/:serverId/history', async (c) => {
  const serverId = c.req.param('serverId');
  const game = c.req.query('game') || 'reforger';
  const cache = await caches.open('armamods:server_history');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const serverHistory: any[] = [];
  const serversKey = '"servers":{';
  const timeKey = '"time":"';

  function extractServerHistory(block: string, id: string) {
    const serverSearchKey = `"${id}":`;
    const serverPos = block.indexOf(serverSearchKey);
    if (serverPos === -1) {
      return { rank: null, players: null, points: 0, uptimeRatio: null, mostlyOffline: false, online: null };
    }

    const valueStart = serverPos + serverSearchKey.length;
    const char = block[valueStart];

    if (char === '{') {
      const endPos = findMatchingBrace(block, valueStart);
      if (endPos === -1) {
        return { rank: null, players: null, points: 0, uptimeRatio: null, mostlyOffline: false, online: null };
      }
      try {
        const obj = JSON.parse(block.slice(valueStart, endPos + 1)) as Record<string, unknown>;
        return { points: 0, ...parseServerHistoryFields(obj) };
      } catch {
        return { rank: null, players: null, points: 0, uptimeRatio: null, mostlyOffline: false, online: null };
      }
    }

    // Legacy format: serverId was stored as a plain rank number
    let numEnd = valueStart;
    while (numEnd < block.length && block[numEnd] !== ',' && block[numEnd] !== '}') numEnd++;
    const parsed = parseInt(block.slice(valueStart, numEnd));
    return { rank: parsed > 0 ? parsed : null, players: null, points: 0, uptimeRatio: null, mostlyOffline: false, online: null };
  }

  const daysString = c.req.query('days') || '30';
  const requestingAll = daysString === 'all';
  const days = requestingAll ? 9999 : parseInt(daysString);
  let plan = resolveHistoryQuery(days, game as HistoryGameType);

  let meta = (await c.env.TRENDING_KV.get(`${plan.baseKey}:meta`, 'json')) as { chunks?: number } | null;
  if (!meta?.chunks && plan.fallbackKey) {
    plan = {
      baseKey: plan.fallbackKey,
      sliceCount: plan.fallbackSlice ?? -12,
    };
    meta = (await c.env.TRENDING_KV.get(`${plan.baseKey}:meta`, 'json')) as { chunks?: number } | null;
  }
  if (!meta || !meta.chunks) {
    const finalResponse = c.json({ data: [] });
    c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
    return finalResponse;
  }

  // Parallel retrieval of history shards
  const shardPromises = [];
  for (let i = 0; i < meta.chunks; i++) {
    shardPromises.push(c.env.TRENDING_KV.get(`${plan.baseKey}:${i}`, 'text'));
  }
  const shardsText = await Promise.all(shardPromises);

  for (let i = 0; i < shardsText.length; i++) {
    const shardText = shardsText[i];
    if (!shardText || !shardText.includes(serversKey)) continue;

    let searchPos = 0;
    while (searchPos < shardText.length) {
      const timeIdx = shardText.indexOf(timeKey, searchPos);
      if (timeIdx === -1) break;

      const timeStart = timeIdx + timeKey.length;
      const timeEnd = shardText.indexOf('"', timeStart);
      if (timeEnd === -1) break;
      const time = shardText.slice(timeStart, timeEnd);

      // Find servers block within this time point
      const serversIdx = shardText.indexOf(serversKey, timeEnd);
      if (serversIdx === -1) break;

      // Block boundary: next time entry or end
      const nextTimeIdx = shardText.indexOf(timeKey, serversIdx + 10);
      const blockEnd = nextTimeIdx === -1 ? shardText.length : nextTimeIdx;
      const block = shardText.slice(serversIdx, blockEnd);

      const { rank, players, uptimeRatio, mostlyOffline, online } = extractServerHistory(block, serverId);

      serverHistory.push({ time, points: 0, rank, players, uptimeRatio, mostlyOffline, online });
      searchPos = blockEnd;
    }
  }

  const rawHistory = serverHistory.slice(plan.sliceCount);

  // Fill gaps between known points with interpolated values
  function smoothServerHistory(data: any[]): any[] {
    if (data.length < 2) return data;
    const smoothed: any[] = [];
    for (let i = 0; i < data.length; i++) {
      const point = { ...data[i] };
      if (point.rank === null && i > 0 && i < data.length - 1) {
        let prevIdx = i - 1;
        while (prevIdx >= 0 && data[prevIdx].rank === null) prevIdx--;
        let nextIdx = i + 1;
        while (nextIdx < data.length && data[nextIdx].rank === null) nextIdx++;
        if (prevIdx >= 0 && nextIdx < data.length) {
          const prevRank = data[prevIdx].rank;
          const nextRank = data[nextIdx].rank;
          const step = (i - prevIdx) / (nextIdx - prevIdx);
          point.rank = Math.round(prevRank + (nextRank - prevRank) * step);
          point.isInterpolated = true;
        }
      }
      smoothed.push(point);
    }
    return smoothed;
  }

  const finalHistory = smoothServerHistory(rawHistory);
  const finalResponse = c.json({ data: finalHistory });
  finalResponse.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  return finalResponse;
});

/**
 * POST /audit/config
 * Uses modId only (parsed client-side); names are fetched from KV DB, not config.json.
 * Config is NOT stored in KV / cache – response only exists in the browser.
 */
app.post('/audit/config', async (c) => {
  const start = Date.now();
  try {
  const game = getGameFromQuery(c);
  if (game !== 'reforger') {
    return c.json(
      { error: 'Unsupported game', message: 'Config audit is only available for Reforger (1.7 Partisan).' },
      400
    );
  }

  let body: { config?: unknown; mods?: { modId: string; name?: string }[] } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  let parsedMods;
  try {
    if (Array.isArray(body.mods) && body.mods.length > 0) {
      parsedMods = body.mods
        .map((m) => ({
          modId: String(m.modId ?? '').trim().toUpperCase(),
          name: String(m.modId ?? ''),
        }))
        .filter((m) => /^[0-9A-F]{16}$/.test(m.modId));
      if (!parsedMods.length) throw new Error('Invalid modId format');
    } else {
      parsedMods = parseServerConfig(body.config ?? body);
    }
  } catch (err: any) {
    return c.json({ error: 'Invalid config', message: err?.message || 'Parse failed' }, 400);
  }

  console.log(`[AUDIT] ${parsedMods.length} mods (config body not stored)`);

  if (parsedMods.length > 120) {
    return c.json(
      { error: 'Too many mods', message: 'Maximum 120 mods per audit request.' },
      400
    );
  }

  const keys = getKVKeys(game);
  const configIds = new Set(parsedMods.map((m) => m.modId));

  const modMapRaw = await lookupModsByIds(c.env.TRENDING_KV, game, configIds);
  const modMap = new Map(
    [...modMapRaw.entries()].map(([id, m]) => [
      id,
      {
        totalPlayers: m.totalPlayers,
        serverCount: m.serverCount,
        coDeployed: m.coDeployed,
        name: m.name,
      },
    ])
  );

  const baseKey = keys.HISTORY_DAILY;
  const meta = (await c.env.TRENDING_KV.get(`${baseKey}:meta`, 'json')) as { chunks?: number } | null;
  const shards: string[] = [];
  if (meta?.chunks) {
    for (let i = 0; i < meta.chunks; i++) {
      const chunkText = await c.env.TRENDING_KV.get(`${baseKey}:${i}`, 'text');
      if (!chunkText) continue;
      const hasConfigMod = [...configIds].some((id) => chunkText.includes(`"${id}":{`));
      if (hasConfigMod) shards.push(chunkText);
    }
  } else {
    const legacy = await c.env.TRENDING_KV.get(baseKey, 'text');
    if (legacy) shards.push(legacy);
  }

  const mergedHistory = new Map<string, HistoryPoint[]>();
  for (const id of configIds) mergedHistory.set(id, []);

  for (const shardText of shards) {
    const partial = scanMultipleModsHistory(shardText, configIds);
    for (const [modId, points] of partial) {
      mergedHistory.get(modId)!.push(...points);
    }
  }

  const historyCache = new Map<string, HistoryPoint[]>();
  for (const [modId, points] of mergedHistory) {
    const sorted = points.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    historyCache.set(modId, smoothHistoryData(sorted.slice(-31)));
  }

  const historyFor = (modId: string): HistoryPoint[] =>
    historyCache.get(modId.toUpperCase()) ?? [];

  const buildOpts = { configIds, modMap, historyFor };

  const rows = sortAuditRowsWorstFirst(
    parsedMods.map((mod) => {
      const history = historyFor(mod.modId);
      const live = modMap.get(mod.modId.toUpperCase()) ?? modMap.get(mod.modId) ?? null;
      return buildModAuditRow(mod, history, live, REFORGER_PATCH_17, buildOpts);
    })
  );

  const summary: Record<AuditStatus, number> = {
    dead: 0,
    risky: 0,
    warning: 0,
    ok: 0,
    niche: 0,
    unknown: 0,
  };
  for (const r of rows) summary[r.status] += 1;

  const highlights = auditHighlights(rows);

  const response = c.json({
    data: rows,
    meta: {
      patchDate: REFORGER_PATCH_17,
      modCount: rows.length,
      summary,
      highlights,
      durationMs: Date.now() - start,
      privacy:
        'Your config.json is not stored. Only mod IDs are processed; display names come from the reforgermods database, not from your config file.',
      disclaimer:
        'Heuristic based on BattleMetrics data from all Reforger servers (reforgermods collector), not your server list alone. ' +
        'Now = only servers BM sees online today with this mod. Daily averages (before 1.7 / after update / last 7 days) aggregate every BM-indexed server seen on that day – servers that shut down or removed the mod after 1.7 lower those averages but are not listed one-by-one. ' +
        '“Ecosystem dip” = whole BM player base is still down after 1.7; popular mods look smaller in absolute numbers but may still be healthy (check BM rank). ' +
        '“Recovering” / “rising” reflect mod-specific trends, not a guarantee they work on your server. ' +
        'Alternatives are mods often used alongside this one on other servers (co-deploy). ' +
        'Workshop gameVersion and server RPT logs are the final confirmation.',
    },
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
  } catch (err: any) {
    console.error('[AUDIT ERROR]', err);
    return c.json(
      {
        error: 'Audit failed',
        message:
          'Audit processing timed out or KV is temporarily unavailable. Try again in a few minutes – the browser will use fallback mode (per mod).',
      },
      500
    );
  }
});

app.post('/storage/sizes', async (c) => {
  try {
    const body = await c.req.json<{ game?: GameType; modIds?: string[] }>();
    const game = body.game === 'arma3' ? 'arma3' : 'reforger';
    if (game === 'arma3') {
      return c.json({ error: 'Storage sizes not yet supported for Arma 3' }, 501);
    }

    const modIds = Array.isArray(body.modIds)
      ? [...new Set(body.modIds.map((id) => id.trim().toUpperCase()).filter(Boolean))].slice(0, 40)
      : [];
    if (!modIds.length) {
      return c.json({ error: 'modIds array is required' }, 400);
    }

    const sizes = await resolveModSizesBatch(c.env.TRENDING_KV, game, modIds, {
      maxFetch: modIds.length,
      concurrency: 10,
    });

    const data: Record<string, number | null> = {};
    let known = 0;
    for (const [id, bytes] of sizes) {
      data[id] = bytes;
      if (bytes != null && bytes > 0) known++;
    }

    const response = c.json({
      data,
      meta: { requested: modIds.length, known, source: 'reforger_workshop' },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (err: unknown) {
    console.error('[STORAGE SIZES ERROR]', err);
    return c.json({ error: 'Size fetch failed', message: err instanceof Error ? err.message : 'Unknown' }, 500);
  }
});

app.post('/storage/plan', async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json<{
      game?: GameType;
      mainServerId?: string;
      wantedServerIds?: string[];
      availableGb?: number;
    }>();

    const game = body.game === 'arma3' ? 'arma3' : 'reforger';
    if (game === 'arma3') {
      return c.json({ error: 'Storage planner not yet supported for Arma 3' }, 501);
    }

    const mainServerId = body.mainServerId?.trim();
    const wantedServerIds = Array.isArray(body.wantedServerIds)
      ? [...new Set(body.wantedServerIds.map((id) => id.trim()).filter(Boolean))]
      : [];
    const availableGb = Number(body.availableGb);

    if (!mainServerId) {
      return c.json({ error: 'mainServerId is required' }, 400);
    }
    if (!wantedServerIds.length) {
      return c.json({ error: 'wantedServerIds must include at least one server' }, 400);
    }
    if (!Number.isFinite(availableGb) || availableGb <= 0) {
      return c.json({ error: 'availableGb must be a positive number' }, 400);
    }

    const availableBytes = Math.round(availableGb * 1024 ** 3);
    const kv = c.env.TRENDING_KV;

    const serverLookup = await ServerLookup.create(kv, game);
    if (!serverLookup) return c.json({ error: 'Server data unavailable' }, 503);

    const mainRaw = serverLookup.findById(mainServerId);
    if (!mainRaw) return c.json({ error: 'Main server not found' }, 404);

    const wantedRawList: Array<Record<string, unknown>> = [];
    for (const id of wantedServerIds) {
      const server = serverLookup.findById(id);
      if (!server) return c.json({ error: `Server not found: ${id}` }, 404);
      wantedRawList.push(server);
    }

    const modNameById = new Map<string, string>();
    const collectMods = (raw: Record<string, unknown>) => {
      const mods = Array.isArray(raw.mods) ? (raw.mods as Array<{ id: string; name: string }>) : [];
      for (const mod of mods) {
        if (mod?.id && !modNameById.has(mod.id)) {
          modNameById.set(mod.id, mod.name ?? mod.id);
        }
      }
    };
    collectMods(mainRaw);
    for (const server of wantedRawList) collectMods(server);

    const allModIds = [...modNameById.keys()];
    const sizes = await resolveModSizesBatch(kv, game, allModIds, { maxFetch: 0 });

    const mainPack = await buildServerStoragePack(kv, game, {
      id: String(mainRaw.id),
      name: String(mainRaw.name ?? 'Server'),
      mods: Array.isArray(mainRaw.mods) ? mainRaw.mods as Array<{ id: string; name: string }> : [],
    }, { sizes });

    const wantedPacks = await Promise.all(
      wantedRawList.map((server) =>
        buildServerStoragePack(kv, game, {
          id: String(server.id),
          name: String(server.name ?? 'Server'),
          mods: Array.isArray(server.mods) ? server.mods as Array<{ id: string; name: string }> : [],
        }, { sizes })
      )
    );

    const knownSizes = [...sizes.values()].filter((b) => b != null && b > 0).length;

    const analysis = analyzeStoragePlan({
      installedMods: mainPack.mods,
      wantedServers: wantedPacks,
      availableBytes,
    });

    const response = c.json({
      data: {
        mainServer: mainPack,
        wantedServers: wantedPacks,
        analysis,
      },
      meta: {
        durationMs: Date.now() - start,
        sizeCoverage: allModIds.length > 0 ? knownSizes / allModIds.length : 0,
        sizesKnown: knownSizes,
        sizesTotal: allModIds.length,
        disclaimer:
          'Installed library is approximated from your main server modpack. Sizes from leaderboard / workshop cache (no live scrape).',
      },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (err: unknown) {
    console.error('[STORAGE PLAN ERROR]', err);
    return c.json({ error: 'Storage plan failed', message: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

/** Track affiliate link clicks */
app.get('/click/empower', async (c) => {
  const game = c.req.query('game') || 'reforger';
  const key = game === 'arma3' ? 'click:empower:arma3' : 'click:empower:reforger';

  try {
    const raw = await c.env.TRENDING_KV.get(key, 'text');
    const count = (parseInt(raw || '0', 10) || 0) + 1;
    await c.env.TRENDING_KV.put(key, String(count));
    console.log(`[CLICK] Empower ${game} — total ${count}`);
  } catch {
    // best-effort
  }

  const url = `https://billing.empowerservers.com/aff.php?aff=294`;
  return c.redirect(url, 302);
});

/** Get click stats for admin panel */
app.get('/admin/clicks', async (c) => {
  const [reforger, arma3] = await Promise.all([
    c.env.TRENDING_KV.get('click:empower:reforger', 'text'),
    c.env.TRENDING_KV.get('click:empower:arma3', 'text'),
  ]);
  return c.json({
    empower: {
      reforger: parseInt(reforger || '0', 10) || 0,
      arma3: parseInt(arma3 || '0', 10) || 0,
      total: (parseInt(reforger || '0', 10) || 0) + (parseInt(arma3 || '0', 10) || 0),
    },
  });
});

/** Seed click counter (admin) */
app.post('/admin/clicks/seed', async (c) => {
  const body = await c.req.json<{ reforger?: number; arma3?: number }>();
  const promises: Promise<void>[] = [];
  if (body.reforger != null) {
    promises.push(c.env.TRENDING_KV.put('click:empower:reforger', String(body.reforger)));
  }
  if (body.arma3 != null) {
    promises.push(c.env.TRENDING_KV.put('click:empower:arma3', String(body.arma3)));
  }
  await Promise.all(promises);
  return c.json({ ok: true });
});

export const onRequest = handle(app);
