import type { GameType } from '../api/history-query';
import { collectChunkedMatches, SCAN_CHUNK_POOL } from './chunked-scan';
import { cached } from './module-cache';
import { scenarioKey, type ScenarioRankingInput } from './scenario-ranking';
import { getServersIndexKey, getServersKey, type ServerIndexPayload } from './server-index';

/** Tracking parameters and query order do not change the public scenario payload. */
export function scenarioCacheRequest(request: Request, game: GameType, name: string): Request {
  const url = new URL(request.url);
  url.search = '';
  url.searchParams.set('game', game);
  url.searchParams.set('name', name);
  return new Request(url, { method: 'GET' });
}

type ScenarioEntry = NonNullable<ServerIndexPayload['scenarios']>[string];
function validEntry(entry: unknown, shardCount: number): entry is ScenarioEntry {
  if (!entry || typeof entry !== 'object') return false;
  const { shards, count } = entry as Partial<ScenarioEntry>;
  return Array.isArray(shards) && typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
    && (count === 0 ? shards.length === 0 : shards.length > 0)
    && shards.every((shard) => Number.isSafeInteger(shard) && shard >= 0 && shard < shardCount)
    && new Set(shards).size === shards.length;
}

/** Keep all server fields; only the candidate shards and retained objects change. */
export async function loadScenarioServers(
  kv: KVNamespace,
  game: GameType,
  name: string
): Promise<ScenarioRankingInput[]> {
  const base = getServersKey(game);
  const matches = (server: ScenarioRankingInput) => scenarioKey(server.scenarioName) === name;
  const index = await cached<ServerIndexPayload | null>(`serverindex:${game}`, 60_000, () =>
    kv.get(getServersIndexKey(game), 'json') as Promise<ServerIndexPayload | null>
  );
  const scenarios = index?.scenarios;
  if (scenarios && typeof scenarios === 'object' && !Array.isArray(scenarios)) {
    if (!Object.hasOwn(scenarios, name)) return [];
    const entry = scenarios[name];
    if (validEntry(entry, index.shards)) {
      const servers: ScenarioRankingInput[] = [];
      let complete = true;
      for (let start = 0; start < entry.shards.length; start += SCAN_CHUNK_POOL) {
        const chunks = await Promise.all(entry.shards.slice(start, start + SCAN_CHUNK_POOL).map(
          (shard) => kv.get(`${base}:${shard}`, 'json') as Promise<ScenarioRankingInput[] | null>
        ));
        for (const chunk of chunks) {
          if (!Array.isArray(chunk)) complete = false;
          else for (const server of chunk) if (matches(server)) servers.push(server);
        }
      }
      if (complete && servers.length === entry.count) return servers;
    }
    // Collector KV writes are not atomic; malformed or mismatched data must not become a 500/empty result.
    console.warn(`[SCENARIO_INDEX] ${game}: invalid entry or shard/count mismatch; bounded scan`);
  } else {
    console.warn(`[SCENARIO_INDEX] ${game}: legacy/missing/invalid index; bounded scan`);
  }
  return (await collectChunkedMatches(kv, base, matches)).matches;
}
