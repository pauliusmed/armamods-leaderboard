/** Build a Mod-shaped row from partial leaderboard data. */
export function toModRow(partial: {
  id: string;
  name: string;
  totalPlayers?: number;
  serverCount?: number;
  overallRank?: number;
  marketShare?: number;
}) {
  return {
    id: partial.id,
    name: partial.name,
    totalPlayers: partial.totalPlayers ?? 0,
    serverCount: partial.serverCount ?? 0,
    overallRank: partial.overallRank ?? 0,
    marketShare: partial.marketShare ?? 0,
  };
}
