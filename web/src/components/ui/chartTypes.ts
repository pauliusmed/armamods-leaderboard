/** Shared chart prop types (kept dependency-light for the lazy chart chunk). */
export interface ModHistoryPoint {
  date: string;
  totalPlayers: number;
  serverCount: number;
  overallRank: number;
  isInterpolated?: boolean;
}

export interface SyncGap {
  x1: string;
  x2: string;
}
