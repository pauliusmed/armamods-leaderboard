/** Shared client-side mod list filters (server detail, embedded mod tables). */

export type ActivityFilter = 'all' | 'high' | 'medium' | 'low';
export type RankFilter = 'all' | 'top100' | 'top500' | 'top1000';
export type SizeFilter = 'all' | 'heavy' | 'medium' | 'small' | 'unknown';
export type EmbeddedModSort =
  | 'players'
  | 'size'
  | 'size-asc'
  | 'rank'
  | 'name'
  | 'deploy'
  | 'share';

export const ACTIVITY_HIGH_MIN = 500;
export const ACTIVITY_MEDIUM_MIN = 100;
export const SIZE_HEAVY_BYTES = 500 * 1024 * 1024;
export const SIZE_MEDIUM_BYTES = 100 * 1024 * 1024;

export interface FilterableServerMod {
  id: string;
  name: string;
  playerRank: number;
  totalPlayers: number;
  serverCount: number;
  sizeBytes?: number | null;
}

export function matchesActivityFilter(totalPlayers: number, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'high') return totalPlayers >= ACTIVITY_HIGH_MIN;
  if (filter === 'medium') {
    return totalPlayers >= ACTIVITY_MEDIUM_MIN && totalPlayers < ACTIVITY_HIGH_MIN;
  }
  return totalPlayers < ACTIVITY_MEDIUM_MIN;
}

export function matchesRankFilter(playerRank: number, filter: RankFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'top100') return playerRank <= 100;
  if (filter === 'top500') return playerRank <= 500;
  return playerRank <= 1000;
}

export function matchesSizeFilter(sizeBytes: number | null | undefined, filter: SizeFilter): boolean {
  if (filter === 'all') return true;
  if (sizeBytes == null || sizeBytes <= 0) return filter === 'unknown';
  if (filter === 'heavy') return sizeBytes >= SIZE_HEAVY_BYTES;
  if (filter === 'medium') {
    return sizeBytes >= SIZE_MEDIUM_BYTES && sizeBytes < SIZE_HEAVY_BYTES;
  }
  if (filter === 'small') return sizeBytes < SIZE_MEDIUM_BYTES;
  return false;
}

export function matchesModSearch(
  mod: Pick<FilterableServerMod, 'id' | 'name'>,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return mod.name.toLowerCase().includes(q) || mod.id.toLowerCase().includes(q);
}

export interface FilterServerModsOptions {
  search: string;
  activity: ActivityFilter;
  rank: RankFilter;
  size: SizeFilter;
}

export function filterServerMods<T extends FilterableServerMod>(
  mods: T[],
  opts: FilterServerModsOptions
): T[] {
  return mods.filter(
    (m) =>
      matchesModSearch(m, opts.search) &&
      matchesActivityFilter(m.totalPlayers, opts.activity) &&
      matchesRankFilter(m.playerRank, opts.rank) &&
      matchesSizeFilter(m.sizeBytes, opts.size)
  );
}

export function sortServerMods<T extends FilterableServerMod>(
  mods: T[],
  sort: EmbeddedModSort,
  totalServers: number
): T[] {
  const list = [...mods];
  list.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'rank') return a.playerRank - b.playerRank;
    if (sort === 'size') return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
    if (sort === 'size-asc') return (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
    if (sort === 'deploy') return (b.serverCount || 0) - (a.serverCount || 0);
    if (sort === 'share') {
      const shareA = totalServers > 0 ? (a.serverCount || 0) / totalServers : 0;
      const shareB = totalServers > 0 ? (b.serverCount || 0) / totalServers : 0;
      return shareB - shareA;
    }
    return (b.totalPlayers || 0) - (a.totalPlayers || 0);
  });
  return list;
}

export const ACTIVITY_FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'Activity: All' },
  { value: 'high', label: 'Activity: High (500+)' },
  { value: 'medium', label: 'Activity: Medium (100–499)' },
  { value: 'low', label: 'Activity: Low (<100)' },
];

export const RANK_FILTER_OPTIONS: Array<{ value: RankFilter; label: string }> = [
  { value: 'all', label: 'Rank: All' },
  { value: 'top100', label: 'Rank: Top 100' },
  { value: 'top500', label: 'Rank: Top 500' },
  { value: 'top1000', label: 'Rank: Top 1000' },
];

export const SIZE_FILTER_OPTIONS: Array<{ value: SizeFilter; label: string }> = [
  { value: 'all', label: 'Size: All' },
  { value: 'heavy', label: 'Size: Heavy (≥500 MB)' },
  { value: 'medium', label: 'Size: Medium (100–499 MB)' },
  { value: 'small', label: 'Size: Small (<100 MB)' },
  { value: 'unknown', label: 'Size: Unknown' },
];

export const EMBEDDED_MOD_SORT_OPTIONS: Array<{ value: EmbeddedModSort; label: string }> = [
  { value: 'players', label: 'Sort: Personnel' },
  { value: 'size', label: 'Sort: Size (largest)' },
  { value: 'size-asc', label: 'Sort: Size (smallest)' },
  { value: 'rank', label: 'Sort: Global Rank' },
  { value: 'deploy', label: 'Sort: Deploy' },
  { value: 'share', label: 'Sort: Share' },
  { value: 'name', label: 'Sort: Name' },
];

export const MOD_LEADERBOARD_SORT_OPTIONS = [
  { value: 'overall', label: 'Sort: Rank' },
  { value: 'name', label: 'Sort: Name' },
  { value: 'author', label: 'Sort: Author' },
  { value: 'players', label: 'Sort: Personnel' },
  { value: 'servers', label: 'Sort: Deploy' },
  { value: 'size', label: 'Sort: Size' },
  { value: 'share', label: 'Sort: Share' },
] as const;

export const SERVER_LIST_SORT_OPTIONS = [
  { value: 'rank', label: 'Sort: Rank' },
  { value: 'players', label: 'Sort: Players' },
  { value: 'mods', label: 'Sort: Mod Count' },
  { value: 'modpack', label: 'Sort: Modpack Size' },
  { value: 'name', label: 'Sort: Name' },
] as const;

export const CONSOLE_FIT_FILTER_OPTIONS = [
  { value: 'all', label: 'Console: All Servers' },
  { value: 'vanilla', label: 'Console: Vanilla Only' },
  { value: 'ps5', label: 'Console: Fits PS5 (25 GB)' },
  { value: 'xbox-x', label: 'Console: Fits Xbox X (40 GB)' },
  { value: 'xbox-s', label: 'Console: Fits Xbox S (20 GB)' },
] as const;

export const SCENARIO_LIST_SORT_OPTIONS = [
  { value: 'rank', label: 'Sort: Rank' },
  { value: 'players', label: 'Sort: Players' },
  { value: 'servers', label: 'Sort: Servers' },
  { value: 'fill', label: 'Sort: Avg Fill' },
  { value: 'name', label: 'Sort: Name' },
] as const;
