/**
 * Server config audit – ar modas „mirė“ po Reforger 1.7 (2026-05-28).
 * + tendencija (kyla / atgyja / krenta) ir alternatyvos iš co-deploy duomenų.
 */

export const REFORGER_PATCH_17 = '2026-05-28';

export type AuditStatus = 'dead' | 'risky' | 'warning' | 'ok' | 'niche' | 'unknown';
export type TrendPhase = 'rising' | 'recovering' | 'declining' | 'stable' | 'unknown';

export interface HistoryPoint {
  date?: string;
  time?: string;
  totalPlayers?: number;
}

export interface ParsedConfigMod {
  modId: string;
  name: string;
}

export interface CoDeployedRef {
  id: string;
  name: string;
  count: number;
}

export interface LiveModSnapshot {
  totalPlayers?: number;
  serverCount?: number;
  coDeployed?: CoDeployedRef[];
}

export interface ModAlternative {
  modId: string;
  name: string;
  currentPlayers: number;
  coDeployCount: number;
  trendPhase: TrendPhase;
  reason: string;
}

export interface TrendInsight {
  phase: TrendPhase;
  label: string;
  detail: string;
  recentAvg: number | null;
  earlyAfterAvg: number | null;
}

export interface ModAuditRow {
  modId: string;
  name: string;
  status: AuditStatus;
  title: string;
  detail: string;
  beforeAvg: number | null;
  afterAvg: number | null;
  dropPct: number | null;
  currentPlayers: number;
  serverCount: number;
  trendPhase: TrendPhase;
  trendLabel: string;
  trendDetail: string;
  recentAvg: number | null;
  alternatives: ModAlternative[];
}

export interface AuditBuildOptions {
  configIds: Set<string>;
  modMap: Map<string, LiveModSnapshot & { id?: string; name?: string }>;
  historyFor: (modId: string) => HistoryPoint[];
}

const TREND_LABEL: Record<TrendPhase, string> = {
  rising: 'Rising',
  recovering: 'Recovering',
  declining: 'Still declining',
  stable: 'Stable',
  unknown: 'Unknown',
};

export function parseServerConfig(input: unknown): ParsedConfigMod[] {
  let data: unknown = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Empty JSON');
    data = JSON.parse(trimmed);
  }

  const root = data as Record<string, unknown>;
  const game = root?.game as Record<string, unknown> | undefined;
  const modsRaw = (game?.mods ?? root?.mods ?? data) as unknown;

  if (!Array.isArray(modsRaw)) {
    throw new Error('Missing mods array (expected path: game.mods)');
  }

  const seen = new Set<string>();
  const out: ParsedConfigMod[] = [];

  for (const m of modsRaw) {
    const row = m as Record<string, unknown>;
    const modId = String(row.modId ?? row.id ?? '')
      .trim()
      .toUpperCase();
    if (!/^[0-9A-F]{16}$/.test(modId) || seen.has(modId)) continue;
    seen.add(modId);
    out.push({
      modId,
      name: String(row.name ?? modId),
    });
  }

  if (!out.length) throw new Error('No valid modId found (expected 16 hex characters)');
  return out;
}

export function avgPlayersInRange(
  history: HistoryPoint[],
  from: string,
  to: string
): number | null {
  const pts = history.filter((h) => {
    const day = h.date || h.time || '';
    return day >= from && day < to;
  });
  if (!pts.length) return null;
  const sum = pts.reduce((a, h) => a + (h.totalPlayers || 0), 0);
  return Math.round(sum / pts.length);
}

/** Paskutinės N kalendorinių dienų vidurkis (nuo paskutinės istorijos datos atgal) */
export function recentAvgFromHistory(
  history: HistoryPoint[],
  lastDays = 7,
  notBefore?: string
): number | null {
  if (!history.length) return null;
  const sorted = [...history].sort((a, b) =>
    (a.date || a.time || '').localeCompare(b.date || b.time || '')
  );
  const lastDate = sorted[sorted.length - 1].date || sorted[sorted.length - 1].time || '';
  if (!lastDate) return null;

  const windowStart = notBefore && notBefore > subtractDays(lastDate, lastDays - 1)
    ? notBefore
    : subtractDays(lastDate, lastDays - 1);
  const windowEnd = addDays(lastDate, 1);

  return avgPlayersInRange(history, windowStart, windowEnd);
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function analyzeTrend(
  history: HistoryPoint[],
  patchDate: string = REFORGER_PATCH_17
): TrendInsight {
  const beforeAvg = avgPlayersInRange(history, '2026-05-02', patchDate);
  // Pirmos 4 dienos po patch – „smūgis“
  const earlyAfterAvg = avgPlayersInRange(history, patchDate, addDays(patchDate, 4));
  // Paskutinės dienos po patch (neperdengia su prieš-patch)
  const recentAvg =
    avgPlayersInRange(history, addDays(patchDate, 3), '2099-01-01') ??
    recentAvgFromHistory(history, 7, patchDate);

  if (beforeAvg === null || recentAvg === null || history.length < 4) {
    return {
      phase: 'unknown',
      label: TREND_LABEL.unknown,
      detail: 'Not enough history points for trend analysis.',
      recentAvg,
      earlyAfterAvg,
    };
  }

  const early = earlyAfterAvg ?? recentAvg;

  // Atgyja: po 1.7 smūgis, bet paskutinės dienos gerėja
  if (
    beforeAvg >= 15 &&
    early < beforeAvg * 0.55 &&
    recentAvg > early * 1.5 &&
    recentAvg >= 8
  ) {
    return {
      phase: 'recovering',
      label: TREND_LABEL.recovering,
      detail: `After 1.7 dipped to ~${early} players/day, now ~${recentAvg} – ecosystem is recovering.`,
      recentAvg,
      earlyAfterAvg: early,
    };
  }

  // Kyla: po patch ne blogiau nei prieš arba aiškus augimas
  if (recentAvg >= beforeAvg * 0.85 || (recentAvg > early * 1.4 && recentAvg >= 25)) {
    return {
      phase: 'rising',
      label: TREND_LABEL.rising,
      detail: `Usage is growing or holding steady (~${recentAvg} players/day last week).`,
      recentAvg,
      earlyAfterAvg: early,
    };
  }

  // Krenta toliau
  if (recentAvg < early * 0.85 && beforeAvg > recentAvg * 1.25) {
    return {
      phase: 'declining',
      label: TREND_LABEL.declining,
      detail: `Decline continues after 1.7 (${early} → ${recentAvg} players/day).`,
      recentAvg,
      earlyAfterAvg: early,
    };
  }

  return {
    phase: 'stable',
    label: TREND_LABEL.stable,
    detail: 'No major change in the last week after 1.7.',
    recentAvg,
    earlyAfterAvg: early,
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MIN_SIGNAL_AVG = 15;
const DEAD_AFTER_MAX = 3;
/** Below this = effectively no players after 1.7 (WARNING core rule) */
const NO_PLAYERS_AFTER_MAX = 5;
/** Recent avg players/day – recovery is real when the ecosystem is coming back */
const MIN_RECOVERY_RECENT = 10;

/**
 * Post-1.7 ecosystem is effectively empty (not “today=0” while last week still had thousands).
 * Uses recent post-patch avg from trend, not full-period afterAvg (that mixes recovery back in).
 */
function isEmptyAfterUpdate(trend: TrendInsight, currentPlayers: number): boolean {
  const recent = trend.recentAvg;
  if (recent === null) {
    return currentPlayers <= NO_PLAYERS_AFTER_MAX;
  }
  return recent <= NO_PLAYERS_AFTER_MAX && currentPlayers <= NO_PLAYERS_AFTER_MAX;
}

function isHealthyRecovery(trend: TrendInsight, currentPlayers: number): boolean {
  const recent = trend.recentAvg ?? 0;
  if (trend.phase === 'recovering' && recent >= MIN_RECOVERY_RECENT) {
    // Admins re-add mods that work; recovering + players = not broken
    return currentPlayers > 0 || recent >= 15;
  }
  if (trend.phase === 'rising' && recent >= 15) {
    return true;
  }
  return false;
}

export function classifyModAudit(params: {
  beforeAvg: number | null;
  afterAvg: number | null;
  currentPlayers: number;
  trend: TrendInsight;
}): Pick<ModAuditRow, 'status' | 'title' | 'detail' | 'dropPct'> {
  const { beforeAvg, afterAvg, currentPlayers, trend } = params;

  if (beforeAvg === null || afterAvg === null) {
    return {
      status: 'unknown',
      title: 'No history',
      detail: 'Not enough daily data before/after 1.7 to assess this mod.',
      dropPct: null,
    };
  }

  const dropPct =
    beforeAvg > 0 ? Math.round(((beforeAvg - afterAvg) / beforeAvg) * 100) : afterAvg === 0 ? 100 : 0;

  if (beforeAvg < MIN_SIGNAL_AVG) {
    return {
      status: 'niche',
      title: 'Niche mod',
      detail: `Avg. <${MIN_SIGNAL_AVG} players before 1.7 – drop may be noise, not a broken mod.`,
      dropPct,
    };
  }

  // Recovering / rising = servers are bringing the mod back → not broken (broken mods stay removed)
  if (isHealthyRecovery(trend, currentPlayers)) {
    return {
      status: 'ok',
      title:
        trend.phase === 'recovering' ? 'Recovering after 1.7' : 'Growing after 1.7',
      detail:
        trend.phase === 'recovering'
          ? `${trend.detail} Ecosystem is re-adopting this mod – likely updated for 1.7, not abandoned.`
          : `${trend.detail} Usage is increasing again across servers.`,
      dropPct,
    };
  }

  const postPatchAvg = trend.recentAvg ?? trend.earlyAfterAvg ?? afterAvg;

  // Core WARNING: players before 1.7, practically none after the update
  if (isEmptyAfterUpdate(trend, currentPlayers)) {
    const isDead =
      postPatchAvg <= DEAD_AFTER_MAX &&
      currentPlayers <= DEAD_AFTER_MAX &&
      dropPct >= 70 &&
      trend.phase !== 'recovering';

    if (isDead) {
      return {
        status: 'dead',
        title: 'Likely broken after 1.7',
        detail:
          `Averaged ~${beforeAvg} players/day before 1.7; after the update ~${postPatchAvg} and now ${currentPlayers} – ecosystem removed this mod.`,
        dropPct,
      };
    }

    return {
      status: 'warning',
      title: 'Players before 1.7, empty after update',
      detail:
        `Had ~${beforeAvg} players/day before 1.7, but after the update only ~${postPatchAvg} avg recently and ${currentPlayers} now. ` +
        'Servers likely dropped this mod – check Workshop 1.7 update and your server logs.',
      dropPct,
    };
  }

  // Still on servers after 1.7 but usage fell hard (not a “empty after” case)
  if (dropPct >= 55 && currentPlayers > NO_PLAYERS_AFTER_MAX) {
    return {
      status: 'risky',
      title: 'Heavy drop, still some players',
      detail:
        `Down ~${dropPct}% since 1.7 but ~${currentPlayers} players still on BattleMetrics – monitor, not necessarily broken.`,
      dropPct,
    };
  }

  return {
    status: 'ok',
    title: 'Still used after 1.7',
    detail:
      currentPlayers > NO_PLAYERS_AFTER_MAX
        ? `~${currentPlayers} players now – ecosystem still runs this mod after the update.`
        : 'Usage after 1.7 is within normal range for this mod.',
    dropPct,
  };
}

export function pickAlternatives(
  sourceModId: string,
  live: LiveModSnapshot | null,
  modMap: Map<string, LiveModSnapshot & { name?: string }>,
  configIds: Set<string>,
  historyFor: (modId: string) => HistoryPoint[],
  limit = 3
): ModAlternative[] {
  const coList = live?.coDeployed ?? [];
  if (!coList.length) return [];

  const candidates: ModAlternative[] = [];

  for (const co of coList) {
    const id = String(co.id).toUpperCase();
    if (id === sourceModId || configIds.has(id)) continue;

    const altLive = modMap.get(id);
    const players = altLive?.totalPlayers ?? 0;
    if (players < 25) continue;

    const trend = analyzeTrend(historyFor(id));
    if (trend.phase === 'declining' && players < 80) continue;

    let reason = `Often on similar server stacks (co-deploy ×${co.count})`;
    if (trend.phase === 'rising') reason += ' · rising now';
    else if (trend.phase === 'recovering') reason += ' · recovering after 1.7';
    else if (trend.phase === 'stable') reason += ' · stable';

    candidates.push({
      modId: id,
      name: co.name || altLive?.name || id,
      currentPlayers: players,
      coDeployCount: co.count,
      trendPhase: trend.phase,
      reason,
    });
  }

  candidates.sort((a, b) => {
    const scoreA = a.coDeployCount * Math.log10(a.currentPlayers + 10);
    const scoreB = b.coDeployCount * Math.log10(b.currentPlayers + 10);
    const trendBoost = (p: TrendPhase) =>
      p === 'rising' ? 1.35 : p === 'recovering' ? 1.2 : p === 'declining' ? 0.7 : 1;
    return scoreB * trendBoost(b.trendPhase) - scoreA * trendBoost(a.trendPhase);
  });

  return candidates.slice(0, limit);
}

export function buildModAuditRow(
  mod: ParsedConfigMod,
  history: HistoryPoint[],
  live: LiveModSnapshot | null,
  patchDate: string = REFORGER_PATCH_17,
  opts?: AuditBuildOptions
): ModAuditRow {
  const beforeAvg = avgPlayersInRange(history, '2026-05-02', patchDate);
  const afterAvg = avgPlayersInRange(history, patchDate, '2026-12-31');
  const currentPlayers = live?.totalPlayers ?? 0;
  const serverCount = live?.serverCount ?? 0;
  const trend = analyzeTrend(history, patchDate);
  const classified = classifyModAudit({ beforeAvg, afterAvg, currentPlayers, trend });

  const needsAlternatives =
    classified.status === 'dead' ||
    classified.status === 'risky' ||
    classified.status === 'warning';

  const alternatives =
    needsAlternatives && opts
      ? pickAlternatives(mod.modId, live, opts.modMap, opts.configIds, opts.historyFor)
      : [];

  return {
    modId: mod.modId,
    name: mod.name,
    beforeAvg,
    afterAvg,
    currentPlayers,
    serverCount,
    trendPhase: trend.phase,
    trendLabel: trend.label,
    trendDetail: trend.detail,
    recentAvg: trend.recentAvg,
    alternatives,
    ...classified,
  };
}

export function auditHighlights(rows: ModAuditRow[]) {
  return {
    rising: rows.filter((r) => r.trendPhase === 'rising' && (r.beforeAvg ?? 0) >= 10).slice(0, 8),
    recovering: rows.filter((r) => r.trendPhase === 'recovering').slice(0, 8),
    declining: rows
      .filter((r) => r.trendPhase === 'declining' && r.status !== 'niche')
      .slice(0, 8),
  };
}
