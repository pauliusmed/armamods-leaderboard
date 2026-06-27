export interface Mod {
  id: string; // The modId from workshop
  name: string;
  author?: string | null;
  thumbnail?: string | null;
  serverCount: number;
  totalPlayers: number;
  playerRank?: number;
  serverRank?: number;
  overallRank: number;
  marketShare?: number;
  coDeployed?: {
    id: string;
    name: string;
    count: number;
    totalPlayers?: number;
    serverCount?: number;
    overallRank?: number;
    marketShare?: number;
  }[];
}

export interface ModDependency {
  id: string;
  name: string;
  version?: string;
  totalPlayers?: number;
  serverCount?: number;
  overallRank?: number;
  marketShare?: number;
}

export interface ServerMod {
  id: string;
  name: string;
  playerRank: number;
  serverRank: number;
  overallRank: number;
  serverCount: number;
  totalPlayers: number;
}

export interface Server {
  id: string;
  name: string;
  ip: string | null;
  port: number | null;
  players: number;
  maxPlayers: number;
  /** Active scenario/mission from BattleMetrics (Reforger scenarioName or Arma 3 map·mission). */
  scenarioName?: string | null;
  sqePoints?: number;
  sqeRank?: number;
  /** Quality tier from tenure-weighted rank: S/A/B/C, or null if below cutoff / new. */
  sqeTier?: 'S' | 'A' | 'B' | 'C' | null;
  mods: ServerMod[];
}

export interface ApiResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface TrendingMod {
  id: string;
  name: string;
  serverCount: number;
  totalPlayers: number;
  playerRank: number;
  serverRank: number;
  overallRank: number;
  rankDelta?: number;
  trendScore?: number;
  prevRank?: number;
  currentRank?: number;
}

export interface TrendingData {
  rising: TrendingMod[];
  falling: TrendingMod[];
  new: TrendingMod[];
}

export interface TrendingResponse {
  data: TrendingData;
  meta: {
    lastUpdated: string | null;
    period?: string;
    comparisonDate?: string;
    snapshotDate?: string;
    error?: string;
  };
}

export interface ModHistory {
  date: string;
  totalPlayers: number;
  serverCount: number;
  overallRank: number;
}

export type TrendPeriod = '7d' | '30d';
