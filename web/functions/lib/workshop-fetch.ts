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

/** Whether the mod page exists on Reforger Workshop (orthogonal to BM trending). */
export type WorkshopAvailability = 'available' | 'unavailable' | 'unknown';

export interface WorkshopStatusRecord {
  status: WorkshopAvailability;
  checkedAt: string;
}

export interface ReforgerWorkshopFetchResult {
  html: string | null;
  httpStatus: number | null;
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

export function workshopCopyCacheKey(game: ShareGame, modId: string): string {
  return `cache:mod-copy:${game}:${modId.toUpperCase()}`;
}

export interface WorkshopCopy {
  summary: string | null;
  description: string | null;
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

export function statusCacheKey(game: ShareGame, modId: string): string {
  return `cache:workshop-status:${game}:${modId.toUpperCase()}`;
}

const WORKSHOP_KV_TTL = 604800; // 7 days
/** Shorter TTL so mods that return to Workshop are picked up within ~2 days. */
const WORKSHOP_STATUS_UNAVAILABLE_TTL = 172800; // 48 hours

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

export function parseReforgerWorkshopCopyFromHtml(html: string): WorkshopCopy {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') {
    return { summary: null, description: null };
  }

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return { summary: null, description: null };

  const asset = pageProps.asset as { summary?: string; description?: string } | undefined;
  const summary =
    typeof asset?.summary === 'string' && asset.summary.trim() ? asset.summary.trim() : null;
  const description =
    typeof asset?.description === 'string' && asset.description.trim()
      ? asset.description.trim()
      : null;

  return { summary, description };
}

/** Persist size + author + workshop copy from one HTML fetch (collector warm path). */
export async function cacheReforgerFieldsFromWorkshopHtml(
  kv: { put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void> },
  modId: string,
  html: string
): Promise<{ sizeBytes: number | null; author: string | null; copy: WorkshopCopy }> {
  const sizeBytes = parseReforgerSizeBytesFromHtml(html);
  const author = parseReforgerAuthorFromHtml(html);
  const copy = parseReforgerWorkshopCopyFromHtml(html);
  const ttl = { expirationTtl: WORKSHOP_KV_TTL };

  if (sizeBytes && sizeBytes > 0) {
    await kv.put(sizeCacheKey('reforger', modId), String(sizeBytes), ttl);
  }
  if (author) {
    await kv.put(authorCacheKey('reforger', modId), author, ttl);
  }
  if (copy.summary || copy.description) {
    await kv.put(workshopCopyCacheKey('reforger', modId), JSON.stringify(copy), ttl);
  }

  return {
    sizeBytes: sizeBytes && sizeBytes > 0 ? sizeBytes : null,
    author,
    copy,
  };
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

/** True when workshop HTML contains a real asset record (not a dead/404 shell page). */
export function isReforgerWorkshopPageAvailable(html: string): boolean {
  const nextData = extractNextDataJson(html);
  if (!nextData || typeof nextData !== 'object') return false;

  const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } }).props
    ?.pageProps;
  if (!pageProps) return false;

  const asset = pageProps.asset as { id?: string; name?: string } | undefined;
  const id = asset?.id?.trim();
  const name = asset?.name?.trim();
  return Boolean(id && name);
}

async function readWorkshopStatusFromKv(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopStatusRecord | null> {
  const raw = await kv.get(statusCacheKey(game, modId), 'text');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkshopStatusRecord;
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.status === 'available' || parsed.status === 'unavailable') &&
      typeof parsed.checkedAt === 'string'
    ) {
      return parsed;
    }
  } catch {
    /* refetch */
  }
  return null;
}

async function writeWorkshopStatusToKv(
  kv: KVNamespace,
  game: ShareGame,
  modId: string,
  status: Exclude<WorkshopAvailability, 'unknown'>
): Promise<WorkshopStatusRecord> {
  const record: WorkshopStatusRecord = {
    status,
    checkedAt: new Date().toISOString(),
  };
  const ttl =
    status === 'unavailable' ? WORKSHOP_STATUS_UNAVAILABLE_TTL : WORKSHOP_KV_TTL;
  await kv.put(statusCacheKey(game, modId), JSON.stringify(record), { expirationTtl: ttl });
  return record;
}

export async function fetchReforgerWorkshopPage(
  modId: string
): Promise<ReforgerWorkshopFetchResult> {
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
      return { html: null, httpStatus: response.status };
    }
    return { html: await response.text(), httpStatus: response.status };
  } catch (err) {
    console.warn('[WORKSHOP] fetch failed', modId, err);
    return { html: null, httpStatus: null };
  }
}

export async function fetchReforgerWorkshopHtml(modId: string): Promise<string | null> {
  const page = await fetchReforgerWorkshopPage(modId);
  return page.html;
}

async function ensureWorkshopStatusFromPage(
  kv: KVNamespace,
  game: ShareGame,
  modId: string,
  page: ReforgerWorkshopFetchResult
): Promise<WorkshopStatusRecord | null> {
  if (game === 'arma3') return null;

  if (page.httpStatus === 404) {
    return writeWorkshopStatusToKv(kv, game, modId, 'unavailable');
  }

  if (!page.html) return null;

  const status = isReforgerWorkshopPageAvailable(page.html) ? 'available' : 'unavailable';
  return writeWorkshopStatusToKv(kv, game, modId, status);
}

export async function resolveModWorkshopStatus(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopStatusRecord> {
  if (game === 'arma3') {
    return { status: 'unknown', checkedAt: new Date().toISOString() };
  }

  const cached = await readWorkshopStatusFromKv(kv, game, modId);
  if (cached) return cached;

  const page = await fetchReforgerWorkshopPage(modId);
  const written = await ensureWorkshopStatusFromPage(kv, game, modId, page);
  if (written) return written;

  return { status: 'unknown', checkedAt: new Date().toISOString() };
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
  const copyKey = workshopCopyCacheKey(game, modId);
  const galleryKey = galleryCacheKey(game, modId);
  const datesKey = datesCacheKey(game, modId);
  const sizeKey = sizeCacheKey(game, modId);
  const [ogCached, depsCached, authorCached, copyCached, galleryCached, datesCached, sizeCached] =
    await Promise.all([
    kv.get(ogKey, 'text'),
    kv.get(depKey, 'text'),
    kv.get(authorKey, 'text'),
    kv.get(copyKey, 'text'),
    kv.get(galleryKey, 'text'),
    kv.get(datesKey, 'text'),
    kv.get(sizeKey, 'text'),
  ]);
  const statusCached = await readWorkshopStatusFromKv(kv, game, modId);
  if (statusCached?.status === 'unavailable') return;

  if (ogCached && depsCached && authorCached && copyCached && galleryCached && datesCached && sizeCached) {
    return;
  }

  const page = await fetchReforgerWorkshopPage(modId);
  await ensureWorkshopStatusFromPage(kv, game, modId, page);

  const statusAfter = await readWorkshopStatusFromKv(kv, game, modId);
  if (statusAfter?.status === 'unavailable') return;

  const html = page.html;
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

  if (!copyCached) {
    const copy = parseReforgerWorkshopCopyFromHtml(html);
    if (copy.summary || copy.description) {
      writes.push(kv.put(copyKey, JSON.stringify(copy), { expirationTtl: WORKSHOP_KV_TTL }));
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

export async function resolveModWorkshopCopy(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<WorkshopCopy> {
  const empty: WorkshopCopy = { summary: null, description: null };
  if (game === 'arma3') return empty;

  const cacheKey = workshopCopyCacheKey(game, modId);
  const cached = await kv.get(cacheKey, 'text');
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as WorkshopCopy;
      return {
        summary: parsed.summary ?? null,
        description: parsed.description ?? null,
      };
    } catch {
      /* refetch */
    }
  }

  await ensureReforgerWorkshopMetadata(kv, game, modId);
  const refreshed = await kv.get(cacheKey, 'text');
  if (!refreshed) return empty;
  try {
    const parsed = JSON.parse(refreshed) as WorkshopCopy;
    return {
      summary: parsed.summary ?? null,
      description: parsed.description ?? null,
    };
  } catch {
    return empty;
  }
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

  const page = await fetchReforgerWorkshopPage(normalizedId);
  if (page.httpStatus === 404) {
    await writeWorkshopStatusToKv(kv, game, normalizedId, 'unavailable');
    return null;
  }

  const html = page.html;
  if (!html) return null;

  if (isReforgerWorkshopPageAvailable(html)) {
    await writeWorkshopStatusToKv(kv, game, normalizedId, 'available');
  }

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
