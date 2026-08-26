import type { ShareGame } from './share-meta';

// ──────────────────────────────────────────────
// Precomputed pages — „bendras šildymas“ (compute-at-write).
//
// Kolektorius valandinio cron metu iš KV jau turimų duomenų
// surenka gatavus default view puslapius ir rašo juos į atskirus
// KV raktus. Workeris default užklausai skaito 1 raktą vietoj
// ~76 (chunk + alias + 75 field read'ų). KV yra globalus, todėl
// šiltas visiems PoP iš karto.
// ──────────────────────────────────────────────

/** Reikšmės turi atitikti web/src/hooks/useMods.ts:73 ir web/src/hooks/useServers.ts. */
export const PRECOMPUTED_MODS_PAGE_SIZE = 24;
export const PRECOMPUTED_MODS_PAGES = 4; // 96 įrašai — 90% default srauto
export const PRECOMPUTED_MODS_SIZE = PRECOMPUTED_MODS_PAGE_SIZE * PRECOMPUTED_MODS_PAGES;
export const PRECOMPUTED_SERVERS_SIZE = 200; // serversApi.getList(200, 0, ...) default

/** KV rakto galiojimas. Kolektorius bėga ~1x/val, todėl 2 val toleruoja 1 praleistą run. */
export const PRECOMPUTED_TTL_SECONDS = 7200;

function canonGame(game: ShareGame): string {
  return String(game ?? 'reforger').toLowerCase();
}

export function precomputedModsCacheKey(game: ShareGame): string {
  return `cache:page:mods:${canonGame(game)}:default`;
}

export function precomputedServersCacheKey(game: ShareGame): string {
  return `cache:page:servers:${canonGame(game)}:default`;
}

export function precomputedStatsCacheKey(game: ShareGame): string {
  return `cache:page:stats:${canonGame(game)}`;
}

export interface PrecomputedPageHeader {
  generatedAt: string;
  pages: number;
  pageSize: number;
  total: number;
}

export interface PrecomputedModsPayload {
  header: PrecomputedPageHeader;
  /** Iš anksto surinkti mod įrašai (su author/thumbnail/workshopStatus), rikiuoti rank asc. */
  mods: Array<Record<string, unknown>>;
}

export interface PrecomputedServersPayload {
  header: PrecomputedPageHeader;
  servers: Array<Record<string, unknown>>;
}

export interface PrecomputedStatsPayload {
  generatedAt: string;
  totalMods: number;
  totalPlayers: number;
  totalServers: number;
}

/**
 * Ar ši /api/mods užklausa atitinka precompute geometriją:
 * - tik Reforger default view (overall asc, be paieškos/filtravimo),
 * - limit=24, offset 24-aligned, telpa į precomputed langą.
 *
 * Non-default kelias → null (fallback).
 */
export function precomputedModsSliceParams(query: {
  game: string;
  sortBy: string;
  sortDir: string;
  search: string;
  playerFilter: string;
  limit: number;
  offset: number;
}): { pageIndex: number; offset: number; limit: number } | null {
  if (canonGame(query.game as ShareGame) !== 'reforger') return null;
  if (query.search.trim() !== '' || query.playerFilter !== 'all') return null;
  const sortBy = String(query.sortBy ?? 'overall').toLowerCase();
  if (sortBy !== 'overall' || query.sortDir !== 'asc') return null;
  if (query.limit !== PRECOMPUTED_MODS_PAGE_SIZE) return null;
  if (query.offset % PRECOMPUTED_MODS_PAGE_SIZE !== 0) return null;
  const pageIndex = query.offset / PRECOMPUTED_MODS_PAGE_SIZE;
  if (pageIndex < 0 || pageIndex >= PRECOMPUTED_MODS_PAGES) return null;
  return { pageIndex, offset: query.offset, limit: query.limit };
}

export function precomputedServersParams(query: {
  game: string;
  search: string;
  limit: number;
  offset: number;
  full?: boolean;
}): boolean {
  if (canonGame(query.game as ShareGame) !== 'reforger') return false;
  if (query.search.trim() !== '' || query.full) return false;
  return query.limit === PRECOMPUTED_SERVERS_SIZE && query.offset === 0;
}
