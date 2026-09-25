import type { KVNamespace } from '@cloudflare/workers-types';
import { cached } from './module-cache';

const META_CACHE_TTL_MS = 60_000;

/**
 * Kiek shard'ų parse'inama lygiagrečiai. Anksčiau visi chunk'ai buvo kviečiami
 * per `Promise.all` (servers ~16 × ~5MB) — vienas scan'as momentiškai laikydavo
 * visą dataset'ą, o keli lygiagretūs scan'ai izoliacijoje viršydavo 128MB
 * ribą → `Worker exceeded memory limit` (Observability 2026-09-25, /api/servers).
 */
export const SCAN_CHUNK_POOL = 4;

/**
 * Pilnų (visų shard'ų) scan'ų eilė izoliacijoje — vykdo tik po vieną.
 * Kitos izoliacijos turi savo atmintį, todėl srautas sumažėja tik lokaliai,
 * bet būtent lokaliai ir sprogdavo (paieškos burst'as: 13 užklausų / 30s).
 */
let fullScanQueue: Promise<unknown> = Promise.resolve();

export function withFullScanSlot<T>(fn: () => Promise<T>): Promise<T> {
  const run = fullScanQueue.then(fn, fn);
  fullScanQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

interface ChunkMeta {
  chunks: number;
}

async function readMeta(kv: KVNamespace, baseKey: string): Promise<ChunkMeta | null> {
  const meta = (await cached(`${baseKey}:meta`, META_CACHE_TTL_MS, () =>
    kv.get(`${baseKey}:meta`, 'json')
  )) as ChunkMeta | null;
  if (!meta || !meta.chunks) {
    console.log(`[KV] No meta or chunks for ${baseKey}`);
    return null;
  }
  return meta;
}

/** Nugula chunk'us su ribotu lygiagretumu; `visit` gauna kiekvieną chunk'ą ir jis išmetamas. */
async function forEachChunk(
  kv: KVNamespace,
  baseKey: string,
  chunkCount: number,
  visit: (chunk: unknown[]) => void
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(SCAN_CHUNK_POOL, chunkCount) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= chunkCount) return;
      const chunk = (await kv.get(`${baseKey}:${i}`, 'json')) as unknown;
      if (Array.isArray(chunk)) visit(chunk);
    }
  });
  await Promise.all(lanes);
}

/**
 * Visų shard'ų nuskaitymas į bendrą masyvą. Užkrauna daug atminties, todėl
 * be `maxChunks` (pilnas scan'as) praeina per `withFullScanSlot` eilę.
 */
export async function loadChunkedData(
  kv: KVNamespace,
  baseKey: string,
  maxChunks?: number
): Promise<any[]> {
  const run = async (): Promise<any[]> => {
    const start = Date.now();
    const meta = await readMeta(kv, baseKey);
    if (!meta) return [];
    const count = maxChunks ? Math.min(maxChunks, meta.chunks) : meta.chunks;
    console.log(`[KV] Fetching ${count} of ${meta.chunks} chunks for ${baseKey}`);
    const out: any[] = [];
    await forEachChunk(kv, baseKey, count, (chunk) => {
      for (const item of chunk) out.push(item);
    });
    console.log(`[KV] Finished ${baseKey} total fetch in ${Date.now() - start}ms`);
    return out;
  };
  return maxChunks === undefined ? withFullScanSlot(run) : run();
}

/**
 * Paieška be pilno dataset'ą: kaupiami TIK `match` atitikę elementai, kiti
 * shard'o objektai išmetami iš karto — izoliacijos peak'as lieka ~pool ×
 * shard'as vietoj ~visas dataset'as + dubliai. Visada eina per pilnų scan'ų eilę.
 */
export async function collectChunkedMatches(
  kv: KVNamespace,
  baseKey: string,
  match: (item: any) => boolean
): Promise<{ scanned: number; matches: any[] }> {
  return withFullScanSlot(async () => {
    const start = Date.now();
    const meta = await readMeta(kv, baseKey);
    if (!meta) return { scanned: 0, matches: [] };
    console.log(`[KV] Scanning ${meta.chunks} chunks for matches in ${baseKey}`);
    let scanned = 0;
    const matches: any[] = [];
    await forEachChunk(kv, baseKey, meta.chunks, (chunk) => {
      scanned += chunk.length;
      for (const item of chunk) if (match(item)) matches.push(item);
    });
    console.log(
      `[KV] ${baseKey}: scanned ${scanned}, matched ${matches.length} in ${Date.now() - start}ms`
    );
    return { scanned, matches };
  });
}
