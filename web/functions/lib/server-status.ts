/** BattleMetrics `attributes.status` — shared by collector and web UI. */

export type BmServerStatus = 'online' | 'offline' | 'dead' | 'removed' | 'invalid' | 'unknown';

export type BmStatusFilter = 'all' | 'online' | 'offline';

const BM_STATUSES: ReadonlySet<string> = new Set([
  'online',
  'offline',
  'dead',
  'removed',
  'invalid',
]);

export function normalizeBmServerStatus(raw: string | null | undefined): BmServerStatus {
  if (raw && BM_STATUSES.has(raw)) return raw as BmServerStatus;
  return 'unknown';
}

export function isBmServerOnline(status: BmServerStatus | null | undefined): boolean {
  return status === 'online';
}

export function matchesBmStatusFilter(
  status: BmServerStatus | null | undefined,
  filter: BmStatusFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'online') return status === 'online';
  return status != null && status !== 'online' && status !== 'unknown';
}

export const BM_STATUS_FILTER_OPTIONS: Array<{ value: BmStatusFilter; label: string }> = [
  { value: 'all', label: 'Status: All' },
  { value: 'online', label: 'Status: Online' },
  { value: 'offline', label: 'Status: Offline' },
];

export const BM_STATUS_LABEL: Record<BmServerStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  dead: 'Dead',
  removed: 'Removed',
  invalid: 'Invalid',
  unknown: 'Unknown',
};

export const BM_STATUS_SHORT: Record<BmServerStatus, string> = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  dead: 'DEAD',
  removed: 'REMOVED',
  invalid: 'INVALID',
  unknown: '—',
};
