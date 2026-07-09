/**
 * Server uptime samples in shared history shards.
 * Collector runs ~every 2h; daily/weekly buckets aggregate sample counts
 * so a brief restart does not mark the whole day offline.
 */

export const UPTIME_OFFLINE_THRESHOLD = 0.5;

export type ServerHistorySnapshot = {
  rank: number;
  players: number;
  /** Online samples in this bucket */
  on?: number;
  /** Total collector samples in this bucket */
  n?: number;
  /** Hourly-only: single scan (no aggregation yet) */
  online?: boolean;
};

export function isServerOnlineSample(
  bmStatus: string | null | undefined,
  players: number | null | undefined,
  isOnline: (status: string | null | undefined) => boolean
): boolean {
  return isOnline(bmStatus) || (players ?? 0) > 0;
}

export function mergeServerHistorySnapshot(
  existing: ServerHistorySnapshot | undefined,
  incoming: { rank: number; players: number; online: boolean }
): ServerHistorySnapshot {
  if (!existing) {
    return {
      rank: incoming.rank,
      players: incoming.players,
      on: incoming.online ? 1 : 0,
      n: 1,
    };
  }

  const prevOn = existing.on ?? (existing.online ? 1 : 0);
  const prevN = existing.n ?? (existing.online !== undefined ? 1 : 0);

  return {
    rank: Math.min(existing.rank, incoming.rank),
    players: Math.max(existing.players, incoming.players),
    on: prevOn + (incoming.online ? 1 : 0),
    n: prevN + 1,
  };
}

export function uptimeRatioFromSnapshot(
  snapshot: Pick<ServerHistorySnapshot, 'on' | 'n' | 'online'>
): number | null {
  if (typeof snapshot.on === 'number' && typeof snapshot.n === 'number' && snapshot.n > 0) {
    return snapshot.on / snapshot.n;
  }
  if (typeof snapshot.online === 'boolean') {
    return snapshot.online ? 1 : 0;
  }
  return null;
}

export function classifyUptime(
  snapshot: Pick<ServerHistorySnapshot, 'on' | 'n' | 'online'>,
  threshold = UPTIME_OFFLINE_THRESHOLD
): 'online' | 'offline' | 'unknown' {
  const ratio = uptimeRatioFromSnapshot(snapshot);
  if (ratio === null) return 'unknown';
  return ratio >= threshold ? 'online' : 'offline';
}

export type ServerHistoryPoint = {
  time: string;
  rank: number | null;
  players: number | null;
  uptimeRatio: number | null;
  mostlyOffline: boolean;
  online: boolean | null;
  points?: number;
};

export function parseServerHistoryFields(obj: Record<string, unknown>): Omit<ServerHistoryPoint, 'time'> {
  const rank = typeof obj.rank === 'number' ? obj.rank : null;
  const players = typeof obj.players === 'number' ? obj.players : null;
  const ratio = uptimeRatioFromSnapshot({
    on: typeof obj.on === 'number' ? obj.on : undefined,
    n: typeof obj.n === 'number' ? obj.n : undefined,
    online: typeof obj.online === 'boolean' ? obj.online : undefined,
  });
  const status = classifyUptime({
    on: typeof obj.on === 'number' ? obj.on : undefined,
    n: typeof obj.n === 'number' ? obj.n : undefined,
    online: typeof obj.online === 'boolean' ? obj.online : undefined,
  });

  return {
    rank,
    players,
    uptimeRatio: ratio,
    mostlyOffline: status === 'offline',
    online: status === 'unknown' ? null : status === 'online',
  };
}

/** Contiguous mostly-offline spans for chart ReferenceArea (x = time labels). */
export function buildOfflineBands(
  points: Array<{ time: string; mostlyOffline: boolean }>
): Array<{ x1: string; x2: string }> {
  const bands: Array<{ x1: string; x2: string }> = [];
  let start: string | null = null;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.mostlyOffline) {
      if (!start) start = point.time;
    } else if (start) {
      bands.push({ x1: start, x2: point.time });
      start = null;
    }
  }

  if (start && points.length > 0) {
    bands.push({ x1: start, x2: points[points.length - 1].time });
  }

  return bands;
}
