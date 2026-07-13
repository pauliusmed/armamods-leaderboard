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

/** Use estimated totals for fit only when most mods have workshop sizes. */
export const SIZE_COVERAGE_FIT_THRESHOLD = 0.9;

export function coverageFromSummary(summary: ByteSummary): number {
  return summary.modCount > 0 ? summary.knownCount / summary.modCount : 0;
}

/**
 * Bytes for limit checks. Partial coverage uses known sum only — extrapolation
 * inflates heavy stacks when unknown mods are mostly small frameworks.
 */
export function fitBytesForSummary(
  summary: ByteSummary,
  estimatedBytes?: number
): { bytes: number; basis: 'known' | 'estimated' } {
  const estimated = estimatedBytes ?? estimateTotalBytes(summary);
  if (summary.knownCount === 0) {
    return { bytes: estimated, basis: 'estimated' };
  }
  if (coverageFromSummary(summary) >= SIZE_COVERAGE_FIT_THRESHOLD) {
    return { bytes: estimated, basis: 'estimated' };
  }
  return { bytes: summary.knownBytes, basis: 'known' };
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
  fitBytes: number;
  fitBasis: 'known' | 'estimated';
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
  const wantedOnlyUnion = deduplicateMods(input.wantedServers.map((s) => s.mods));
  const installedIds = new Set(input.installedMods.map((m) => m.id));
  const wantedIds = new Set(wantedOnlyUnion.map((m) => m.id));

  const toDownload = wantedOnlyUnion.filter((m) => !installedIds.has(m.id));
  const canRemove = input.installedMods.filter((m) => !wantedIds.has(m.id));
  const overlap = input.installedMods.filter((m) => wantedIds.has(m.id));

  const diskUnion = deduplicateMods([
    input.installedMods,
    ...input.wantedServers.map((s) => s.mods),
  ]);

  const wanted = sumKnownBytes(diskUnion);
  const wantedEstimated = estimateTotalBytes(wanted);
  const toDownloadSummary = sumKnownBytes(toDownload);
  const canRemoveSummary = sumKnownBytes(canRemove);
  const wantedCoverage = coverageFromSummary(wanted);
  const { bytes: fitBytes, basis: fitBasis } = fitBytesForSummary(wanted, wantedEstimated);

  const fits = fitBytes <= input.availableBytes;
  const bytesOver = Math.max(0, fitBytes - input.availableBytes);

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
    wantedUnion: diskUnion,
    toDownload,
    canRemove,
    overlap,
    wanted: {
      ...wanted,
      estimatedBytes: wantedEstimated,
      coverage: wantedCoverage,
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
    fitBytes,
    fitBasis,
    bytesOver,
    suggestedRemovals: bytesOver > 0 ? trimmedRemovals : [],
    suggestedFreeBytes: bytesOver > 0 ? suggestedFreeBytes : 0,
  };
}
