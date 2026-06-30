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

export interface WorkshopGalleryImage {
  url: string;
  thumb?: string;
  width?: number;
  height?: number;
}

export interface WorkshopDates {
  created: string | null;
  modified: string | null;
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

export function galleryCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-gallery:${game}:${modId.toUpperCase()}`;
}

export function datesCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-dates:${game}:${modId.toUpperCase()}`;
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

function parseBackendImageEntry(entry: unknown): WorkshopGalleryImage | null {
  if (!entry || typeof entry !== 'object') return null;
  const url = (entry as { url?: string }).url;
  if (!url?.startsWith('http')) return null;

  const width = (entry as { width?: number }).width;
  const height = (entry as { height?: number }).height;
  const thumb = (entry as { thumbnails?: { 'image/jpeg'?: { url?: string }[] } }).thumbnails?.[
    'image/jpeg'
  ]?.[0]?.url;

  return {
    url,
    ...(thumb?.startsWith('http') ? { thumb } : {}),
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
  };
}

export function parseReforgerGalleryFromHtml(html: string): WorkshopGalleryImage[] {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') return [];

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return [];

  const asset = pageProps.asset as { previews?: unknown[]; screenshots?: unknown[] } | undefined;
  if (!asset) return [];

  const seen = new Set<string>();
  const images: WorkshopGalleryImage[] = [];

  for (const entry of [...(asset.previews ?? []), ...(asset.screenshots ?? [])]) {
    const image = parseBackendImageEntry(entry);
    if (!image || seen.has(image.url)) continue;
    seen.add(image.url);
    images.push(image);
  }

  return images;
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

/** Workshop Created / Last Modified — DD.MM.YYYY like the official page. */
export function formatWorkshopDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export function parseReforgerDatesFromHtml(html: string): WorkshopDates {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') {
    return { created: null, modified: null };
  }

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return { created: null, modified: null };

  const asset = pageProps.asset as { createdAt?: string; updatedAt?: string } | undefined;
  const createdRaw = asset?.createdAt;
  const modifiedRaw = asset?.updatedAt;

  return {
    created: typeof createdRaw === 'string' ? formatWorkshopDate(createdRaw) : null,
    modified: typeof modifiedRaw === 'string' ? formatWorkshopDate(modifiedRaw) : null,
  };
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
  const galleryKey = galleryCacheKey(game, modId);
  const datesKey = datesCacheKey(game, modId);
  const [ogCached, depsCached, authorCached, galleryCached, datesCached] = await Promise.all([
    kv.get(ogKey, 'text'),
    kv.get(depKey, 'text'),
    kv.get(authorKey, 'text'),
    kv.get(galleryKey, 'text'),
    kv.get(datesKey, 'text'),
  ]);
  if (ogCached && depsCached && authorCached && galleryCached && datesCached) return;

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

  if (!galleryCached) {
    const gallery = parseReforgerGalleryFromHtml(html);
    writes.push(kv.put(galleryKey, JSON.stringify(gallery), { expirationTtl: WORKSHOP_KV_TTL }));
  }

  if (!datesCached) {
    const dates = parseReforgerDatesFromHtml(html);
    writes.push(kv.put(datesKey, JSON.stringify(dates), { expirationTtl: WORKSHOP_KV_TTL }));
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

export async function resolveModGallery(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopGalleryImage[]> {
  if (game === 'arma3') return [];

  const cacheKey = galleryCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as WorkshopGalleryImage[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* refetch */
    }
  }

  await ensureReforgerWorkshopMetadata(kv, game, modId);

  const refreshed = await kv.get(cacheKey, 'text');
  if (!refreshed) return [];
  try {
    const parsed = JSON.parse(refreshed) as WorkshopGalleryImage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function resolveModWorkshopDates(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopDates> {
  const empty = { created: null, modified: null };
  if (game === 'arma3') return empty;

  const cacheKey = datesCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as WorkshopDates;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* refetch */
    }
  }

  await ensureReforgerWorkshopMetadata(kv, game, modId);

  const refreshed = await kv.get(cacheKey, 'text');
  if (!refreshed) return empty;
  try {
    const parsed = JSON.parse(refreshed) as WorkshopDates;
    return parsed && typeof parsed === 'object' ? parsed : empty;
  } catch {
    return empty;
  }
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
