import type { GameType } from '../api/client';

/** Official workshop page for a mod (Reforger GUID or Steam numeric ID). */
export function workshopPageUrl(modId: string, game: GameType = 'reforger'): string {
  if (game === 'arma3' || /^\d+$/.test(modId)) {
    return `https://steamcommunity.com/sharedfiles/filedetails/?id=${encodeURIComponent(modId)}`;
  }
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(modId)}`;
}

/**
 * Lazy workshop preview — Worker 302-redirects to the cached og:image (KV, 7d)
 * or the site default when missing. No resizing: image bytes come straight
 * from the Workshop CDN (transformations removed 2026-09-28, see COST_GUARDRAILS).
 */
export function modThumbnailUrl(modId: string, game: GameType = 'reforger'): string {
  return `/api/og/preview/mod/${encodeURIComponent(modId)}?game=${game}`;
}

export function workshopLabel(game: GameType = 'reforger'): string {
  return game === 'arma3' ? 'Steam Workshop' : 'Reforger Workshop';
}
