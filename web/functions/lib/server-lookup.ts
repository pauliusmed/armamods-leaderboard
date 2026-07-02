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

/** Loads server shards once — reuse for multiple IDs in the same request (e.g. storage plan). */
export class ServerLookup {
  private chunksText: (string | null)[] | null = null;

  private constructor(
    private readonly kv: KVNamespace,
    private readonly game: GameType
  ) {}

  static async create(kv: KVNamespace, game: GameType): Promise<ServerLookup | null> {
    const lookup = new ServerLookup(kv, game);
    const loaded = await lookup.loadChunks();
    return loaded ? lookup : null;
  }

  private async loadChunks(): Promise<boolean> {
    const baseKey = getServersKey(this.game);
    const meta = (await this.kv.get(`${baseKey}:meta`, 'json')) as { chunks?: number } | null;
    if (!meta?.chunks) return false;

    this.chunksText = await Promise.all(
      Array.from({ length: meta.chunks }, (_, i) => this.kv.get(`${baseKey}:${i}`, 'text'))
    );
    return true;
  }

  findById(serverId: string): Record<string, unknown> | null {
    if (!this.chunksText) return null;
    return findServerInChunks(this.chunksText, serverId);
  }
}

/** Surgical KV scan for a single server object (loads all shards once). */
export async function findServerById(
  kv: KVNamespace,
  game: GameType,
  serverId: string
): Promise<Record<string, unknown> | null> {
  const lookup = await ServerLookup.create(kv, game);
  if (!lookup) return null;
  return lookup.findById(serverId);
}
