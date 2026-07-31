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

  // Adjust state during render when game changes (React "derived state" pattern).
  const [prevGame, setPrevGame] = useState(game);
  if (prevGame !== game) {
    setPrevGame(game);
    setFavoriteIds(loadFavoriteModIds(game));
  }

  useEffect(() => {
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
