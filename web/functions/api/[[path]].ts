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
  };
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
    const chunks: any[] = [];
    for (let i = 0; i < chunksToFetch; i++) {
      const chunkStart = Date.now();
      const chunk = await kv.get(`${baseKey}:${i}`, 'json') as any[];
      if (chunk && Array.isArray(chunk)) {
        // Use loop instead of spread to save memory/stack
        for (const item of chunk) {
          chunks.push(item);
        }
        const chunkTime = Date.now() - chunkStart;
        if (chunkTime > 20) { 
            console.log(`  [KV] Slow chunk ${i} for ${baseKey} took ${chunkTime}ms`);
        }
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

  // OPTIMIZATION: If no search and default sort, only fetch the first few chunks
  // OPTIMIZATION: If no search and default sort, only fetch the first chunk (512KB)
  const isDefaultView = !search && (sortBy === 'overall' || !sortBy);
  const mods = await getChunkedData(c.env.TRENDING_KV, keys.MODS, isDefaultView ? 1 : undefined);
  let filtered = [...mods];

  if (search) {
    const low = search.toLowerCase();
    filtered = filtered.filter(m => m.name?.toLowerCase().includes(low) || m.id?.toLowerCase().includes(low));
  }

  // Sort logic
  if (sortBy === 'players') filtered.sort((a, b) => b.totalPlayers - a.totalPlayers);
  else if (sortBy === 'servers') filtered.sort((a, b) => b.serverCount - a.serverCount);
  else if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else {
    filtered.sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999));
  }

  const response = c.json({ 
    data: filtered.slice(offset, offset + limit), 
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

  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.MODS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        totalModsCount = meta.total;
        for (let i = 0; i < meta.chunks; i++) {
            const chunkText = await c.env.TRENDING_KV.get(`${keys.MODS}:${i}`, 'text');
            if (chunkText && chunkText.includes(`"id":"${modId}"`)) {
                const chunk = JSON.parse(chunkText);
                mod = chunk.find((m: any) => m.id === modId);
                if (mod) break;
            }
        }
    }
  } catch (err) {
      console.error('[MODS_DETAIL] KV mod lookup error:', err);
  }

  if (!mod) return c.json({ error: 'Not found' }, 404);

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
        for (let i = 0; i < meta.chunks; i++) {
            if (modServers.length >= MAX_SERVERS_PER_MOD) break;
            
            const chunkText = await c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text');
            if (chunkText && chunkText.includes(`"id":"${modId}"`)) {
                const chunk = JSON.parse(chunkText);
                for (const s of chunk) {
                    if (s.mods && s.mods.some((m: any) => m.id === modId)) {
                        modServers.push(s);
                        if (modServers.length >= MAX_SERVERS_PER_MOD) break;
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

  let baseKey = `history:daily:${game}`;
  let sliceCount = -days;

  if (days <= 1) { baseKey = `history:hourly:${game}`; sliceCount = -24; }
  else if (days > 31 && days <= 365) { baseKey = `history:monthly:${game}`; sliceCount = -12; }
  else if (days > 365 || requestingAll) { baseKey = `history:yearly:${game}`; sliceCount = -10; }

  console.log(`[HISTORY] Fetching ${baseKey} shards for ${modId}...`);
  
  let modHistory: any[] = [];
  const meta = await c.env.TRENDING_KV.get(`${baseKey}:meta`, 'json') as any;

  if (meta && meta.chunks) {
      // Sharded logic
      for (let i = 0; i < meta.chunks; i++) {
          const shardKey = `${baseKey}:${i}`;
          // Greitas patikrinimas ar šis blokas turi mūsų modą
          const shardText = await c.env.TRENDING_KV.get(shardKey, 'text');
          if (shardText && shardText.includes(`"${modId}":{`)) {
              const shardHistory = scanHistoryPoints(shardText, modId);
              modHistory.push(...shardHistory);
          }
      }
  } else {
      // Legacy single-file logic
      const historyText = await c.env.TRENDING_KV.get(baseKey, 'text');
      if (historyText) modHistory = scanHistoryPoints(historyText, modId);
  }

  const finalHistory = smoothHistoryData(modHistory.slice(sliceCount));
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
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  console.log(`[SERVERS] Fetching data for ${game}...`);
  // OPTIMIZATION: If no search, only fetch the first chunk (enough for the first page)
  const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS, !search ? 1 : undefined);
  
  if (!servers || servers.length === 0) {
    console.log(`[SERVERS] No data found in KV for ${game}`);
    return c.json({ data: [], meta: { total: 0, limit, offset } });
  }

  let filtered = [...servers];

  if (search) {
    const low = search.toLowerCase();
    filtered = filtered.filter(s => s.name?.toLowerCase().includes(low));
  }

  try {
    filtered.sort((a, b) => (b.players || 0) - (a.players || 0));
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
        for (let i = 0; i < meta.chunks; i++) {
            const chunkText = await c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text');
            if (chunkText && chunkText.includes(`"id":"${serverId}"`)) {
                const chunk = JSON.parse(chunkText);
                server = chunk.find((s: any) => s.id === serverId);
                if (server) break;
            }
        }
    }
  } catch (err) {
      console.error('[SERVERS_DETAIL] KV server lookup error:', err);
  }

  if (!server) return c.json({ error: 'Server not found' }, 404);

  const response = c.json({ data: server });
  
  // Cache for 5 minutes to ensure fresh SQE data
  response.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  
  return response;
});

// Bayesian Trending logic
app.get('/trending', async (c) => {
    const cache = await caches.open('armamods:trending');
    const cacheResponse = await cache.match(c.req.raw);
    if (cacheResponse) return cacheResponse;

    const game = getGameFromQuery(c);
    const keys = getKVKeys(game);
    const period = (c.req.query('period') || '24h') as '24h' | '7d' | '30d';

    const trendingData = await c.env.TRENDING_KV.get(`${keys.TRENDING}:${period}`, 'json') as any;
    
    if (!trendingData) {
        return c.json({ data: { rising: [], falling: [], new: [] }, meta: { lastUpdated: new Date().toISOString() } });
    }

    const response = c.json({ data: trendingData, meta: { lastUpdated: new Date().toISOString() } });
    response.headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
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
        version: '1.4.0-diag'
    });
});

// DEBUG ENDPOINT: See raw KV data structure
app.get('/debug/raw/:key', async (c) => {
    const key = c.req.param('key');
    const data = await c.env.TRENDING_KV.get(key, 'text');
    if (!data) return c.json({ error: 'Not found' });
    return c.text(data.slice(0, 5000));
});



// --- SERVER RANKING ENDPOINTS ---

// Get Top Ranked Servers (Leaderboard)
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

// Get Points History for a specific server (For Charts)
app.get('/servers/:serverId/history', async (c) => {
  const serverId = c.req.param('serverId');
  const game = c.req.query('game') || 'reforger';
  const cache = await caches.open('armamods:server_history');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const history = await c.env.TRENDING_KV.get(`history:server_scores:${game}`, 'json') as any[];
  if (!history) return c.json({ data: [] });

  // Extract points for ONLY this server 
  const serverHistory = history.map(entry => {
    const scores = entry.scores || {};
    // Calculate rank for this server at this point in time
    const rankedIds = Object.keys(scores).sort((a, b) => (scores[b] as number) - (scores[a] as number));
    const rank = rankedIds.indexOf(serverId) + 1;
    
    return {
      time: entry.time,
      points: scores[serverId] || 0,
      rank: rank > 0 ? rank : null
    };
  }).filter(h => h.points !== 0 || h.time === history[history.length-1].time);

  const finalResponse = c.json({ data: serverHistory });
  finalResponse.headers.set('Cache-Control', 'public, max-age=300');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  return finalResponse;
});

export const onRequest = handle(app);
