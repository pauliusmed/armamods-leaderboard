export type GameType = 'reforger' | 'arma3';

export type HistoryQueryPlan = {
  baseKey: string;
  sliceCount: number;
  /** Used when weekly series is still filling up after deploy */
  fallbackKey?: string;
  fallbackSlice?: number;
};

/** Monday UTC date (YYYY-MM-DD) – bucket key for weekly history */
export function weekStartISO(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function resolveHistoryQuery(days: number, game: GameType): HistoryQueryPlan {
  if (days <= 1) {
    return { baseKey: `history:hourly:${game}`, sliceCount: -24 };
  }
  if (days <= 31) {
    return { baseKey: `history:daily:${game}`, sliceCount: -days };
  }
  // UI 1Y button sends days=366; yearly only for all-time / >366
  if (days <= 366) {
    return {
      baseKey: `history:weekly:${game}`,
      sliceCount: -52,
      fallbackKey: `history:monthly:${game}`,
      fallbackSlice: -12,
    };
  }
  return { baseKey: `history:yearly:${game}`, sliceCount: -10 };
}
