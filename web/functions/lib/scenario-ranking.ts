/** Shared scenario aggregation — collector writes KV, API reads (with live fallback). */

export const UNKNOWN_SCENARIO = '— Unknown —';

export function scenarioKey(scenarioName: string | null | undefined): string {
  const trimmed = scenarioName?.trim();
  return trimmed || UNKNOWN_SCENARIO;
}

export interface ScenarioRankingInput {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  scenarioName?: string | null;
  sqeRank?: number | null;
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
}

export function buildScenarioRanking(servers: ScenarioRankingInput[]): ScenarioRankingEntry[] {
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
