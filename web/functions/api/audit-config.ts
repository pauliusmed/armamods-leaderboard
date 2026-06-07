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
  serverCount?: number;
  /** BM popularity rank (lower = more players). 9999 = unranked. */
  overallRank?: number;
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
  name?: string;
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
  rankBefore: number | null;
  rankRecent: number | null;
}

export interface ModAuditRow {
  modId: string;
  name: string;
  status: AuditStatus;
  title: string;
  detail: string;
  beforeAvg: number | null;
  /** Avg players/day in first ~4 days after 1.7 – patch impact */
  earlyAfterAvg: number | null;
  /** Avg players/day from patch through today (includes recovery) */
  afterAvg: number | null;
  /** Drop %: before 1.7 → first days after patch */
  dropPct: number | null;
  currentPlayers: number;
  serverCount: number;
  trendPhase: TrendPhase;
  trendLabel: string;
  trendDetail: string;
  /** Last 7 days after patch – trend / recovery */
  recentAvg: number | null;
  rankBefore: number | null;
  rankRecent: number | null;
  /** Why not WARNING/dead – shown when status is ok / niche / risky */
  classificationHint: string | null;
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

/** Arma / BM mod GUID – always 16 hex chars (case-insensitive in files). */
export function isValidModId(id: string): boolean {
  return /^[0-9A-F]{16}$/.test(id.trim().toUpperCase());
}

/** Extract mods from free-form paste – only modId required; name optional. */
function extractModsFromText(text: string): ParsedConfigMod[] | null {
  const seen = new Set<string>();
  const names = new Map<string, string>();

  const withName =
    /"modId"\s*:\s*"([0-9a-fA-F]{16})"[\s\S]*?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = withName.exec(text))) {
    const modId = m[1].toUpperCase();
    names.set(modId, m[2].replace(/\\"/g, '"'));
  }

  const idPatterns = [
    /"modId"\s*:\s*"([0-9a-fA-F]{16})"/gi,
    /"id"\s*:\s*"([0-9a-fA-F]{16})"/gi,
    /\bmodId\s*[=:]\s*([0-9a-fA-F]{16})\b/gi,
  ];

  for (const re of idPatterns) {
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const modId = m[1].toUpperCase();
      if (!isValidModId(modId) || seen.has(modId)) continue;
      seen.add(modId);
    }
  }

  // Plain list: one 16-char hex per line (or audit report lines)
  for (const line of text.split(/\r?\n/)) {
    const hit = line.match(/\b([0-9a-fA-F]{16})\b/i);
    if (hit && isValidModId(hit[1])) seen.add(hit[1].toUpperCase());
  }

  if (!seen.size) return null;

  return [...seen].map((modId) => ({
    modId,
    name: names.get(modId) ?? modId,
  }));
}

/** Repair common copy-paste fragments into valid JSON before parse. */
function parseConfigJsonString(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty JSON');
  if (trimmed.startsWith('Rising') || trimmed.startsWith('Arma Reforger mod audit')) {
    throw new Error(
      'This looks like an audit report, not config.json. Paste your original server config.json, or use “Copy text report” after running an audit.'
    );
  }

  const extracted = extractModsFromText(trimmed);
  if (extracted) return extracted;

  const candidates = [trimmed];
  if (/"modId"\s*:/i.test(trimmed)) {
    let inner = trimmed
      .replace(/^\s*\}\s*,\s*/s, '')
      .replace(/^\s*,\s*/, '')
      .replace(/,\s*$/s, '');
    if (!inner.startsWith('[')) inner = `[${inner}]`;
    candidates.push(inner);
  }

  let lastErr: SyntaxError | null = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      if (e instanceof SyntaxError) lastErr = e;
    }
  }

  const fallback = extractModsFromText(trimmed);
  if (fallback) return fallback;

  throw new Error(
    `Invalid config.json: ${lastErr?.message ?? 'parse failed'}. Paste full config.json, or at least a mods[] fragment with modId + name.`
  );
}

export function parseModsFromRaw(modsRaw: unknown): ParsedConfigMod[] {
  if (!Array.isArray(modsRaw)) {
    throw new Error('Missing mods array (expected path: game.mods or a JSON array of mods)');
  }

  const seen = new Set<string>();
  const out: ParsedConfigMod[] = [];

  for (const m of modsRaw) {
    const row = m as Record<string, unknown>;
    const modId = String(row.modId ?? row.id ?? '')
      .trim()
      .toUpperCase();
    if (!isValidModId(modId) || seen.has(modId)) continue;
    seen.add(modId);
    out.push({
      modId,
      name: String(row.name ?? modId),
    });
  }

  if (!out.length) throw new Error('No valid modId found (expected 16 hex characters)');
  return out;
}

export function parseServerConfig(input: unknown): ParsedConfigMod[] {
  let data: unknown = input;
  if (typeof input === 'string') {
    data = parseConfigJsonString(input);
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    'modId' in (data[0] as object)
  ) {
    return parseModsFromRaw(data);
  }

  const root = data as Record<string, unknown>;
  const game = root?.game as Record<string, unknown> | undefined;
  const modsRaw = (game?.mods ?? root?.mods) as unknown;

  if (!Array.isArray(modsRaw)) {
    throw new Error('Missing mods array (expected path: game.mods or [...] array of mods)');
  }

  return parseModsFromRaw(modsRaw);
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

/** Average BM overall rank in range (lower = more popular). */
export function avgRankInRange(
  history: HistoryPoint[],
  from: string,
  to: string
): number | null {
  const pts = history.filter((h) => {
    const day = h.date || h.time || '';
    return day >= from && day < to;
  });
  const ranks = pts
    .map((h) => h.overallRank)
    .filter((r): r is number => r != null && r > 0 && r < 9999);
  if (!ranks.length) return null;
  return Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
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
  const rankBefore = avgRankInRange(history, '2026-05-02', patchDate);
  // Pirmos 4 dienos po patch – „smūgis“
  const earlyAfterAvg = avgPlayersInRange(history, patchDate, addDays(patchDate, 4));
  // Paskutinės dienos po patch (neperdengia su prieš-patch)
  const recentAvg =
    avgPlayersInRange(history, addDays(patchDate, 3), '2099-01-01') ??
    recentAvgFromHistory(history, 7, patchDate);
  const rankRecent =
    avgRankInRange(history, addDays(patchDate, 3), '2099-01-01') ??
    avgRankInRange(history, patchDate, '2099-01-01');

  const rankFields = { rankBefore, rankRecent };

  if (beforeAvg === null || recentAvg === null || history.length < 4) {
    return {
      phase: 'unknown',
      label: TREND_LABEL.unknown,
      detail: 'Not enough history points for trend analysis.',
      recentAvg,
      earlyAfterAvg,
      ...rankFields,
    };
  }

  const early = earlyAfterAvg ?? recentAvg;
  const retention = beforeAvg > 0 ? recentAvg / beforeAvg : 0;
  const rankHeld =
    rankBefore != null && rankRecent != null && rankRecent <= rankBefore * 1.25;

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
      detail: `After 1.7 update dipped to ~${early} players/day (first days); last 7 days ~${recentAvg} – recovering.`,
      recentAvg,
      earlyAfterAvg: early,
      ...rankFields,
    };
  }

  // Visas Reforger BM sumažėjo po 1.7 – modas dar populiarus, absoliutus skaičius mažesnis (ne recovering)
  if (
    beforeAvg >= 50 &&
    recentAvg >= 30 &&
    retention >= 0.1 &&
    recentAvg < beforeAvg * 0.55 &&
    recentAvg <= early * 1.15 &&
    (rankHeld || retention >= 0.12)
  ) {
    const rankNote =
      rankBefore != null && rankRecent != null
        ? ` BM rank ~#${rankRecent} (was ~#${rankBefore}).`
        : '';
    return {
      phase: 'stable',
      label: 'Ecosystem dip after 1.7',
      detail:
        `Absolute players down (~${beforeAvg}→~${recentAvg}/day) – most servers have not returned to pre-patch levels yet;` +
        ` this mod still has real usage, not a solo crash.${rankNote}`,
      recentAvg,
      earlyAfterAvg: early,
      ...rankFields,
    };
  }

  // Kyla: po patch ne blogiau nei prieš arba aiškus augimas
  if (recentAvg >= beforeAvg * 0.85 || (recentAvg > early * 1.4 && recentAvg >= 25)) {
    return {
      phase: 'rising',
      label: TREND_LABEL.rising,
      detail: `Usage is growing or holding steady (~${recentAvg} players/day in the last 7 days).`,
      recentAvg,
      earlyAfterAvg: early,
      ...rankFields,
    };
  }

  // Krenta toliau – mod-specific (ne tik bendras 1.7 dip)
  if (
    recentAvg < early * 0.85 &&
    beforeAvg > recentAvg * 1.25 &&
    !(recentAvg >= 25 && rankBefore != null && rankRecent != null && rankRecent > rankBefore * 1.5)
  ) {
    return {
      phase: 'declining',
      label: TREND_LABEL.declining,
      detail: `Losing share vs other mods: ~${early}/day after update → ~${recentAvg}/day last 7 days` +
        (rankBefore != null && rankRecent != null
          ? ` (rank ~#${rankBefore}→~#${rankRecent}).`
          : '.'),
      recentAvg,
      earlyAfterAvg: early,
      ...rankFields,
    };
  }

  return {
    phase: 'stable',
    label: TREND_LABEL.stable,
    detail: 'No major change between post-1.7 update window and the last 7 days.',
    recentAvg,
    earlyAfterAvg: early,
    ...rankFields,
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MIN_SIGNAL_AVG = 15;
/**
 * On BattleMetrics scale, 0 and “a few” players/day are the same bucket – not a living mod.
 */
const EFFECTIVELY_EMPTY_MAX = 10;
const DEAD_AFTER_MAX = 3;
/** Mod still on N BM server configs but 0 players – likely broken / stale config after 1.7 */
const GHOST_DEPLOYMENT_MIN_SERVERS = 3;
/** Now on BM: 0–1 players = dead mod for server owners (same bucket as “nobody plays”) */
const ZERO_NOW_BROKEN_MAX = 1;
/** Recent avg players/day – recovery is real when the ecosystem is coming back */
const MIN_RECOVERY_RECENT = 10;

function isEffectivelyEmpty(players: number): boolean {
  return players <= EFFECTIVELY_EMPTY_MAX;
}

/**
 * Mod was hurt by 1.7: empty right after the update and/or still empty (0 ≈ handful).
 * Does not flag mods that dipped then recovered (high last-7-days avg).
 */
function isDamagedAfter17Update(trend: TrendInsight, currentPlayers: number): boolean {
  const early = trend.earlyAfterAvg;
  const recent = trend.recentAvg;

  const hitByPatch = early !== null && isEffectivelyEmpty(early);
  const stillEmpty =
    (recent !== null && isEffectivelyEmpty(recent) && isEffectivelyEmpty(currentPlayers)) ||
    (recent === null && isEffectivelyEmpty(currentPlayers));

  if (!hitByPatch && !stillEmpty) return false;

  // Recovered since patch window – ecosystem came back
  if (recent !== null && recent > EFFECTIVELY_EMPTY_MAX * 2) return false;
  if (trend.phase === 'recovering' && (recent ?? 0) >= MIN_RECOVERY_RECENT) return false;
  if (trend.phase === 'rising' && (recent ?? 0) >= 15) return false;

  return hitByPatch || stillEmpty;
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

/** 0 players now but mod still on multiple BM server lists – typical stale/broken 1.7 config. */
function isGhostBrokenAfter17(
  serverCount: number,
  currentPlayers: number,
  trend: TrendInsight
): boolean {
  return (
    serverCount >= GHOST_DEPLOYMENT_MIN_SERVERS &&
    currentPlayers <= DEAD_AFTER_MAX &&
    trend.phase !== 'recovering'
  );
}

export function classifyModAudit(params: {
  beforeAvg: number | null;
  afterAvg: number | null;
  currentPlayers: number;
  serverCount?: number;
  trend: TrendInsight;
}): Pick<ModAuditRow, 'status' | 'title' | 'detail' | 'dropPct'> {
  const { beforeAvg, afterAvg, currentPlayers, serverCount = 0, trend } = params;

  if (beforeAvg === null || afterAvg === null) {
    return {
      status: 'unknown',
      title: 'No history',
      detail: 'Not enough daily data before/after 1.7 to assess this mod.',
      dropPct: null,
    };
  }

  const early = trend.earlyAfterAvg;
  const rankBefore = trend.rankBefore;
  const rankRecent = trend.rankRecent;

  let dropPct: number | null = null;
  if (
    rankBefore !== null &&
    rankRecent !== null &&
    rankBefore !== undefined &&
    rankRecent !== undefined &&
    rankBefore > 0 &&
    rankRecent > 0 &&
    rankBefore < 9999 &&
    rankRecent < 9999
  ) {
    // Zipf popularity weight drop: 1 - (rankBefore / rankRecent)
    // Capped at 0 to avoid negative percentage on popularity gain
    dropPct = Math.max(0, Math.round((1 - rankBefore / rankRecent) * 100));
  } else {
    dropPct =
      beforeAvg > 0 && early !== null
        ? Math.round(((beforeAvg - early) / beforeAvg) * 100)
        : beforeAvg > 0
          ? Math.round(((beforeAvg - afterAvg) / beforeAvg) * 100)
          : afterAvg === 0
            ? 100
            : 0;
  }

  if (beforeAvg < MIN_SIGNAL_AVG) {
    return {
      status: 'niche',
      title: 'Niche mod',
      detail: `Avg. <${MIN_SIGNAL_AVG} players before 1.7 – drop may be noise, not a broken mod.`,
      dropPct,
    };
  }

  if (trend.label === 'Ecosystem dip after 1.7' && !isEffectivelyEmpty(currentPlayers)) {
    return {
      status: 'ok',
      title: 'Popular – network-wide dip after 1.7',
      detail:
        `${trend.detail} Absolute −${dropPct}% vs pre-patch is normal while the whole BM player base is still down; compare rank, not only raw players.`,
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

  const patchWindowAvg = early ?? trend.recentAvg ?? afterAvg;

  // Popular before 1.7, effectively empty after patch
  if (isDamagedAfter17Update(trend, currentPlayers)) {
    const isGhostDead = isGhostBrokenAfter17(serverCount, currentPlayers, trend);

    const isZeroNowBroken =
      currentPlayers <= ZERO_NOW_BROKEN_MAX && trend.phase !== 'recovering';

    // −70%+ and effectively empty now (0 ≈ few/day on BM) → broken
    const isSevereDropBroken =
      (dropPct ?? 0) >= 70 &&
      isEffectivelyEmpty(currentPlayers) &&
      trend.phase !== 'recovering';

    if (isGhostDead || isZeroNowBroken || isSevereDropBroken) {
      const detail = isGhostDead
        ? `Still on ~${serverCount} BattleMetrics server configs but ${currentPlayers} players now – ` +
          'likely broken with 1.7 (stale config, no restart, or outdated Workshop build). Remove from config and check RPT.'
        : isZeroNowBroken && !isSevereDropBroken
          ? `~${beforeAvg} players/day before 1.7, now ${currentPlayers} on BM after update ` +
            `(last 7d ~${trend.recentAvg ?? '—'}/day). Nobody plays this mod – treat as broken for 1.7.`
          : `~${beforeAvg} players/day before 1.7 → ~${early ?? patchWindowAvg ?? 0}/day after update, ` +
            `~${trend.recentAvg ?? 0}/day last 7 days, ${currentPlayers} now (−${dropPct}% on BM). Ecosystem no longer runs this mod.`;

      return {
        status: 'dead',
        title: 'Broken after 1.7',
        detail,
        dropPct,
      };
    }

    return {
      status: 'warning',
      title: 'Empty after 1.7 – monitor',
      detail:
        `Had ~${beforeAvg} players/day before 1.7. After update ~${early ?? '—'}/day, ` +
        `~${trend.recentAvg ?? '—'}/day last 7 days, ${currentPlayers} now. Drop −${dropPct}% – not conclusive yet. ` +
        (serverCount > 0
          ? `On ~${serverCount} BM servers – verify Workshop 1.7, restart, RPT.`
          : 'Check Workshop 1.7 and server logs.'),
      dropPct,
    };
  }

  // Still on servers after 1.7 but usage fell hard (not a “empty after” case)
  if (dropPct >= 55 && !isEffectivelyEmpty(currentPlayers)) {
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
      !isEffectivelyEmpty(currentPlayers)
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

/** Display name from reforgermods DB – never trust config.json names (often wrong/outdated). */
export function resolveModDisplayName(
  modId: string,
  live: LiveModSnapshot | null,
  modMap?: Map<string, LiveModSnapshot & { name?: string }>
): string {
  const fromLive = live?.name?.trim();
  if (fromLive) return fromLive;
  const fromMap = modMap?.get(modId.toUpperCase())?.name?.trim();
  if (fromMap) return fromMap;
  return modId;
}

export function buildModAuditRow(
  mod: ParsedConfigMod,
  history: HistoryPoint[],
  live: LiveModSnapshot | null,
  patchDate: string = REFORGER_PATCH_17,
  opts?: AuditBuildOptions
): ModAuditRow {
  const beforeAvg = avgPlayersInRange(history, '2026-05-02', patchDate);
  const earlyAfterAvg = avgPlayersInRange(history, patchDate, addDays(patchDate, 4));
  const afterAvg = avgPlayersInRange(history, patchDate, '2026-12-31');
  const currentPlayers = live?.totalPlayers ?? 0;
  const serverCount = live?.serverCount ?? 0;
  const trend = analyzeTrend(history, patchDate);
  const classified = classifyModAudit({
    beforeAvg,
    afterAvg,
    currentPlayers,
    serverCount,
    trend,
  });

  const needsAlternatives =
    classified.status === 'dead' ||
    classified.status === 'risky' ||
    classified.status === 'warning';

  const alternatives =
    needsAlternatives && opts
      ? pickAlternatives(mod.modId, live, opts.modMap, opts.configIds, opts.historyFor)
      : [];

  return withClassificationHint({
    modId: mod.modId,
    name: resolveModDisplayName(mod.modId, live, opts?.modMap),
    beforeAvg,
    earlyAfterAvg,
    afterAvg,
    currentPlayers,
    serverCount,
    trendPhase: trend.phase,
    trendLabel: trend.label,
    trendDetail: trend.detail,
    recentAvg: trend.recentAvg,
    rankBefore: trend.rankBefore,
    rankRecent: trend.rankRecent,
    alternatives,
    ...classified,
    classificationHint: null,
  });
}

function withClassificationHint(row: ModAuditRow): ModAuditRow {
  return {
    ...row,
    classificationHint: buildClassificationHint(row),
  };
}

const STATUS_SORT_WORST_FIRST: Record<AuditStatus, number> = {
  dead: 0,
  risky: 1,
  warning: 2,
  unknown: 3,
  ok: 4,
  niche: 5,
};

/**
 * Worst mods first: 0 on BM now → highest −% drop → status → empty last 7d → was popular before 1.7.
 */
export function compareAuditRowsWorstFirst(a: ModAuditRow, b: ModAuditRow): number {
  const zeroNowA = a.currentPlayers === 0 ? 0 : 1;
  const zeroNowB = b.currentPlayers === 0 ? 0 : 1;
  if (zeroNowA !== zeroNowB) return zeroNowA - zeroNowB;

  const byDrop = (b.dropPct ?? -1) - (a.dropPct ?? -1);
  if (byDrop !== 0) return byDrop;

  const byStatus =
    (STATUS_SORT_WORST_FIRST[a.status] ?? 9) - (STATUS_SORT_WORST_FIRST[b.status] ?? 9);
  if (byStatus !== 0) return byStatus;

  const recentA = a.recentAvg ?? Number.MAX_SAFE_INTEGER;
  const recentB = b.recentAvg ?? Number.MAX_SAFE_INTEGER;
  if (recentA !== recentB) return recentA - recentB;

  return (b.beforeAvg ?? 0) - (a.beforeAvg ?? 0);
}

export function sortAuditRowsWorstFirst<T extends ModAuditRow>(rows: T[]): T[] {
  return [...rows].sort(compareAuditRowsWorstFirst);
}

function modPopularityScore(r: ModAuditRow): number {
  return Math.max(r.recentAvg ?? 0, r.currentPlayers, r.afterAvg ?? 0);
}

/** Plain-language reason when a mod is not WARNING/dead (helps explain edge cases). */
export function buildClassificationHint(
  row: Pick<
    ModAuditRow,
    | 'status'
    | 'beforeAvg'
    | 'earlyAfterAvg'
    | 'recentAvg'
    | 'currentPlayers'
    | 'trendPhase'
    | 'trendLabel'
  >
): string | null {
  if (row.status === 'dead' || row.status === 'warning') return null;

  const before = row.beforeAvg ?? 0;
  const early = row.earlyAfterAvg;
  const recent = row.recentAvg;

  if (before < MIN_SIGNAL_AVG) {
    return `Not WARNING: only ~${before} players/day before 1.7 (under ${MIN_SIGNAL_AVG} on BM – counted as niche, not a mass-market drop).`;
  }
  if (early !== null && early > EFFECTIVELY_EMPTY_MAX) {
    return `Not WARNING: ~${early}/day right after the 1.7 update – still had ecosystem traffic (not “empty after patch”).`;
  }
  if (recent !== null && recent > EFFECTIVELY_EMPTY_MAX * 2) {
    return `Not WARNING: ~${recent}/day in the last 7 days – looks recovered compared to the first days after 1.7.`;
  }
  if (row.trendPhase === 'recovering' || row.trendPhase === 'rising') {
    return `Not WARNING: trend “${row.trendLabel}” – servers are bringing usage back.`;
  }
  if (row.status === 'risky') {
    return `RISKY (not WARNING): ~${row.currentPlayers} players on BM now – dropped but not empty.`;
  }
  if (!isEffectivelyEmpty(row.currentPlayers) && (recent === null || !isEffectivelyEmpty(recent))) {
    return `OK: still active on BM (now ${row.currentPlayers}, last 7d ~${recent ?? '—'}).`;
  }
  return null;
}

export function auditDiscovery(rows: ModAuditRow[]) {
  const MIN_GEM_POPULARITY = 25;

  const gems = rows
    .filter(
      (r) =>
        r.status === 'ok' &&
        (r.trendPhase === 'rising' || r.trendPhase === 'recovering') &&
        modPopularityScore(r) >= MIN_GEM_POPULARITY
    )
    .sort((a, b) => modPopularityScore(b) - modPopularityScore(a))
    .slice(0, 15);

  const risingPopular = rows
    .filter((r) => r.trendPhase === 'rising' && modPopularityScore(r) >= MIN_GEM_POPULARITY)
    .sort((a, b) => modPopularityScore(b) - modPopularityScore(a))
    .slice(0, 12);

  const trash = sortAuditRowsWorstFirst(
    rows.filter(
      (r) =>
        r.status === 'dead' ||
        r.status === 'warning' ||
        (r.status === 'risky' &&
          (r.trendPhase === 'declining' || isEffectivelyEmpty(r.currentPlayers)))
    )
  ).slice(0, 15);

  return { gems, trash, risingPopular };
}

export function auditHighlights(rows: ModAuditRow[]) {
  const discovery = auditDiscovery(rows);
  return {
    rising: rows.filter((r) => r.trendPhase === 'rising' && (r.beforeAvg ?? 0) >= 10).slice(0, 8),
    recovering: rows.filter((r) => r.trendPhase === 'recovering').slice(0, 8),
    declining: rows
      .filter((r) => r.trendPhase === 'declining' && r.status !== 'niche')
      .slice(0, 8),
    ...discovery,
  };
}
