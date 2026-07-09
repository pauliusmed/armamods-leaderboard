import { useCallback, useEffect, useState } from 'react';
import type { GameType } from '../api/client';
import {
  isModFavorite,
  loadFavoriteModIds,
  subscribeFavoritesChanged,
  toggleFavoriteModId,
} from '../lib/modFavorites';

export function useModFavorites(game: GameType) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoriteModIds(game));

  useEffect(() => {
    setFavoriteIds(loadFavoriteModIds(game));
    return subscribeFavoritesChanged(game, () => setFavoriteIds(loadFavoriteModIds(game)));
  }, [game]);

  const toggle = useCallback(
    (modId: string) => {
      setFavoriteIds(toggleFavoriteModId(game, modId));
    },
    [game]
  );

  const isFavorite = useCallback(
    (modId: string) => isModFavorite(game, modId, favoriteIds),
    [game, favoriteIds]
  );

  return { favoriteIds, toggle, isFavorite };
}
