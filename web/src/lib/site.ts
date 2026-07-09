export const SITE_ORIGIN = 'https://reforgermods.com';

export function modPageUrl(modId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  const gp = game === 'arma3' ? '/arma3' : '';
  return `${SITE_ORIGIN}${gp}/mod/${encodeURIComponent(modId)}`;
}

export function serverPageUrl(serverId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  const gp = game === 'arma3' ? '/arma3' : '';
  return `${SITE_ORIGIN}${gp}/server/${encodeURIComponent(serverId)}`;
}

export function modPreviewImageUrl(modId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  return `${SITE_ORIGIN}/api/og/preview/mod/${encodeURIComponent(modId)}?game=${game}`;
}

export function serverPreviewImageUrl(serverId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  return `${SITE_ORIGIN}/api/og/preview/server/${encodeURIComponent(serverId)}?game=${game}`;
}

/** Leaderboard path with optional search (name, id, or workshop author). */
export function modListHref(game: 'reforger' | 'arma3' = 'reforger', search?: string): string {
  const base = game === 'arma3' ? '/arma3' : '/';
  const q = search?.trim();
  if (!q) return base;
  return `${base}?q=${encodeURIComponent(q)}`;
}
