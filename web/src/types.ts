export interface Mod {
  id: string; // The modId from workshop
  name: string;
  author?: string | null;
  thumbnail?: string | null;
  workshopCreated?: string | null;
  workshopModified?: string | null;
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
  /** Workshop version download size (bytes), from collector + KV cache. */
  sizeBytes?: number | null;
  /** Reforger Workshop availability (on-demand scrape + KV cache). */
  workshopStatus?: WorkshopAvailability;
  workshopStatusCheckedAt?: string | null;
}

export type WorkshopAvailability = 'available' | 'unavailable' | 'unknown';

export interface WorkshopStatus {
  status: WorkshopAvailability;
  checkedAt: string | null;
}

export interface ModGalleryImage {
  url: string;
  thumb?: string;
  width?: number;
  height?: number;
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
  /** Sum of known mod download sizes on this server (bytes). */
  modpackKnownBytes?: number;
  /** Estimated total modpack size when some mod sizes are missing (bytes). */
  modpackEstimatedBytes?: number;
  modpackSizedCount?: number;
  modpackModCount?: number;
  modpackCoverage?: number;
}

export type ScenarioKind = 'workshop' | 'official' | 'unknown';

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
  kind?: ScenarioKind;
  modId?: string;
  modName?: string;
  modConfidence?: number;
  officialSlug?: string;
  displayName?: string;
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

export interface ModWithSize {
  id: string;
  name: string;
  sizeBytes: number | null;
}

export interface ServerStoragePack {
  id: string;
  name: string;
  mods: ModWithSize[];
  knownBytes: number;
  knownCount: number;
  modCount: number;
  estimatedBytes: number;
  coverage: number;
}

export interface StoragePlanAnalysis {
  wantedUnion: ModWithSize[];
  toDownload: ModWithSize[];
  canRemove: ModWithSize[];
  overlap: ModWithSize[];
  wanted: {
    knownBytes: number;
    knownCount: number;
    modCount: number;
    estimatedBytes: number;
    coverage: number;
  };
  toDownloadSummary: {
    knownBytes: number;
    knownCount: number;
    modCount: number;
    estimatedBytes: number;
  };
  canRemoveSummary: {
    knownBytes: number;
    knownCount: number;
    modCount: number;
    estimatedBytes: number;
  };
  availableBytes: number;
  fits: boolean;
  fitBytes: number;
  fitBasis: 'known' | 'estimated';
  bytesOver: number;
  suggestedRemovals: ModWithSize[];
  suggestedFreeBytes: number;
}

export interface StoragePlanResponse {
  data: {
    mainServer: ServerStoragePack;
    wantedServers: ServerStoragePack[];
    analysis: StoragePlanAnalysis;
  };
  meta: {
    durationMs: number;
    sizeCoverage?: number;
    sizesKnown?: number;
    sizesTotal?: number;
    disclaimer: string;
  };
}
