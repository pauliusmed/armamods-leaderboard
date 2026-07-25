/**
 * Daily server modlist change tracking.
 * Stores only non-empty diffs; fingerprint is id sets (names resolved at diff time).
 */

export const MODPACK_DIFF_RETENTION_DAYS = 30;
/** Skip false "mass removed" when BM returns an incomplete listing. */
export const SUSPICIOUS_DROP_RATIO = 0.3;
export const SUSPICIOUS_DROP_MIN_PREV = 10;

export type ModChangeRef = { id: string; name: string };

export type ServerModDiff = {
  a: ModChangeRef[];
  r: ModChangeRef[];
};

export type ModpackDiffDay = {
  time: string;
  servers: Record<string, ServerModDiff>;
};

/** Previous-day mod id sets used to compute the next daily diff. */
export type ModsetFingerprint = {
  date: string;
  servers: Record<string, string[]>;
};

export function modpackDiffKeys(game: 'reforger' | 'arma3') {
  return {
    fingerprint: `cache:server_modset:${game}`,
    history: `history:modpack_diff:${game}`,
  };
}

export function normalizeModIds(mods: Array<{ id?: string | null } | string>): string[] {
  const set = new Set<string>();
  for (const m of mods) {
    const id = (typeof m === 'string' ? m : String(m?.id ?? '')).trim();
    if (!id || id === '0') continue;
    set.add(id);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Incomplete BM listings often drop to 0 or a small fraction of mods.
 * Treat those as unreliable so we do not emit a huge "removed" event.
 */
export function isSuspiciousModlistDrop(previousIds: string[], currentIds: string[]): boolean {
  if (previousIds.length === 0) return false;
  if (currentIds.length === 0) return true;
  if (
    previousIds.length >= SUSPICIOUS_DROP_MIN_PREV &&
    currentIds.length < previousIds.length * SUSPICIOUS_DROP_RATIO
  ) {
    return true;
  }
  return false;
}

export function diffModIds(
  previousIds: string[],
  currentIds: string[],
  nameById: Map<string, string>
): ServerModDiff | null {
  if (isSuspiciousModlistDrop(previousIds, currentIds)) return null;

  const prev = new Set(previousIds);
  const curr = new Set(currentIds);
  const a: ModChangeRef[] = [];
  const r: ModChangeRef[] = [];

  for (const id of curr) {
    if (!prev.has(id)) {
      a.push({ id, name: nameById.get(id) || id });
    }
  }
  for (const id of prev) {
    if (!curr.has(id)) {
      r.push({ id, name: nameById.get(id) || id });
    }
  }

  if (a.length === 0 && r.length === 0) return null;

  a.sort((x, y) => x.id.localeCompare(y.id));
  r.sort((x, y) => x.id.localeCompare(y.id));
  return { a, r };
}

export type ServerModChangesEntry = {
  date: string;
  added: ModChangeRef[];
  removed: ModChangeRef[];
};

/** Slice ring for one server, newest first, within the last `days` calendar days. */
export function extractServerModChanges(
  history: ModpackDiffDay[],
  serverId: string,
  days: number
): ServerModChangesEntry[] {
  const windowDays = Math.min(MODPACK_DIFF_RETENTION_DAYS, Math.max(1, Math.floor(days)));
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const out: ServerModChangesEntry[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const day = history[i];
    if (!day?.time || !day.servers) continue;
    const dayMs = Date.parse(`${day.time}T12:00:00Z`);
    if (Number.isFinite(dayMs) && dayMs < cutoffMs) continue;
    const diff = day.servers[serverId];
    if (!diff) continue;
    const added = Array.isArray(diff.a) ? diff.a : [];
    const removed = Array.isArray(diff.r) ? diff.r : [];
    if (added.length === 0 && removed.length === 0) continue;
    out.push({ date: day.time, added, removed });
  }

  return out;
}

export type BuildDayResult = {
  day: ModpackDiffDay;
  changedServers: number;
  skippedSuspicious: number;
};

/** Compare current server mod sets against fingerprint; omit empty / suspicious rows. */
export function buildModpackDiffDay(
  today: string,
  previous: ModsetFingerprint | null | undefined,
  currentServers: Record<string, string[]>,
  nameById: Map<string, string>
): BuildDayResult | null {
  if (!previous?.servers || !previous.date) return null;
  if (previous.date === today) return null;

  const servers: Record<string, ServerModDiff> = {};
  let changedServers = 0;
  let skippedSuspicious = 0;

  for (const [serverId, currIds] of Object.entries(currentServers)) {
    const prevIds = previous.servers[serverId] ?? [];
    if (isSuspiciousModlistDrop(prevIds, currIds)) {
      skippedSuspicious++;
      continue;
    }
    const diff = diffModIds(prevIds, currIds, nameById);
    if (!diff) continue;
    servers[serverId] = diff;
    changedServers++;
  }

  return {
    day: { time: today, servers },
    changedServers,
    skippedSuspicious,
  };
}

export function appendModpackDiffDay(
  history: ModpackDiffDay[],
  day: ModpackDiffDay,
  retention = MODPACK_DIFF_RETENTION_DAYS
): ModpackDiffDay[] {
  const next = history.filter((h) => h.time !== day.time);
  next.push(day);
  return next.slice(-retention);
}
