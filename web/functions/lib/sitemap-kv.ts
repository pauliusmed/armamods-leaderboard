/**
 * Load entity ids from sharded KV list keys (mods / servers).
 */
import {
  extractIdsFromChunkJson,
  kvListBaseKey,
  type SitemapGame,
} from './sitemap';

export async function loadListIdsFromKv(
  kv: KVNamespace,
  kind: 'mods' | 'servers',
  game: SitemapGame
): Promise<string[]> {
  const base = kvListBaseKey(kind, game);
  const meta = (await kv.get(`${base}:meta`, 'json')) as { chunks?: number } | null;
  if (!meta?.chunks || meta.chunks < 1) return [];

  const texts = await Promise.all(
    Array.from({ length: meta.chunks }, (_, i) => kv.get(`${base}:${i}`, 'text'))
  );

  const ids: string[] = [];
  for (const text of texts) {
    if (!text) continue;
    try {
      ids.push(...extractIdsFromChunkJson(text));
    } catch {
      // Skip corrupt shard rather than failing the whole sitemap.
    }
  }
  return ids;
}
