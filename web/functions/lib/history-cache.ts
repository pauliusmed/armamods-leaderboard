/**
 * Per-entity history materializavimas R2 (read-through cache).
 *
 * Istorijos endpointai šiuo metu skaito visus KV shardus. Po pirmo requesto
 * po collector run rezultatas įrašomas kaip vienas R2 objektas; kiti to paties
 * entity + query varianto requestai skaito 1 R2 `get`. Jei objekto nėra arba
 * versija pasenusi — grįžtama į seną KV scan kelią (dokumentuotas fallback).
 */

export type EntityHistoryKind = 'mod-history' | 'server-history' | 'mod-changes';

/** Minimali R2 sąsaja — tenkina ir R2Bucket, ir testų fake. */
export interface HistoryBucketObject {
  json<T>(): Promise<T>;
}

export interface HistoryBucket {
  get(key: string): Promise<HistoryBucketObject | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

export interface MaterializedEntityHistory<T> {
  version: string;
  generatedAt: string;
  data: T;
}

const KEY_PREFIX = 'history/v1';

/**
 * Deterministiškas R2 raktas. `variant` atskiria tuos pačius entity su
 * skirtingais query parametrais (pvz., daily vs weekly, 30 vs 366 d.).
 */
export function entityHistoryObjectKey(
  game: string,
  kind: EntityHistoryKind,
  variant: string,
  id: string
): string {
  return `${KEY_PREFIX}/${game}/${kind}/${encodeURIComponent(variant)}/${encodeURIComponent(id)}.json`;
}

/**
 * Grąžina materializuotą `data`, jei objektas egzistuoja IR jo versija atitinka.
 * Kitu atveju grąžina `null` — caller'is krenta į KV scan.
 */
export async function readMaterializedEntityHistory<T>(
  bucket: HistoryBucket | undefined,
  key: string,
  version: string | null
): Promise<T | null> {
  if (!bucket || !version) return null;
  try {
    const object = await bucket.get(key);
    if (!object) return null;
    const payload = await object.json<MaterializedEntityHistory<T>>();
    if (!payload || payload.version !== version) return null;
    return payload.data;
  } catch (error) {
    console.warn(`[HISTORY_R2] read failed for ${key}:`, error);
    return null;
  }
}

/** Įrašo materializuotą reikšmę. Be bucket/version — no-op. Klaidos — warning, ne crash. */
export async function writeMaterializedEntityHistory<T>(
  bucket: HistoryBucket | undefined,
  key: string,
  version: string | null,
  data: T
): Promise<void> {
  if (!bucket || !version) return;
  try {
    await bucket.put(
      key,
      JSON.stringify({ version, generatedAt: new Date().toISOString(), data } satisfies MaterializedEntityHistory<T>),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (error) {
    console.warn(`[HISTORY_R2] write failed for ${key}:`, error);
  }
}
