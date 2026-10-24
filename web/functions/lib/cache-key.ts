/**
 * Cache API raktas be cache-buster'io.
 *
 * KODĖL: `Arma-Reforger-Launcher` kviečia `/api/servers?...&_=1792…` (jQuery
 * `cache: false`). Cache API raktas yra pilnas URL, todėl kiekvienas `_=`
 * sukuria naują įrašą ir užklausa niekada nepataiko į kešą — kiekvieną kartą
 * kartojasi pilnas shard'ų skenavimas (`collectChunkedMatches`).
 * Matuota 2026-10-17→24: 1 210 launcher'io užklausų, **401 ms CPU/req**,
 * 485 tūkst. ms per savaitę (7,1 % viso Worker'io CPU).
 *
 * Šaliname TIK žinomus kosmetinius parametrus. Nežinomų neliečiame: jie gali
 * keisti atsakymą, o neteisingai sujungti raktai reikštų klaidingus duomenis
 * (istorinis pavyzdys — pašalintas service worker `/api/*` caching).
 */
const CACHE_BUSTER_PARAMS = ['_'] as const;

/** Kopija be cache-buster'ių — įvesties `URL` nemutuoja. */
export function cacheKeyUrl(url: URL): URL {
  const key = new URL(url.toString());
  for (const param of CACHE_BUSTER_PARAMS) key.searchParams.delete(param);
  return key;
}

/** `Request`, tinkamas `cache.match` / `cache.put` (Cache API — tik GET). */
export function cacheKeyRequest(request: Request): Request {
  return new Request(cacheKeyUrl(new URL(request.url)).toString(), { method: 'GET' });
}
