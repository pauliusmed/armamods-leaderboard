const PUBLIC_POLICY = 'X-Armamods-Public-Cache-Control';
type ResponseCache = Pick<Cache, 'match' | 'put'>;

/** Cache API supports fresh TTL only; SWR belongs to the outer Workers Cache. */
export function responseCache(cache: ResponseCache): ResponseCache {
  return {
    async match(request, options) {
      const hit = await cache.match(request, options);
      const policy = hit?.headers.get(PUBLIC_POLICY);
      if (!hit || !policy) return hit;
      const headers = new Headers(hit.headers);
      headers.set('Cache-Control', policy);
      headers.delete(PUBLIC_POLICY);
      return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
    },
    put(request, response) {
      const policy = response.headers.get('Cache-Control') ?? '';
      const fresh = policy.split(',').filter(
        (directive) => !/^\s*stale-(while-revalidate|if-error)\s*=/i.test(directive)
      ).join(',');
      if (fresh === policy) return cache.put(request, response);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', fresh);
      headers.set(PUBLIC_POLICY, policy);
      return cache.put(request, new Response(response.body, {
        status: response.status, statusText: response.statusText, headers,
      }));
    },
  };
}

export async function openResponseCache(name: string): Promise<ResponseCache> {
  return responseCache(await caches.open(name));
}
