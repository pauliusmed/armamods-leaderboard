import {
  buildShareMeta,
  isIndexerCrawler,
  isShareCrawler,
  parseShareRoute,
  renderShareHtml,
} from './lib/share-meta';

interface Env {
  TRENDING_KV: KVNamespace;
}

/**
 * Social + search crawlers do not run the React SPA reliably —
 * serve OG/indexable HTML for mod/server detail routes from KV.
 */
export async function onRequest(context: EventContext<Env, any, any>) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/assets') ||
    url.pathname === '/sitemap.xml' ||
    url.pathname.startsWith('/sitemap/')
  ) {
    return next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (!isShareCrawler(userAgent)) {
    return next();
  }

  const route = parseShareRoute(url.pathname);
  if (!route) {
    return next();
  }

  const meta = await buildShareMeta(env.TRENDING_KV, route);
  if (!meta) {
    return next();
  }

  const mode = isIndexerCrawler(userAgent) ? 'indexer' : 'social';
  return new Response(renderShareHtml(meta, { mode }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
