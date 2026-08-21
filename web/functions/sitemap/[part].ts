import { loadListIdsFromKv } from '../lib/sitemap-kv';
import { loadAliasedModIdSet } from '../lib/mod-alias';
import {
  modDetailUrl,
  renderUrlset,
  serverDetailUrl,
  staticSitemapUrls,
  urlsFromIds,
  xmlResponse,
  type SitemapUrl,
} from '../lib/sitemap';

interface Env {
  TRENDING_KV: KVNamespace;
}

type Part = 'pages' | 'mods' | 'servers';

function parsePart(raw: string | undefined): Part | null {
  if (!raw) return null;
  const name = raw.replace(/\.xml$/i, '').toLowerCase();
  if (name === 'pages' || name === 'mods' || name === 'servers') return name;
  return null;
}

async function buildPart(kv: KVNamespace, part: Part): Promise<string> {
  if (part === 'pages') {
    return renderUrlset(staticSitemapUrls());
  }

  const urls: SitemapUrl[] = [];
  if (part === 'mods') {
    for (const game of ['reforger', 'arma3'] as const) {
      let ids = await loadListIdsFromKv(kv, 'mods', game);
      // Re-uploaded mods: senieji GUID'ai nukreipti – neindeksuojam sename URL.
      if (game === 'reforger') {
        const aliased = await loadAliasedModIdSet(kv, game);
        if (aliased.size) ids = ids.filter((id) => !aliased.has(id.toUpperCase()));
      }
      urls.push(
        ...urlsFromIds(ids, (id) => modDetailUrl(id, game), 'daily', game === 'reforger' ? 0.7 : 0.6)
      );
    }
  } else {
    for (const game of ['reforger', 'arma3'] as const) {
      const ids = await loadListIdsFromKv(kv, 'servers', game);
      urls.push(
        ...urlsFromIds(ids, (id) => serverDetailUrl(id, game), 'daily', game === 'reforger' ? 0.6 : 0.5)
      );
    }
  }

  return renderUrlset(urls);
}

export const onRequestGet: PagesFunction<Env, 'part'> = async (context) => {
  const part = parsePart(context.params.part);
  if (!part) {
    return new Response('Not found', { status: 404 });
  }

  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached) return cached;

  const body = await buildPart(context.env.TRENDING_KV, part);
  const response = xmlResponse(body, 3600);
  context.waitUntil(cache.put(context.request, response.clone()));
  return response;
};
