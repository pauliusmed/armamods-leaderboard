// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFavoriteModIds,
  saveFavoriteModIds,
  toggleFavoriteModId,
  isModFavorite,
  subscribeFavoritesChanged,
  notifyFavoritesChanged,
  MAX_MOD_FAVORITES,
} from './modFavorites';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('modFavorites', () => {
  it('returns empty when nothing stored', () => {
    expect(loadFavoriteModIds('reforger')).toEqual([]);
    expect(loadFavoriteModIds('arma3')).toEqual([]);
  });

  it('round-trips saved ids per game', () => {
    saveFavoriteModIds('reforger', ['abc', 'def']);
    expect(loadFavoriteModIds('reforger')).toEqual(['ABC', 'DEF']);
    expect(loadFavoriteModIds('arma3')).toEqual([]);
  });

  it('normalizes reforger ids to uppercase only', () => {
    saveFavoriteModIds('arma3', ['AbC']);
    expect(loadFavoriteModIds('arma3')).toEqual(['AbC']);
  });

  it('toggles a favorite on and off', () => {
    expect(isModFavorite('reforger', 'abc', loadFavoriteModIds('reforger'))).toBe(false);

    const afterAdd = toggleFavoriteModId('reforger', 'abc');
    expect(afterAdd).toContain('ABC');
    expect(isModFavorite('reforger', 'abc', loadFavoriteModIds('reforger'))).toBe(true);

    const afterRemove = toggleFavoriteModId('reforger', 'abc');
    expect(afterRemove).not.toContain('ABC');
    expect(loadFavoriteModIds('reforger')).toEqual([]);
  });

  it('dedupes on toggle and caps at MAX_MOD_FAVORITES', () => {
    const ids = Array.from({ length: MAX_MOD_FAVORITES + 5 }, (_, i) => `mod-${i}`);
    ids.forEach((id) => toggleFavoriteModId('reforger', id));

    const stored = loadFavoriteModIds('reforger');
    expect(stored.length).toBe(MAX_MOD_FAVORITES);
    expect(new Set(stored).size).toBe(stored.length);

    toggleFavoriteModId('reforger', 'mod-24');
    const after = loadFavoriteModIds('reforger');
    expect(after).not.toContain('MOD-24');
  });

  it('notifies subscribers for the matching game only', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFavoritesChanged('reforger', listener);

    notifyFavoritesChanged('arma3');
    expect(listener).not.toHaveBeenCalled();

    notifyFavoritesChanged('reforger');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyFavoritesChanged('reforger');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('armamods:mod-favorites:reforger', 'not-json');
    expect(loadFavoriteModIds('reforger')).toEqual([]);

    localStorage.setItem('armamods:mod-favorites:reforger', JSON.stringify({ nope: true }));
    expect(loadFavoriteModIds('reforger')).toEqual([]);
  });
});
