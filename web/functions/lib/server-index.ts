import { scenarioKey } from './scenario-ranking';

export interface ServerIndexPayload {
  total: number;
  shards: number;
  map: Record<string, number>;
  /** Optional while older collector snapshots are still in KV. */
  scenarios?: Record<string, { shards: number[]; count: number }>;
}

export function getServersKey(game: string): string {
  return game === 'arma3' ? 'cache:servers:arma3' : 'cache:servers';
}

export function getServersIndexKey(game: string): string {
  return game === 'arma3' ? 'cache:servers-index:arma3' : 'cache:servers-index';
}

/** Add scenario references to the existing collector write, without extra KV operations. */
export function buildServerIndex(
  chunks: Array<Array<{ id: unknown; scenarioName?: string | null }>>
): ServerIndexPayload {
  const map: Record<string, number> = {};
  const scenarios: NonNullable<ServerIndexPayload['scenarios']> = Object.create(null);
  chunks.forEach((chunk, shard) => {
    for (const server of chunk) {
      if (server?.id == null) continue;
      map[String(server.id)] = shard;
      const name = scenarioKey(server.scenarioName);
      const entry = scenarios[name] ??= { shards: [], count: 0 };
      if (entry.shards.at(-1) !== shard) entry.shards.push(shard);
      entry.count++;
    }
  });
  return { total: Object.keys(map).length, shards: chunks.length, map, scenarios: Object.fromEntries(Object.entries(scenarios)) };
}
