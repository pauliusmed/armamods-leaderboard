import {
  buildShareMeta,
  isSocialCrawler,
  parseShareRoute,
  renderShareHtml,
} from './lib/share-meta';

interface Env {
  TRENDING_KV: KVNamespace;
}

/** Discord/Facebook crawlers do not run React – serve OG HTML from KV data. */
export async function onRequest(context: EventContext<Env, any, any>) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/assets')) {
    return next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (!isSocialCrawler(userAgent)) {
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

  return new Response(renderShareHtml(meta), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
