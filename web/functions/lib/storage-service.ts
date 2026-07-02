import { sumKnownBytes, estimateTotalBytes, type ModWithSize } from './storage-calc';
import type { ShareGame } from './share-meta';
import { resolveModSizesBatch } from './workshop-fetch';

export interface ServerStoragePack {
  id: string;
  name: string;
  mods: ModWithSize[];
  knownBytes: number;
  knownCount: number;
  modCount: number;
  estimatedBytes: number;
  coverage: number;
}

export async function buildServerStoragePack(
  kv: KVNamespace,
  game: ShareGame,
  server: { id: string; name: string; mods?: Array<{ id: string; name: string }> },
  options?: { maxFetch?: number; sizes?: Map<string, number | null> }
): Promise<ServerStoragePack> {
  const rawMods = Array.isArray(server.mods) ? server.mods : [];
  const modIds = rawMods.map((m) => m.id);
  const sizes =
    options?.sizes ??
    (await resolveModSizesBatch(kv, game, modIds, {
      maxFetch: options?.maxFetch ?? 0,
    }));

  const mods: ModWithSize[] = rawMods.map((m) => ({
    id: m.id,
    name: m.name,
    sizeBytes: sizes.get(m.id) ?? null,
  }));

  const summary = sumKnownBytes(mods);
  return {
    id: server.id,
    name: server.name,
    mods,
    ...summary,
    estimatedBytes: estimateTotalBytes(summary),
    coverage: summary.modCount > 0 ? summary.knownCount / summary.modCount : 0,
  };
}
