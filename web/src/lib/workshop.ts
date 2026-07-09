import type { GameType } from '../api/client';

/** Official workshop page for a mod (Reforger GUID or Steam numeric ID). */
export function workshopPageUrl(modId: string, game: GameType = 'reforger'): string {
  if (game === 'arma3' || /^\d+$/.test(modId)) {
    return `https://steamcommunity.com/sharedfiles/filedetails/?id=${encodeURIComponent(modId)}`;
  }
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(modId)}`;
}

/**
 * Lazy workshop preview — Worker scrapes og:image once, caches CDN URL in KV (7d),
 * then 302-redirects. Safe for <img loading="lazy"> in list rows.
 */
export function modThumbnailUrl(modId: string, game: GameType = 'reforger'): string {
  return `/api/og/preview/mod/${encodeURIComponent(modId)}?game=${game}`;
}

/**
 * Resized workshop thumbnail for list rows — avoids multi-MB CDN originals in <img>.
 * Falls back to redirect when Cloudflare Image Resizing is unavailable.
 */
export function modListThumbnailUrl(
  modId: string,
  game: GameType = 'reforger',
  width = 64
): string {
  return `/api/mods/${encodeURIComponent(modId)}/thumbnail/img?game=${game}&w=${width}`;
}

export function workshopLabel(game: GameType = 'reforger'): string {
  return game === 'arma3' ? 'Steam Workshop' : 'Reforger Workshop';
}
