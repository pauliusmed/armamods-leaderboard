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

/** Surgical KV scan for a single server object (same strategy as /servers/:id). */
export async function findServerById(
  kv: KVNamespace,
  game: GameType,
  serverId: string
): Promise<Record<string, unknown> | null> {
  const baseKey = getServersKey(game);
  const meta = (await kv.get(`${baseKey}:meta`, 'json')) as { chunks?: number } | null;
  if (!meta?.chunks) return null;

  const chunkPromises = Array.from({ length: meta.chunks }, (_, i) =>
    kv.get(`${baseKey}:${i}`, 'text')
  );
  const chunksText = await Promise.all(chunkPromises);

  for (const chunkText of chunksText) {
    if (!chunkText?.includes(`"id":"${serverId}"`)) continue;
    const searchStr = `"id":"${serverId}"`;
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
