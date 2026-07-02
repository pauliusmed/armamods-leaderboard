import { deduplicateMods, estimateTotalBytes, sumKnownBytes, type ModWithSize } from './storage-calc';
import { modOverlapPercent } from './server-storage-similarity';

export interface ServerSetInput {
  id: string;
  name: string;
  mods: Array<{ id: string; name: string }>;
  modpackEstimatedBytes?: number | null;
}

export interface ModpackCluster {
  id: string;
  label: string;
  serverIds: string[];
  serverNames: string[];
  /** Average overlap of each member with the first server in the cluster. */
  internalOverlapPercent: number;
  estimatedUnionBytes: number;
  modCount: number;
  sizedCoverage: number;
}

export interface FittingServerSet {
  serverIds: string[];
  serverNames: string[];
  estimatedUnionBytes: number;
  modCount: number;
  fits: boolean;
}

export interface ServerSetFeedback {
  clusters: ModpackCluster[];
  fittingSets: FittingServerSet[];
  allSelectedFits: boolean;
  allSelectedBytes: number;
  availableBytes: number;
  bytesOver: number;
  guidance: string[];
  mainOverlapPercent: number | null;
}

function normId(id: string): string {
  return id.trim().toUpperCase();
}

function modsWithSizes(
  servers: ServerSetInput[],
  sizeById: Map<string, number | null>
): ModWithSize[] {
  const lists: ModWithSize[][] = servers.map((server) =>
    server.mods.map((mod) => ({
      id: mod.id,
      name: mod.name,
      sizeBytes: sizeById.get(normId(mod.id)) ?? sizeById.get(mod.id) ?? null,
    }))
  );
  return deduplicateMods(lists);
}

export function estimateServerSetUnion(
  servers: ServerSetInput[],
  sizeById: Map<string, number | null>
): { estimatedBytes: number; modCount: number; coverage: number } {
  if (servers.length === 0) {
    return { estimatedBytes: 0, modCount: 0, coverage: 0 };
  }

  const union = modsWithSizes(servers, sizeById);
  const summary = sumKnownBytes(union);
  let estimatedBytes = estimateTotalBytes(summary);

  // No per-mod sizes yet — use collector modpack totals when the cluster is highly overlapping.
  if (summary.knownCount === 0) {
    const packs = servers
      .map((s) => s.modpackEstimatedBytes ?? 0)
      .filter((b) => b > 0);
    if (packs.length > 0) {
      const repOverlap =
        servers.length > 1
          ? modOverlapPercent(servers[0].mods.map((m) => m.id), servers[1].mods.map((m) => m.id))
          : 100;
      estimatedBytes =
        repOverlap >= 70 ? Math.max(...packs) : packs.reduce((a, b) => a + b, 0);
    }
  }

  return {
    estimatedBytes,
    modCount: union.length,
    coverage: union.length > 0 ? summary.knownCount / union.length : 0,
  };
}

/** Detect common framework tags from mod names (WCS, RHS, etc.). */
export function detectStackTags(mods: Array<{ name: string }>): string[] {
  if (mods.length === 0) return ['Vanilla'];
  const text = mods.map((m) => m.name.toUpperCase()).join(' ');
  const tags: string[] = [];
  if (text.includes('WCS_') || text.includes('WCS ')) tags.push('WCS');
  if (text.includes('RHS')) tags.push('RHS');
  if (text.includes('FREEDOM FIGHTERS') || text.includes('FF -')) tags.push('Freedom Fighters');
  if (text.includes('ARMACONFLICT') || text.includes('ARMA CONFLICT')) tags.push('ArmaConflict');
  if (text.includes('CHUNGUS')) tags.push('Chungus');
  if (text.includes('CONFLICT IN EUROPE') || text.includes('CIE')) tags.push('CIE');
  return tags.length ? tags : ['Custom modpack'];
}

function clusterLabel(servers: ServerSetInput[]): string {
  const union = deduplicateMods(servers.map((s) => s.mods.map((m) => ({ ...m, sizeBytes: null }))));
  const tags = detectStackTags(union);
  const suffix = servers.length === 1 ? '1 server' : `${servers.length} servers`;
  return `${tags.join(' + ')} · ${suffix}`;
}

/** Group selected servers into modpack families (≥65% Jaccard with cluster rep). */
export function clusterServersByModpack(
  servers: ServerSetInput[],
  minOverlapPercent = 65
): ServerSetInput[][] {
  const clusters: ServerSetInput[][] = [];

  for (const server of servers) {
    let bestIdx = -1;
    let bestOverlap = 0;
    for (let i = 0; i < clusters.length; i++) {
      const rep = clusters[i][0];
      const overlap = modOverlapPercent(
        server.mods.map((m) => m.id),
        rep.mods.map((m) => m.id)
      );
      if (overlap >= minOverlapPercent && overlap > bestOverlap) {
        bestIdx = i;
        bestOverlap = overlap;
      }
    }
    if (bestIdx >= 0) clusters[bestIdx].push(server);
    else clusters.push([server]);
  }

  return clusters.sort((a, b) => b.length - a.length);
}

function averageInternalOverlap(cluster: ServerSetInput[]): number {
  if (cluster.length <= 1) return 100;
  const rep = cluster[0].mods.map((m) => m.id);
  let sum = 0;
  for (let i = 1; i < cluster.length; i++) {
    sum += modOverlapPercent(rep, cluster[i].mods.map((m) => m.id));
  }
  return Math.round(sum / (cluster.length - 1));
}

/** Find largest fitting subsets of selected servers (up to 10 servers). */
export function findFittingServerSets(input: {
  servers: ServerSetInput[];
  availableBytes: number;
  sizeById: Map<string, number | null>;
  maxResults?: number;
}): FittingServerSet[] {
  const { servers, availableBytes, sizeById, maxResults = 5 } = input;
  if (servers.length === 0 || servers.length > 10) return [];

  const results: FittingServerSet[] = [];
  const total = 1 << servers.length;

  for (let mask = 1; mask < total; mask++) {
    const subset = servers.filter((_, i) => (mask & (1 << i)) !== 0);
    const union = estimateServerSetUnion(subset, sizeById);
    const fits = union.estimatedBytes <= availableBytes;
    if (!fits) continue;
    results.push({
      serverIds: subset.map((s) => s.id),
      serverNames: subset.map((s) => s.name),
      estimatedUnionBytes: union.estimatedBytes,
      modCount: union.modCount,
      fits: true,
    });
  }

  return results
    .sort(
      (a, b) =>
        b.serverIds.length - a.serverIds.length ||
        b.estimatedUnionBytes - a.estimatedUnionBytes
    )
    .slice(0, maxResults);
}

export function analyzeServerSets(input: {
  selectedServers: ServerSetInput[];
  mainServer?: ServerSetInput | null;
  availableBytes: number;
  sizeById?: Map<string, number | null>;
}): ServerSetFeedback {
  const sizeById = input.sizeById ?? new Map<string, number | null>();
  const selected = input.selectedServers;

  const allUnion = estimateServerSetUnion(selected, sizeById);
  const allSelectedFits = allUnion.estimatedBytes <= input.availableBytes;
  const bytesOver = Math.max(0, allUnion.estimatedBytes - input.availableBytes);

  const clusterGroups = clusterServersByModpack(selected);
  const clusters: ModpackCluster[] = clusterGroups.map((group, index) => {
    const union = estimateServerSetUnion(group, sizeById);
    return {
      id: `cluster-${index}`,
      label: clusterLabel(group),
      serverIds: group.map((s) => s.id),
      serverNames: group.map((s) => s.name),
      internalOverlapPercent: averageInternalOverlap(group),
      estimatedUnionBytes: union.estimatedBytes,
      modCount: union.modCount,
      sizedCoverage: union.coverage,
    };
  });

  const fittingSets = findFittingServerSets({
    servers: selected,
    availableBytes: input.availableBytes,
    sizeById,
  });

  let mainOverlapPercent: number | null = null;
  if (input.mainServer?.mods?.length) {
    const wantedUnion = deduplicateMods(selected.map((s) => s.mods.map((m) => ({ ...m, sizeBytes: null }))));
    mainOverlapPercent = modOverlapPercent(
      input.mainServer.mods.map((m) => m.id),
      wantedUnion.map((m) => m.id)
    );
  }

  const guidance: string[] = [];

  if (selected.length === 0) {
    guidance.push('Select servers you want to play — we will group them by modpack family.');
  } else if (clusters.length > 1) {
    guidance.push(
      `You picked ${clusters.length} different mod families — each family adds unique downloads beyond shared mods (RHS, WCS…).`
    );
  } else if (clusters.length === 1 && clusters[0].serverIds.length > 1) {
    guidance.push(
      `All ${clusters[0].serverIds.length} servers share ~${clusters[0].internalOverlapPercent}% mods — pick one from this group unless you need a specific map/ruleset.`
    );
  }

  if (mainOverlapPercent != null && mainOverlapPercent < 25) {
    guidance.push(
      `Your installed-library proxy shares only ${mainOverlapPercent}% mods with selected servers — set step 2 to the server you actually have on disk for accurate auto-download numbers.`
    );
  }

  if (!allSelectedFits && fittingSets.length > 0) {
    const best = fittingSets[0];
    guidance.push(
      `Largest combination that fits (~${formatGbHint(best.estimatedUnionBytes)}): ${best.serverNames.length === 1 ? '1 server' : `${best.serverNames.length} servers`} from your selection.`
    );
  } else if (!allSelectedFits && fittingSets.length === 0) {
    guidance.push(
      'None of the selected servers fit alone at current estimates — try vanilla (0 mods) or a lighter modpack.'
    );
  } else if (allSelectedFits) {
    guidance.push('Your full selection should fit — switching between these servers mostly triggers small auto-downloads.');
  }

  return {
    clusters,
    fittingSets,
    allSelectedFits,
    allSelectedBytes: allUnion.estimatedBytes,
    availableBytes: input.availableBytes,
    bytesOver,
    guidance,
    mainOverlapPercent,
  };
}

function formatGbHint(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 10 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
}
