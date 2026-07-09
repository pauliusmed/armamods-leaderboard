import type { GameType } from '../api/client';

export const MAX_SERVER_FAVORITES = 20;

const FAVORITES_CHANGED = 'server-favorites-changed';

function storageKey(game: GameType): string {
  return `armamods:server-favorites:${game}`;
}

function normalizeServerId(serverId: string): string {
  return serverId.trim();
}

export function loadFavoriteServerIds(game: GameType): string[] {
  try {
    const raw = localStorage.getItem(storageKey(game));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map(normalizeServerId)
      .slice(0, MAX_SERVER_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavoriteServerIds(game: GameType, ids: string[]): void {
  const normalized = ids.map(normalizeServerId).slice(0, MAX_SERVER_FAVORITES);
  localStorage.setItem(storageKey(game), JSON.stringify(normalized));
}

export function notifyServerFavoritesChanged(game: GameType): void {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED, { detail: { game } }));
}

export function subscribeServerFavoritesChanged(
  game: GameType,
  listener: () => void
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ game: GameType }>).detail;
    if (detail?.game === game) listener();
  };
  window.addEventListener(FAVORITES_CHANGED, handler);
  return () => window.removeEventListener(FAVORITES_CHANGED, handler);
}

export function isServerFavorite(_game: GameType, serverId: string, ids: string[]): boolean {
  const key = normalizeServerId(serverId);
  return ids.some((id) => normalizeServerId(id) === key);
}

export function toggleFavoriteServerId(game: GameType, serverId: string): string[] {
  const key = normalizeServerId(serverId);
  const current = loadFavoriteServerIds(game);
  const exists = current.includes(key);
  const next = exists
    ? current.filter((id) => id !== key)
    : [key, ...current.filter((id) => id !== key)].slice(0, MAX_SERVER_FAVORITES);
  saveFavoriteServerIds(game, next);
  notifyServerFavoritesChanged(game);
  return next;
}
