import {
  buildShareMeta,
  isIndexerCrawler,
  isShareCrawler,
  parseShareRoute,
  renderShareHtml,
} from './lib/share-meta';
import { modAliasKey, type ModAliasRecord } from './lib/mod-alias';

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

  const route = parseShareRoute(url.pathname);

  // Re-uploaded mods: senas GUID negalioja – 301 visiems (vartotojams ir
  // crawleriams), kol alias egzistuoja KV. Trumpas cache, nes alias'as gali
  // atsirasti bet kada po artimiausio kolektoriaus run'o.
  if (route && route.kind === 'mod' && route.game === 'reforger') {
    let targetId: string | null = null;
    try {
      const raw = await env.TRENDING_KV.get(modAliasKey(route.game, route.id), 'text');
      if (raw) {
        const alias = JSON.parse(raw) as ModAliasRecord;
        if (alias && typeof alias.targetId === 'string' && alias.targetId) {
          targetId = alias.targetId.toUpperCase();
        }
      }
    } catch {
      /* sugadintas alias įrašas – elgiamės lyg jo nebūtų */
    }

    if (targetId) {
      const targetPath =
        route.game === 'arma3' ? `/arma3/mod/${targetId}` : `/mod/${targetId}`;
      return new Response(null, {
        status: 301,
        headers: {
          Location: `${targetPath}${url.search}`,
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (!isShareCrawler(userAgent)) {
    return next();
  }

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
