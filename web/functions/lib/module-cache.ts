/**
 * Module-level TTL cache for small, write-rarely KV values.
 *
 * KV analytics rodo, kad brangiausi reads yra tie patys `meta`/indeksų raktai,
 * skaitomi kiekviename requeste (health — 8 raktai, server lookup — index +
 * meta, chunked data — meta). Šis helper'is laiko juos Worker'io izoliato
 * atmintyje trumpą TTL, todėl pakartotiniai requestai nebekartoja KV read'ų.
 *
 * Saugumas: talpinami tik maži agreguoti objektai (meta, indeksai). Dideli
 * shard'ai/history blokai čia NEDEDAMI — jiems naudojamas Cache API.
 */

type CacheEntry<T> = { at: number; promise: Promise<T> };

const DEFAULT_MAX_ENTRIES = 200;
const store = new Map<string, CacheEntry<unknown>>();

/**
 * Grąžina cache'intą reikšmę arba įkelia per `loader`.
 * Pasikartojantys kvietimai tame pačiame izoliate dalinasi vienu Promise'u,
 * todėl nėra stampede ir nėra kelių lygiagrečių KV read'ų tam pačiam raktui.
 */
export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && now - hit.at < ttlMs) return hit.promise;

  const promise = loader().catch((error) => {
    if (store.get(key)?.promise === promise) store.delete(key);
    throw error;
  });
  store.set(key, { at: now, promise });
  prune();
  return promise;
}

function prune(): void {
  while (store.size > DEFAULT_MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/** Testams ir diagnostikai — išvalo visą cache'ą arba tik pasirinktą prefiksą. */
export function clearModuleCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
