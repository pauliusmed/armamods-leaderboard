/** Shared scenario aggregation — collector writes KV, API reads (with live fallback). */

import {
  isOfficialScenarioName,
  matchOfficialScenario,
  type OfficialScenario,
} from './official-scenarios.ts';

export const UNKNOWN_SCENARIO = '— Unknown —';

export type ScenarioKind = 'workshop' | 'official' | 'unknown';

export function scenarioKey(scenarioName: string | null | undefined): string {
  const trimmed = scenarioName?.trim();
  return trimmed || UNKNOWN_SCENARIO;
}

export interface ScenarioModRef {
  id: string;
  name: string;
}

export interface ScenarioRankingInput {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  scenarioName?: string | null;
  sqeRank?: number | null;
  mods?: ScenarioModRef[];
}

export interface ScenarioClassification {
  kind: ScenarioKind;
  modId?: string;
  modName?: string;
  /** 0–1 — share of group servers carrying the resolved workshop mod. */
  modConfidence?: number;
  officialSlug?: string;
  displayName?: string;
}

export interface ScenarioRankingEntry {
  name: string;
  rank: number;
  serverCount: number;
  totalPlayers: number;
  avgFillPercent: number;
  topServer: {
    id: string;
    name: string;
    players: number;
    sqeRank: number | null;
  } | null;
  kind: ScenarioKind;
  modId?: string;
  modName?: string;
  modConfidence?: number;
  officialSlug?: string;
  displayName?: string;
}

const COVERAGE_MULTI = 0.9;

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function coverageThreshold(groupSize: number): number {
  return groupSize <= 1 ? 1 : COVERAGE_MULTI;
}

/** Mod present on almost every server in the group — likely the scenario workshop asset. */
export function resolveScenarioMod(
  servers: ScenarioRankingInput[],
  globalModServerCount: Map<string, number>,
): { modId: string; modName: string; confidence: number } | null {
  if (servers.length === 0) return null;

  const threshold = coverageThreshold(servers.length);
  const modCounts = new Map<string, number>();
  const modNames = new Map<string, string>();

  for (const server of servers) {
    const seen = new Set<string>();
    for (const mod of server.mods ?? []) {
      if (!mod.id || mod.id === '0') continue;
      seen.add(mod.id);
      if (mod.name) modNames.set(mod.id, mod.name);
    }
    for (const modId of seen) {
      modCounts.set(modId, (modCounts.get(modId) ?? 0) + 1);
    }
  }

  const scenarioNorm = normalizeLabel(servers[0]?.scenarioName ?? '');
  let best: { modId: string; modName: string; confidence: number; score: number } | null = null;

  for (const [modId, count] of modCounts) {
    const confidence = count / servers.length;
    if (confidence < threshold) continue;

    const globalCount = globalModServerCount.get(modId) ?? count;
    const specificity = count / Math.max(globalCount, 1);
    const modName = modNames.get(modId) ?? modId;
    const modNorm = normalizeLabel(modName);
    const nameBonus =
      scenarioNorm && (scenarioNorm === modNorm || scenarioNorm.includes(modNorm) || modNorm.includes(scenarioNorm))
        ? 1.5
        : 1;
    const score = confidence * specificity * nameBonus;

    if (!best || score > best.score) {
      best = { modId, modName, confidence, score };
    }
  }

  return best ? { modId: best.modId, modName: best.modName, confidence: best.confidence } : null;
}

export function classifyScenarioGroup(
  scenarioName: string,
  servers: ScenarioRankingInput[],
  globalModServerCount: Map<string, number>,
): ScenarioClassification {
  if (scenarioName === UNKNOWN_SCENARIO) {
    return { kind: 'unknown' };
  }

  const official: OfficialScenario | null = matchOfficialScenario(scenarioName);
  if (official) {
    return {
      kind: 'official',
      officialSlug: official.slug,
      displayName: official.title,
    };
  }

  if (isOfficialScenarioName(scenarioName)) {
    return {
      kind: 'official',
      displayName: scenarioName.replace(/^#AR-/, ''),
    };
  }

  const workshop = resolveScenarioMod(servers, globalModServerCount);
  if (workshop) {
    return {
      kind: 'workshop',
      modId: workshop.modId,
      modName: workshop.modName,
      modConfidence: workshop.confidence,
      displayName: workshop.modName,
    };
  }

  return { kind: 'unknown', displayName: scenarioName };
}

function buildGlobalModServerCount(servers: ScenarioRankingInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const server of servers) {
    const seen = new Set<string>();
    for (const mod of server.mods ?? []) {
      if (!mod.id || mod.id === '0') continue;
      seen.add(mod.id);
    }
    for (const modId of seen) {
      counts.set(modId, (counts.get(modId) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildScenarioRanking(servers: ScenarioRankingInput[]): ScenarioRankingEntry[] {
  const globalModServerCount = buildGlobalModServerCount(servers);
  const groups = new Map<string, ScenarioRankingInput[]>();

  for (const server of servers) {
    const key = scenarioKey(server.scenarioName);
    const list = groups.get(key) ?? [];
    list.push(server);
    groups.set(key, list);
  }

  const aggregates = Array.from(groups.entries()).map(([name, group]) => {
    const totalPlayers = group.reduce((sum, s) => sum + (s.players || 0), 0);
    const fillSum = group.reduce((sum, s) => {
      if (!s.maxPlayers) return sum;
      return sum + (s.players / s.maxPlayers) * 100;
    }, 0);
    const withCapacity = group.filter((s) => s.maxPlayers > 0).length;

    const topServer = [...group].sort((a, b) => {
      const rankA = a.sqeRank ?? 99999;
      const rankB = b.sqeRank ?? 99999;
      if (rankA !== rankB) return rankA - rankB;
      return (b.players || 0) - (a.players || 0);
    })[0];

    const classification = classifyScenarioGroup(name, group, globalModServerCount);

    return {
      name,
      rank: 0,
      serverCount: group.length,
      totalPlayers,
      avgFillPercent: withCapacity > 0 ? fillSum / withCapacity : 0,
      topServer: topServer
        ? {
            id: topServer.id,
            name: topServer.name,
            players: topServer.players || 0,
            sqeRank: topServer.sqeRank ?? null,
          }
        : null,
      kind: classification.kind,
      modId: classification.modId,
      modName: classification.modName,
      modConfidence: classification.modConfidence,
      officialSlug: classification.officialSlug,
      displayName: classification.displayName,
    };
  });

  aggregates.sort((a, b) => {
    if (b.totalPlayers !== a.totalPlayers) return b.totalPlayers - a.totalPlayers;
    if (b.serverCount !== a.serverCount) return b.serverCount - a.serverCount;
    return a.name.localeCompare(b.name);
  });

  return aggregates.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
