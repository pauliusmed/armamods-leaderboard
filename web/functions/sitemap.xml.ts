import {
  renderSitemapIndex,
  sitemapIndexEntries,
  xmlResponse,
} from './lib/sitemap';

interface Env {
  TRENDING_KV: KVNamespace;
}

/** Sitemap index — child sitemaps hold hub pages + all mod/server detail URLs. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached) return cached;

  const body = renderSitemapIndex(sitemapIndexEntries());
  const response = xmlResponse(body, 3600);
  context.waitUntil(cache.put(context.request, response.clone()));
  return response;
};
