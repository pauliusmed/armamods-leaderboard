import type { ShareGame } from './share-meta';

// ──────────────────────────────────────────────
// Mod fields bundle — vienas KV raktas visiems modams.
//
// Problema: /api/mods non-default kelias (paieška/filtras/sort) ir author
// fallback skaitė po 2–3 raktus KIEKVIENAM modui (limit 24 → ~50 reads,
// limit 100 → ~200 reads per requestą). Naudotojų matoma tas pati informacija
// (author/thumbnail/workshopStatus) gyvena ~22k mažų raktų.
//
// Sprendimas: kolektorius kas run'ą rašo vieną agreguotą JSON; workeris
// skaito 1 raktą ir pritaiko in-memory. Tarpas tarp deploy ir pirmo
// kolektoriaus run'o padengiamas fallback'u į senus per-mod raktus.
// ──────────────────────────────────────────────

export interface ModFieldsEntry {
  /** author */
  a?: string | null;
  /** thumbnail (og-image) URL */
  t?: string | null;
  /** workshop status */
  s?: 'available' | 'unavailable' | 'unknown';
  /** workshop status checkedAt (ISO) */
  c?: string | null;
}

export interface ModFieldsBundle {
  generatedAt: string;
  mods: Record<string, ModFieldsEntry>;
}

export interface ModFieldsSourceRow {
  id: string;
  author?: string | null;
  thumbnail?: string | null;
  workshopStatus?: string | null;
  workshopStatusCheckedAt?: string | null;
}

export const MOD_FIELDS_BUNDLE_TTL_SECONDS = 90000; // 25h — kolektorius bėga kas valandą

export function modFieldsBundleCacheKey(game: ShareGame): string {
  return `cache:bundle:modfields:${String(game).toLowerCase()}`;
}

// Workerio izoliato atmintis: bundle'as kol kas nesikeičia greičiau nei kas
// valandą, o Cache API atsakymai (300–900s) vis tiek dominuoja freshness —
// 5 min modulio cache'as saugus ir atima KV read'us net Cache API miss metu.
const MODULE_CACHE_TTL_MS = 5 * 60 * 1000;
let moduleCache: { at: number; data: ModFieldsBundle } | null = null;

export async function loadModFieldsBundle(kv: KVNamespace): Promise<ModFieldsBundle | null> {
  if (moduleCache && Date.now() - moduleCache.at < MODULE_CACHE_TTL_MS) {
    return moduleCache.data;
  }
  const raw = await kv.get(modFieldsBundleCacheKey('reforger'), 'json') as ModFieldsBundle | null;
  if (raw && raw.mods && Object.keys(raw.mods).length > 0) {
    moduleCache = { at: Date.now(), data: raw };
    return raw;
  }
  return null;
}

/** Testams / kolektoriui — išvalyti modulio cache'ą. */
export function clearModFieldsModuleCache(): void {
  moduleCache = null;
}

function toEntry(row: ModFieldsSourceRow): ModFieldsEntry {
  const entry: ModFieldsEntry = {};
  if (row.author !== undefined) entry.a = row.author;
  if (row.thumbnail !== undefined) entry.t = row.thumbnail;
  if (row.workshopStatus !== undefined) {
    if (row.workshopStatus === 'available' || row.workshopStatus === 'unavailable') {
      entry.s = row.workshopStatus;
    } else {
      entry.s = 'unknown';
    }
    entry.c = row.workshopStatusCheckedAt ?? null;
  }
  return entry;
}

/**
 * Merge šaltinius į bundle: naujesnis šaltinis perrašo tik tuos laukus,
 * kuriuos realiai turi (undefined = „šį run'ą nežinau" — sena reikšmė lieka).
 */
export function buildModFieldsBundle(
  sources: ModFieldsSourceRow[],
  existing: ModFieldsBundle | null
): ModFieldsBundle {
  const mods: Record<string, ModFieldsEntry> = existing ? { ...existing.mods } : {};
  for (const row of sources) {
    if (!row?.id) continue;
    const id = String(row.id).toUpperCase();
    const fresh = toEntry(row);
    const prev = mods[id];
    if (!prev) {
      mods[id] = fresh;
      continue;
    }
    const merged: ModFieldsEntry = { ...prev };
    for (const k of Object.keys(fresh) as Array<keyof ModFieldsEntry>) {
      if (fresh[k] !== undefined && fresh[k] !== prev[k]) {
        (merged as Record<string, unknown>)[k] = fresh[k];
      }
    }
    mods[id] = merged;
  }
  return { generatedAt: new Date().toISOString(), mods };
}

/**
 * Pritaikyti bundle laukus sąrašo eilutėms (tiek /api/mods page, tiek
 * author-fallback paieškai). Tinka ir workerio, ir kolektoriaus precompute.
 */
export function applyModFieldsToRows(
  bundle: ModFieldsBundle,
  rows: Array<{ id: string; author?: string | null; thumbnail?: string | null; workshopStatus?: string; workshopStatusCheckedAt?: string | null }>
): number {
  let applied = 0;
  for (const row of rows) {
    if (!row?.id) continue;
    const entry = bundle.mods[String(row.id).toUpperCase()];
    if (!entry) continue;
    if (row.author === undefined && entry.a !== undefined) { row.author = entry.a; applied++; }
    if (row.thumbnail === undefined && entry.t !== undefined) { row.thumbnail = entry.t; applied++; }
    if (row.workshopStatus === undefined && entry.s !== undefined) {
      row.workshopStatus = entry.s;
      row.workshopStatusCheckedAt = entry.c ?? null;
      applied++;
    }
  }
  return applied;
}
