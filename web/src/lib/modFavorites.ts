import type { GameType } from '../api/client';

export const MAX_MOD_FAVORITES = 20;

const FAVORITES_CHANGED = 'mod-favorites-changed';

function storageKey(game: GameType): string {
  return `armamods:mod-favorites:${game}`;
}

function normalizeModId(modId: string, game: GameType): string {
  return game === 'reforger' ? modId.toUpperCase() : modId;
}

export function loadFavoriteModIds(game: GameType): string[] {
  try {
    const raw = localStorage.getItem(storageKey(game));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => normalizeModId(id, game))
      .slice(0, MAX_MOD_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavoriteModIds(game: GameType, ids: string[]): void {
  const normalized = ids.map((id) => normalizeModId(id, game)).slice(0, MAX_MOD_FAVORITES);
  localStorage.setItem(storageKey(game), JSON.stringify(normalized));
}

export function notifyFavoritesChanged(game: GameType): void {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED, { detail: { game } }));
}

export function subscribeFavoritesChanged(
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

export function isModFavorite(game: GameType, modId: string, ids: string[]): boolean {
  const key = normalizeModId(modId, game);
  return ids.some((id) => normalizeModId(id, game) === key);
}

export function toggleFavoriteModId(game: GameType, modId: string): string[] {
  const key = normalizeModId(modId, game);
  const current = loadFavoriteModIds(game);
  const exists = current.includes(key);
  const next = exists
    ? current.filter((id) => id !== key)
    : [key, ...current.filter((id) => id !== key)].slice(0, MAX_MOD_FAVORITES);
  saveFavoriteModIds(game, next);
  notifyFavoritesChanged(game);
  return next;
}
