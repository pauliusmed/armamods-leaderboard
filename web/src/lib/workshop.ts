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

export function workshopLabel(game: GameType = 'reforger'): string {
  return game === 'arma3' ? 'Steam Workshop' : 'Reforger Workshop';
}
