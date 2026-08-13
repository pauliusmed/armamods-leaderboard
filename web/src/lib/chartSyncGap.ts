/**
 * Chart sync gaps: mark missing history between samples (and trailing “to now” while stale).
 * Recharts category axes need x1/x2 to match existing category values in `data`.
 */

export type ChartGap = { x1: string; x2: string };

export type SyncGapResult<T> = {
  data: T[];
  gaps: ChartGap[];
};

function todayKeyMatching(sample: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
    return new Date().toISOString().slice(0, 10);
  }
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function parseTimeMs(value: string): number | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const ms = Date.parse(`${value}T12:00:00Z`);
    return Number.isNaN(ms) ? null : ms;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Max allowed silence between points before we treat it as a “no data” band. */
export function maxGapMsForRange(selectedDays: number): number {
  // Hourly view: collector is ~2h — more than ~5h without a sample = gap
  if (selectedDays <= 1) return 5 * 60 * 60 * 1000;
  // Daily (and longer) buckets: more than ~1.5 days between points = gap
  return 36 * 60 * 60 * 1000;
}

/**
 * Find consecutive sample pairs whose time delta exceeds `maxGapMs`.
 */
export function findHistoryGaps<T extends { [K in TimeKey]: string }, TimeKey extends string>(
  points: T[],
  timeKey: TimeKey,
  maxGapMs: number
): ChartGap[] {
  const gaps: ChartGap[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i][timeKey];
    const b = points[i + 1][timeKey];
    const ta = parseTimeMs(a);
    const tb = parseTimeMs(b);
    if (ta === null || tb === null) continue;
    if (tb - ta > maxGapMs) {
      gaps.push({ x1: a, x2: b });
    }
  }
  return gaps;
}

/**
 * Detect gaps in history; if still stale, append a null endpoint so the band reaches “today”.
 */
export function withSyncGapMarker<T extends { [K in TimeKey]: string }, TimeKey extends string>(
  points: T[],
  timeKey: TimeKey,
  isStale: boolean,
  nullFields: readonly (keyof T)[],
  maxGapMs: number
): SyncGapResult<T> {
  if (points.length === 0) {
    return { data: points, gaps: [] };
  }

  let data = points;
  const gaps = findHistoryGaps(points, timeKey, maxGapMs);

  if (isStale) {
    const last = points[points.length - 1];
    const gapX1 = last[timeKey];
    const gapX2 = todayKeyMatching(gapX1);
    if (gapX2 && gapX2 > gapX1) {
      const marker = { ...last, [timeKey]: gapX2 } as T;
      for (const field of nullFields) {
        (marker as Record<string, unknown>)[field as string] = null;
      }
      data = [...points, marker];
      gaps.push({ x1: gapX1, x2: gapX2 });
    }
  }

  return { data, gaps };
}

/**
 * Short legend label for sync gaps, e.g. "· 07/21 → 07/24" or "· 07/21 → 07/24 +2".
 * Makes it explicit *when* the collector was offline instead of a vague "no data".
 */
export function formatGapSummary(gaps: ChartGap[]): string {
  if (gaps.length === 0) return '';
  const short = (iso: string): string => (iso.length >= 10 ? iso.slice(5).replace('-', '/') : iso);
  const first = gaps[0];
  const extra = gaps.length > 1 ? ` +${gaps.length - 1}` : '';
  return ` · ${short(first.x1)} → ${short(first.x2)}${extra}`;
}
