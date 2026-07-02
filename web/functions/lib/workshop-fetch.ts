import { defaultOgImage, lookupMod, lookupModsByIds, modSizeBytesFromRecord, type ShareGame } from './share-meta';
import { parseHumanSizeToBytes } from './storage-format';

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
  const id = modId.trim().toUpperCase();
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(id)}`;
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

export function sizeCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-size:${game}:${modId.toUpperCase()}`;
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

function findSizeInVersionObject(obj: unknown, depth = 0): number | null {
  if (!obj || typeof obj !== 'object' || depth > 8) return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findSizeInVersionObject(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;
  const priorityKeys = [
    'sizeBytes',
    'VersionSize',
    'size',
    'fileSize',
    'downloadSize',
    'versionSize',
    'totalSize',
    'packageSize',
    'patchSize',
  ];

  for (const key of priorityKeys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
    if (typeof value === 'string') {
      const bytes = parseHumanSizeToBytes(value);
      if (bytes) return bytes;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = findSizeInVersionObject(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Parse version download size from workshop SSR markup. */
export function parseVersionSizeFromWorkshopHtml(html: string): number | null {
  // App Router: <dt>Version size</dt><dd ...>339.89 MB</dd>
  const dtDdMatch = html.match(/Version\s*size<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i);
  if (dtDdMatch) {
    const bytes = parseHumanSizeToBytes(dtDdMatch[1].trim());
    if (bytes) return bytes;
  }

  // Embedded JSON (RSC payload): "VersionSize":356397017
  const jsonMatch = html.match(/"VersionSize"\s*:\s*(\d+)/i);
  if (jsonMatch) {
    const n = parseInt(jsonMatch[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Legacy concatenated <dl> text: "...Version size67.24 KBSubscribers..."
  const dlMatch = html.match(
    /Version\s*size\s*([\d.,]+)\s*(KB|MB|GB|TB|B)(?=\s*Subscribers|\s*Downloads|<|\s*$)/i
  );
  if (dlMatch) {
    return parseHumanSizeToBytes(`${dlMatch[1]} ${dlMatch[2]}`);
  }

  const loose = html.match(/Version\s*size\s*([\d.,]+)\s*(KB|MB|GB|TB|B)/i);
  if (loose) {
    return parseHumanSizeToBytes(`${loose[1]} ${loose[2]}`);
  }

  return null;
}

/** Latest version download size in bytes from workshop HTML. */
export function parseReforgerSizeBytesFromHtml(html: string): number | null {
  const fromDl = parseVersionSizeFromWorkshopHtml(html);
  if (fromDl) return fromDl;

  const nextData = extractNextDataJson(html);
  if (nextData && typeof nextData === 'object') {
    const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
      ?.pageProps;
    if (pageProps) {
      const fromAvd = findSizeInVersionObject(pageProps.assetVersionDetail);
      if (fromAvd) return fromAvd;
      const fromAsset = findSizeInVersionObject(pageProps.asset);
      if (fromAsset) return fromAsset;
    }
  }

  return null;
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
        'User-Agent':
          'Mozilla/5.0 (compatible; ReforgerMods/1.0; +https://reforgermods.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!response.ok) {
      console.warn('[WORKSHOP] fetch failed', modId, response.status);
      return null;
    }
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
  const sizeKey = sizeCacheKey(game, modId);
  const [ogCached, depsCached, authorCached, galleryCached, datesCached, sizeCached] =
    await Promise.all([
    kv.get(ogKey, 'text'),
    kv.get(depKey, 'text'),
    kv.get(authorKey, 'text'),
    kv.get(galleryKey, 'text'),
    kv.get(datesKey, 'text'),
    kv.get(sizeKey, 'text'),
  ]);
  if (ogCached && depsCached && authorCached && galleryCached && datesCached && sizeCached) return;

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

  if (!sizeCached) {
    const sizeBytes = parseReforgerSizeBytesFromHtml(html);
    if (sizeBytes) {
      writes.push(kv.put(sizeKey, String(sizeBytes), { expirationTtl: WORKSHOP_KV_TTL }));
    }
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

export async function ensureReforgerModSize(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<number | null> {
  if (game === 'arma3') return null;

  const normalizedId = modId.trim().toUpperCase();
  const cacheKey = sizeCacheKey(game, normalizedId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    const n = parseInt(cached, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const html = await fetchReforgerWorkshopHtml(normalizedId);
  if (!html) return null;

  const sizeBytes = parseReforgerSizeBytesFromHtml(html);
  if (sizeBytes) {
    await kv.put(cacheKey, String(sizeBytes), { expirationTtl: WORKSHOP_KV_TTL });
  }
  return sizeBytes;
}

export async function resolveModSizeBytes(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<number | null> {
  const leaderboard = await lookupModsByIds(kv, game, [modId]);
  const fromLeaderboard = modSizeBytesFromRecord(
    leaderboard.get(modId.trim().toUpperCase()) ?? leaderboard.get(modId)
  );
  if (fromLeaderboard) return fromLeaderboard;

  const cacheKey = sizeCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    const n = parseInt(cached, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return ensureReforgerModSize(kv, game, modId);
}

/** Resolve many mod sizes — leaderboard → KV cache → optional workshop scrape. */
export async function resolveModSizesBatch(
  kv: KVNamespace,
  game: ShareGame,
  modIds: string[],
  options?: { maxFetch?: number; concurrency?: number }
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  const uncached: string[] = [];

  const leaderboard = await lookupModsByIds(kv, game, modIds);

  await Promise.all(
    modIds.map(async (id) => {
      const normalizedId = id.trim().toUpperCase();
      const fromLeaderboard = modSizeBytesFromRecord(
        leaderboard.get(normalizedId) ?? leaderboard.get(id)
      );
      if (fromLeaderboard) {
        result.set(id, fromLeaderboard);
        return;
      }

      const cacheKey = sizeCacheKey(game, normalizedId);
      const cached = await kv.get(cacheKey, 'text');
      if (cached) {
        const n = parseInt(cached, 10);
        if (Number.isFinite(n) && n > 0) {
          result.set(id, n);
          return;
        }
      }
      uncached.push(id);
    })
  );

  const maxFetch = options?.maxFetch ?? 0;
  if (maxFetch <= 0 || game === 'arma3') {
    for (const id of uncached) result.set(id, null);
    for (const id of modIds) {
      if (!result.has(id)) result.set(id, null);
    }
    return result;
  }

  const concurrency = options?.concurrency ?? 8;
  const toFetch = uncached.slice(0, maxFetch);

  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (id) => {
        const bytes = await ensureReforgerModSize(kv, game, id);
        result.set(id, bytes);
      })
    );
  }

  for (const id of uncached.slice(maxFetch)) {
    result.set(id, null);
  }
  for (const id of modIds) {
    if (!result.has(id)) result.set(id, null);
  }
  return result;
}

export function isDefaultOgImage(url: string): boolean {
  return url.includes('/og-image.png');
}
