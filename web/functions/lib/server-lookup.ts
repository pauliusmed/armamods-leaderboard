import type { GameType } from '../api/history-query';

function findMatchingBrace(text: string, openPos: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && inStr) {
      i++;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function getServersKey(game: GameType): string {
  return game === 'arma3' ? 'cache:servers:arma3' : 'cache:servers';
}

function getServersIndexKey(game: GameType): string {
  return game === 'arma3' ? 'cache:servers-index:arma3' : 'cache:servers-index';
}

/** Collector-written serverId → shard map, so the edge loads one shard (~5MB) instead of all (~80MB).
 *  Lygiagretos detail užklausos su pilnu skenu peršokdavo Worker 128MB ribą (exceededMemory 503). */
export interface ServerIndexPayload {
  total: number;
  shards: number;
  map: Record<string, number>;
}

/** Pure helper — used by the collector right after sharding the server list. */
export function buildServerIndex(chunks: Array<Array<{ id: unknown }>>): ServerIndexPayload {
  const map: Record<string, number> = {};
  chunks.forEach((chunk, shardIdx) => {
    for (const server of chunk) {
      if (server?.id != null) map[String(server.id)] = shardIdx;
    }
  });
  return { total: Object.keys(map).length, shards: chunks.length, map };
}

/** Parse one server object from preloaded shard text (testable without KV). */
export function findServerInChunks(
  chunksText: (string | null)[],
  serverId: string
): Record<string, unknown> | null {
  const searchStr = `"id":"${serverId}"`;
  for (const chunkText of chunksText) {
    if (!chunkText?.includes(searchStr)) continue;
    const idPos = chunkText.indexOf(searchStr);
    const startPos = chunkText.lastIndexOf('{', idPos);
    const endPos = findMatchingBrace(chunkText, startPos);
    if (startPos === -1 || endPos === -1) continue;
    try {
      const server = JSON.parse(chunkText.slice(startPos, endPos + 1));
      if (server?.id === serverId) return server;
    } catch {
      /* try next chunk */
    }
  }
  return null;
}

/** Full-scan batch size — 4 shards × ~5MB keeps peak RAM ~20MB per lookup instead of ~80MB. */
const FALLBACK_BATCH = 4;

/**
 * Server lookup with collector-written index. Index path: load only the shard the id maps to.
 * Fallback (index key missing, e.g. before the first collector run after deploy): batched
 * full-scan — documented, not silent: console.warn + `meta.indexFallback: true` in responses.
 */
export class ServerLookup {
  private index: ServerIndexPayload | null = null;
  private chunkCount = 0;
  // 1-shard cache (~5MB cap): storage plan queries neighbouring ids that share a shard.
  private lastShard: { idx: number; text: string } | null = null;

  private constructor(
    private readonly kv: KVNamespace,
    private readonly game: GameType
  ) {}

  /** False = paieška einą per batched full-scan fallbacką (indekso rakto KV nėra). */
  get hasIndex(): boolean {
    return this.index !== null;
  }

  static async create(kv: KVNamespace, game: GameType): Promise<ServerLookup | null> {
    const lookup = new ServerLookup(kv, game);
    const [index, meta] = await Promise.all([
      lookup.kv.get(getServersIndexKey(game), 'json') as Promise<ServerIndexPayload | null>,
      lookup.kv.get(`${getServersKey(game)}:meta`, 'json') as Promise<{ chunks?: number } | null>,
    ]);
    lookup.index = index ?? null;
    lookup.chunkCount = meta?.chunks ?? 0;
    if (!lookup.index && !lookup.chunkCount) return null;
    return lookup;
  }

  private async loadShard(idx: number): Promise<string | null> {
    if (this.lastShard?.idx === idx) return this.lastShard.text;
    const text = await this.kv.get(`${getServersKey(this.game)}:${idx}`, 'text');
    if (text) this.lastShard = { idx, text };
    return text;
  }

  async findById(serverId: string): Promise<Record<string, unknown> | null> {
    if (this.index) {
      const shardIdx = this.index.map[serverId];
      // Nėra indekse = serverio nėra šiame snapshot'e — be papildomų skenų (greitas 404).
      if (shardIdx === undefined) return null;
      const text = await this.loadShard(shardIdx);
      return text ? findServerInChunks([text], serverId) : null;
    }

    if (!this.chunkCount) return null;
    console.warn(
      `[SERVER_LOOKUP] servers-index missing for ${this.game} — batched full-scan fallback (${this.chunkCount} shards)`
    );
    for (let start = 0; start < this.chunkCount; start += FALLBACK_BATCH) {
      const end = Math.min(start + FALLBACK_BATCH, this.chunkCount);
      const texts = await Promise.all(
        Array.from({ length: end - start }, (_, j) => this.loadShard(start + j))
      );
      for (const text of texts) {
        if (!text) continue;
        const server = findServerInChunks([text], serverId);
        if (server) return server;
      }
    }
    return null;
  }
}

/** Surgical KV scan for a single server object (index path, batched full-scan fallback). */
export async function findServerById(
  kv: KVNamespace,
  game: GameType,
  serverId: string
): Promise<Record<string, unknown> | null> {
  const lookup = await ServerLookup.create(kv, game);
  if (!lookup) return null;
  return lookup.findById(serverId);
}
