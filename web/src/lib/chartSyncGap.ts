/**
 * When live sync is paused, keep historical chart series and append a trailing
 * category so Recharts can paint a “no data” ReferenceArea from the last sample to today.
 */

export type SyncGapResult<T> = {
  data: T[];
  gapX1: string | null;
  gapX2: string | null;
};

function todayKeyMatching(sample: string): string {
  // Daily buckets: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
    return new Date().toISOString().slice(0, 10);
  }
  // Hourly / ISO timestamps — snap to current hour for category axis
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * Append a null-metric endpoint when stale so the X domain reaches “now”.
 * Lines should leave connectNulls false (default) so curves stop at last real point.
 */
export function withSyncGapMarker<T extends { [K in TimeKey]: string }, TimeKey extends string>(
  points: T[],
  timeKey: TimeKey,
  isStale: boolean,
  nullFields: readonly (keyof T)[]
): SyncGapResult<T> {
  if (!isStale || points.length === 0) {
    return { data: points, gapX1: null, gapX2: null };
  }

  const last = points[points.length - 1];
  const gapX1 = last[timeKey];
  if (!gapX1) return { data: points, gapX1: null, gapX2: null };

  const gapX2 = todayKeyMatching(gapX1);
  if (!gapX2 || gapX2 <= gapX1) {
    return { data: points, gapX1: null, gapX2: null };
  }

  const marker = { ...last, [timeKey]: gapX2 } as T;
  for (const field of nullFields) {
    (marker as Record<string, unknown>)[field as string] = null;
  }

  return {
    data: [...points, marker],
    gapX1,
    gapX2,
  };
}
