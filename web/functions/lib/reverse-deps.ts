import {
  depsCacheKey,
  resolveModDependencies,
  type WorkshopDependency,
} from './workshop-fetch';
import type { ShareGame } from './share-meta';

export interface ReverseDepHit {
  id: string;
  name: string;
  dependencies: WorkshopDependency[];
}

export interface ReverseDepsAnalysis {
  target: { id: string; name: string };
  dependents: ReverseDepHit[];
  uncachedModIds: string[];
  serverModCount: number;
  scannedCount: number;
}

export function modDependsOnTarget(deps: WorkshopDependency[], targetModId: string): boolean {
  const target = targetModId.trim().toUpperCase();
  return deps.some((d) => d.id?.trim().toUpperCase() === target);
}

/** Pure helper — unit tests without KV. */
export function findReverseDependentsFromDepMap(
  serverMods: Array<{ id: string; name: string }>,
  targetModId: string,
  depMap: Map<string, WorkshopDependency[] | null | undefined>
): ReverseDepsAnalysis {
  const targetUpper = targetModId.trim().toUpperCase();
  const targetMod = serverMods.find((m) => m.id.toUpperCase() === targetUpper);
  if (!targetMod) {
    throw new Error('Target mod not on server');
  }

  const dependents: ReverseDepHit[] = [];
  const uncachedModIds: string[] = [];

  for (const mod of serverMods) {
    if (mod.id.toUpperCase() === targetUpper) continue;
    const deps = depMap.get(mod.id.toUpperCase());
    if (deps === undefined) {
      uncachedModIds.push(mod.id);
      continue;
    }
    if (deps && modDependsOnTarget(deps, targetModId)) {
      dependents.push({ id: mod.id, name: mod.name, dependencies: deps });
    }
  }

  dependents.sort((a, b) => a.name.localeCompare(b.name));

  return {
    target: { id: targetMod.id, name: targetMod.name },
    dependents,
    uncachedModIds,
    serverModCount: serverMods.length,
    scannedCount: serverMods.length - 1 - uncachedModIds.length,
  };
}

async function readCachedDeps(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopDependency[] | null> {
  const cached = await kv.get(depsCacheKey(game, modId), 'text');
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as WorkshopDependency[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Which server mods declare targetModId as a workshop dependency. */
export async function findReverseDependentsOnServer(
  kv: KVNamespace,
  game: ShareGame,
  serverMods: Array<{ id: string; name: string }>,
  targetModId: string,
  maxScrapes = 48
): Promise<ReverseDepsAnalysis> {
  if (game === 'arma3') {
    return {
      target: { id: targetModId, name: targetModId },
      dependents: [],
      uncachedModIds: [],
      serverModCount: serverMods.length,
      scannedCount: 0,
    };
  }

  const targetUpper = targetModId.trim().toUpperCase();
  const targetMod = serverMods.find((m) => m.id.toUpperCase() === targetUpper);
  if (!targetMod) {
    throw new Error('Target mod not on server');
  }

  const depMap = new Map<string, WorkshopDependency[] | null>();
  const toScrape: Array<{ id: string; name: string }> = [];

  const others = serverMods.filter((m) => m.id.toUpperCase() !== targetUpper);
  const batchSize = 50;
  for (let i = 0; i < others.length; i += batchSize) {
    const slice = others.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (mod) => {
        const cached = await readCachedDeps(kv, game, mod.id);
        if (cached) {
          depMap.set(mod.id.toUpperCase(), cached);
        } else {
          toScrape.push(mod);
        }
      })
    );
  }

  let scrapes = 0;
  const concurrency = 8;
  for (let i = 0; i < toScrape.length && scrapes < maxScrapes; i += concurrency) {
    const batch = toScrape.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (mod) => {
        if (scrapes >= maxScrapes) return;
        scrapes++;
        const deps = await resolveModDependencies(kv, game, mod.id);
        depMap.set(mod.id.toUpperCase(), deps);
      })
    );
  }

  const uncachedModIds = toScrape
    .filter((m) => !depMap.has(m.id.toUpperCase()))
    .map((m) => m.id);

  return findReverseDependentsFromDepMap(serverMods, targetModId, depMap);
}
