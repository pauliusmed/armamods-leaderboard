import { defaultOgImage, lookupMod, type ShareGame } from './share-meta';

export interface WorkshopDependency {
  id: string;
  name: string;
  version?: string;
  totalPlayers?: number;
  serverCount?: number;
  overallRank?: number;
  marketShare?: number;
}

export function reforgerWorkshopPageUrl(modId: string): string {
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(modId)}`;
}

export function ogImageCacheKey(game: ShareGame, modId: string): string {
  return `cache:og-image:${game}:${modId.toUpperCase()}`;
}

export function depsCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-deps:${game}:${modId.toUpperCase()}`;
}

export function authorCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-author:${game}:${modId.toUpperCase()}`;
}

const WORKSHOP_KV_TTL = 604800; // 7 days

export function extractOgImageFromHtml(html: string): string | null {
  const patterns = [
    /property=["']og:image(?::url)?["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image(?::url)?["']/i,
    /name=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/&amp;/g, '&');
  }
  return null;
}

export function extractNextDataJson(html: string): unknown | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function parseReforgerDependenciesFromHtml(html: string): WorkshopDependency[] {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') return [];

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return [];

  const raw =
    (pageProps.assetVersionDetail as { dependencies?: unknown[] } | undefined)?.dependencies ??
    (pageProps.asset as { dependencies?: unknown[] } | undefined)?.dependencies ??
    [];

  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const deps: WorkshopDependency[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const asset = (entry as { asset?: { id?: string; name?: string }; version?: string }).asset;
    const id = asset?.id?.toUpperCase();
    const name = asset?.name?.trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const version = (entry as { version?: string }).version;
    deps.push({
      id,
      name,
      ...(version ? { version } : {}),
    });
  }

  return deps;
}

export function parseReforgerAuthorFromHtml(html: string): string | null {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') return null;

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return null;

  const author = (pageProps.asset as { author?: { username?: string } } | undefined)?.author
    ?.username;
  return typeof author === 'string' && author.trim() ? author.trim() : null;
}

export async function fetchReforgerWorkshopHtml(modId: string): Promise<string | null> {
  try {
    const response = await fetch(reforgerWorkshopPageUrl(modId), {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
        Accept: 'text/html',
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    console.warn('[WORKSHOP] fetch failed', modId, err);
    return null;
  }
}

/** One HTML fetch populates thumbnail + dependency KV keys when either is missing. */
export async function ensureReforgerWorkshopMetadata(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<void> {
  if (game === 'arma3') return;

  const ogKey = ogImageCacheKey(game, modId);
  const depKey = depsCacheKey(game, modId);
  const authorKey = authorCacheKey(game, modId);
  const [ogCached, depsCached, authorCached] = await Promise.all([
    kv.get(ogKey, 'text'),
    kv.get(depKey, 'text'),
    kv.get(authorKey, 'text'),
  ]);
  if (ogCached && depsCached && authorCached) return;

  const html = await fetchReforgerWorkshopHtml(modId);
  if (!html) return;

  const writes: Promise<void>[] = [];

  if (!ogCached) {
    const image = extractOgImageFromHtml(html);
    if (image?.startsWith('http')) {
      writes.push(kv.put(ogKey, image, { expirationTtl: WORKSHOP_KV_TTL }));
    }
  }

  if (!authorCached) {
    const author = parseReforgerAuthorFromHtml(html);
    if (author) {
      writes.push(kv.put(authorKey, author, { expirationTtl: WORKSHOP_KV_TTL }));
    }
  }

  if (!depsCached) {
    const deps = parseReforgerDependenciesFromHtml(html);
    const enriched: WorkshopDependency[] = [];
    for (const dep of deps) {
      const live = await lookupMod(kv, game, dep.id);
      enriched.push(
        live
          ? {
              ...dep,
              totalPlayers: live.totalPlayers,
              serverCount: live.serverCount,
              overallRank: live.overallRank,
              marketShare: live.marketShare,
            }
          : dep
      );
    }
    writes.push(kv.put(depKey, JSON.stringify(enriched), { expirationTtl: WORKSHOP_KV_TTL }));
  }

  await Promise.all(writes);
}

export async function resolveModThumbnailUrl(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<string> {
  if (game === 'arma3') return defaultOgImage();

  const ogKey = ogImageCacheKey(game, modId);
  let cached = await kv.get(ogKey, 'text');
  if (cached) return cached;

  await ensureReforgerWorkshopMetadata(kv, game, modId);
  cached = await kv.get(ogKey, 'text');
  return cached || defaultOgImage();
}

export async function resolveModAuthor(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<string | null> {
  if (game === 'arma3') return null;

  const cacheKey = authorCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) return cached;

  await ensureReforgerWorkshopMetadata(kv, game, modId);
  return (await kv.get(cacheKey, 'text')) || null;
}

export async function resolveModDependencies(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopDependency[]> {
  if (game === 'arma3') return [];

  const cacheKey = depsCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as WorkshopDependency[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* refetch */
    }
  }

  await ensureReforgerWorkshopMetadata(kv, game, modId);

  const refreshed = await kv.get(cacheKey, 'text');
  if (!refreshed) return [];
  try {
    const parsed = JSON.parse(refreshed) as WorkshopDependency[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isDefaultOgImage(url: string): boolean {
  return url.includes('/og-image.png');
}
