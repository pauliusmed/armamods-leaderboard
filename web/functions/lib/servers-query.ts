/**
 * /api/servers limit + kešo politika.
 *
 * KODĖL: paieškos kelias (`search=`) skaito VISUS serverių shard'us per
 * `collectChunkedMatches` (16 × ~5 MB, serializuota `withFullScanSlot`). Su
 * `limit=5000` atsakymas siekė ~25 MB, o `GET /api/servers` CPU p99 buvo
 * 1 194 ms (Workers Observability, 2026-10-14→10-20) — didžiausias worker'yje.
 * Todėl:
 *   1) paieška ribojama 500 eilučių (UI vis tiek rodo 24/puslapį),
 *   2) paieškos atsakymas kešuojamas 900 s — duomenys keičiasi tik po
 *      kolektoriaus run'o (~kas 2 h), tad 300 s buvo per griežta.
 * `full=1` (admin/planner puslapiai) išlieka 5000 — ten sąmoningai reikia viso rinkinio.
 */

export const SERVERS_DEFAULT_LIMIT = 100;
export const SERVERS_LIST_LIMIT_CAP = 500;
export const SERVERS_SEARCH_LIMIT_CAP = 500;
export const SERVERS_FULL_LIMIT_CAP = 5000;

export const SERVERS_LIST_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
export const SERVERS_SEARCH_CACHE_CONTROL = 'public, max-age=900, stale-while-revalidate=3600';

export interface ServersLimitInput {
  full: boolean;
  search: string;
  /** `parseInt(c.req.query('limit'))` — gali būti NaN. */
  requestedLimit: number;
}

/**
 * Efektyvus `limit`. Ne NaN, ne mažiau 1, ne daugiau nei kelio cap'as:
 * `full` → 5000, paieška / default → 500.
 */
export function resolveServersLimit(input: ServersLimitInput): number {
  const requested = Number.isFinite(input.requestedLimit)
    ? input.requestedLimit
    : SERVERS_DEFAULT_LIMIT;
  const cap = input.full ? SERVERS_FULL_LIMIT_CAP : SERVERS_LIST_LIMIT_CAP;
  const bounded = Math.min(Math.max(Math.trunc(requested), 1), cap);
  return bounded;
}

/** Paieškos atsakymai gyvena ilgiau — juos generuoja brangiausias kelias. */
export function serversCacheControl(search: string): string {
  return search.trim() ? SERVERS_SEARCH_CACHE_CONTROL : SERVERS_LIST_CACHE_CONTROL;
}
