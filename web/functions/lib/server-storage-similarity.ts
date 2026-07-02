import { estimateTotalBytes, sumKnownBytes, type ModWithSize } from './storage-calc';

export interface StorageAlternative {
  referenceServerId: string;
  referenceServerName: string;
  referenceExtraBytes: number;
  alternativeServerId: string;
  alternativeServerName: string;
  alternativeExtraBytes: number;
  bytesSaved: number;
  overlapPercent: number;
  players: number;
  scenarioName?: string | null;
}

export interface ServerModRef {
  id: string;
  name: string;
}

export interface StorageAlternativeCandidate {
  id: string;
  name: string;
  mods: ServerModRef[];
  players: number;
  scenarioName?: string | null;
}

function normId(id: string): string {
  return id.trim().toUpperCase();
}

/** Jaccard similarity between two mod id sets (0–100). */
export function modOverlapPercent(modIdsA: Iterable<string>, modIdsB: Iterable<string>): number {
  const a = new Set([...modIdsA].map(normId));
  const b = new Set([...modIdsB].map(normId));
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const id of a) {
    if (b.has(id)) common++;
  }
  const union = a.size + b.size - common;
  return union > 0 ? Math.round((common / union) * 100) : 0;
}

function estimateExtraBytes(
  serverMods: ServerModRef[],
  baseModIds: Set<string>,
  sizeById: Map<string, number | null>
): number {
  const extra: ModWithSize[] = [];
  for (const mod of serverMods) {
    const id = normId(mod.id);
    if (baseModIds.has(id)) continue;
    extra.push({
      id: mod.id,
      name: mod.name,
      sizeBytes: sizeById.get(id) ?? sizeById.get(mod.id) ?? null,
    });
  }
  return estimateTotalBytes(sumKnownBytes(extra));
}

/**
 * Find servers with a similar modpack that add less to the player's stack
 * than a currently selected wanted server.
 */
export function findStorageAlternatives(input: {
  mainModIds: string[];
  wantedServers: Array<{ id: string; name: string; mods: ServerModRef[] }>;
  candidates: StorageAlternativeCandidate[];
  sizeById: Map<string, number | null>;
  minOverlapPercent?: number;
  minBytesSaved?: number;
  maxResults?: number;
}): StorageAlternative[] {
  const {
    mainModIds,
    wantedServers,
    candidates,
    sizeById,
    minOverlapPercent = 45,
    minBytesSaved = 50 * 1024 * 1024,
    maxResults = 5,
  } = input;

  const excludeIds = new Set([
    ...mainModIds.map(normId),
    ...wantedServers.map((s) => s.id),
  ]);

  const allWantedModIds = new Set<string>();
  for (const server of wantedServers) {
    for (const mod of server.mods) allWantedModIds.add(normId(mod.id));
  }

  const results: StorageAlternative[] = [];

  for (const reference of wantedServers) {
    const refModIds = reference.mods.map((m) => normId(m.id));
    const otherWantedModIds = new Set(allWantedModIds);
    for (const id of refModIds) otherWantedModIds.delete(id);

    const baseIds = new Set([...mainModIds.map(normId), ...otherWantedModIds]);
    const referenceExtraBytes = estimateExtraBytes(reference.mods, baseIds, sizeById);
    if (referenceExtraBytes <= 0) continue;

    for (const candidate of candidates) {
      if (excludeIds.has(candidate.id)) continue;
      if (!candidate.mods?.length) continue;

      const overlapPercent = modOverlapPercent(refModIds, candidate.mods.map((m) => m.id));
      if (overlapPercent < minOverlapPercent) continue;

      const alternativeExtraBytes = estimateExtraBytes(candidate.mods, baseIds, sizeById);
      const bytesSaved = referenceExtraBytes - alternativeExtraBytes;
      if (bytesSaved < minBytesSaved) continue;

      results.push({
        referenceServerId: reference.id,
        referenceServerName: reference.name,
        referenceExtraBytes,
        alternativeServerId: candidate.id,
        alternativeServerName: candidate.name,
        alternativeExtraBytes,
        bytesSaved,
        overlapPercent,
        players: candidate.players,
        scenarioName: candidate.scenarioName,
      });
    }
  }

  return results
    .sort((a, b) => b.bytesSaved - a.bytesSaved || b.overlapPercent - a.overlapPercent)
    .slice(0, maxResults);
}
