export interface ModWithSize {
  id: string;
  name: string;
  sizeBytes: number | null;
}

export interface ServerModpackInput {
  id: string;
  name: string;
  mods: ModWithSize[];
}

export interface ByteSummary {
  knownBytes: number;
  knownCount: number;
  modCount: number;
}

export function deduplicateMods(modLists: ModWithSize[][]): ModWithSize[] {
  const map = new Map<string, ModWithSize>();
  for (const list of modLists) {
    for (const mod of list) {
      if (!map.has(mod.id)) map.set(mod.id, mod);
    }
  }
  return [...map.values()];
}

export function sumKnownBytes(mods: ModWithSize[]): ByteSummary {
  let knownBytes = 0;
  let knownCount = 0;
  for (const mod of mods) {
    if (mod.sizeBytes != null && mod.sizeBytes > 0) {
      knownBytes += mod.sizeBytes;
      knownCount++;
    }
  }
  return { knownBytes, knownCount, modCount: mods.length };
}

export function estimateTotalBytes(summary: ByteSummary): number {
  if (summary.modCount === 0) return 0;
  if (summary.knownCount === 0) return 0;
  if (summary.knownCount === summary.modCount) return summary.knownBytes;
  const avg = summary.knownBytes / summary.knownCount;
  return Math.round(avg * summary.modCount);
}

export interface StoragePlanAnalysis {
  wantedUnion: ModWithSize[];
  toDownload: ModWithSize[];
  canRemove: ModWithSize[];
  overlap: ModWithSize[];
  wanted: ByteSummary & { estimatedBytes: number; coverage: number };
  toDownloadSummary: ByteSummary & { estimatedBytes: number };
  canRemoveSummary: ByteSummary & { estimatedBytes: number };
  availableBytes: number;
  fits: boolean;
  bytesOver: number;
  suggestedRemovals: ModWithSize[];
  suggestedFreeBytes: number;
}

/** Compare installed library (main server) against wanted server modpacks. */
export function analyzeStoragePlan(input: {
  installedMods: ModWithSize[];
  wantedServers: ServerModpackInput[];
  availableBytes: number;
}): StoragePlanAnalysis {
  const wantedUnion = deduplicateMods(input.wantedServers.map((s) => s.mods));
  const installedIds = new Set(input.installedMods.map((m) => m.id));
  const wantedIds = new Set(wantedUnion.map((m) => m.id));

  const toDownload = wantedUnion.filter((m) => !installedIds.has(m.id));
  const canRemove = input.installedMods.filter((m) => !wantedIds.has(m.id));
  const overlap = input.installedMods.filter((m) => wantedIds.has(m.id));

  const wanted = sumKnownBytes(wantedUnion);
  const wantedEstimated = estimateTotalBytes(wanted);
  const toDownloadSummary = sumKnownBytes(toDownload);
  const canRemoveSummary = sumKnownBytes(canRemove);

  const fits = wantedEstimated <= input.availableBytes;
  const bytesOver = Math.max(0, wantedEstimated - input.availableBytes);

  const suggestedRemovals = [...canRemove]
    .filter((m) => m.sizeBytes != null && m.sizeBytes > 0)
    .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));

  let suggestedFreeBytes = 0;
  const trimmedRemovals: ModWithSize[] = [];
  for (const mod of suggestedRemovals) {
    trimmedRemovals.push(mod);
    suggestedFreeBytes += mod.sizeBytes ?? 0;
    if (bytesOver > 0 && suggestedFreeBytes >= bytesOver) break;
  }

  return {
    wantedUnion,
    toDownload,
    canRemove,
    overlap,
    wanted: {
      ...wanted,
      estimatedBytes: wantedEstimated,
      coverage: wanted.modCount > 0 ? wanted.knownCount / wanted.modCount : 0,
    },
    toDownloadSummary: {
      ...toDownloadSummary,
      estimatedBytes: estimateTotalBytes(toDownloadSummary),
    },
    canRemoveSummary: {
      ...canRemoveSummary,
      estimatedBytes: estimateTotalBytes(canRemoveSummary),
    },
    availableBytes: input.availableBytes,
    fits,
    bytesOver,
    suggestedRemovals: bytesOver > 0 ? trimmedRemovals : suggestedRemovals.slice(0, 10),
    suggestedFreeBytes,
  };
}
