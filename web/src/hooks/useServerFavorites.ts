import { useCallback, useEffect, useState } from 'react';
import type { GameType } from '../api/client';
import {
  isServerFavorite,
  loadFavoriteServerIds,
  subscribeServerFavoritesChanged,
  toggleFavoriteServerId,
} from '../lib/serverFavorites';

export function useServerFavorites(game: GameType) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoriteServerIds(game));

  useEffect(() => {
    setFavoriteIds(loadFavoriteServerIds(game));
    return subscribeServerFavoritesChanged(game, () => setFavoriteIds(loadFavoriteServerIds(game)));
  }, [game]);

  const toggle = useCallback(
    (serverId: string) => {
      setFavoriteIds(toggleFavoriteServerId(game, serverId));
    },
    [game]
  );

  const isFavorite = useCallback(
    (serverId: string) => isServerFavorite(game, serverId, favoriteIds),
    [game, favoriteIds]
  );

  return { favoriteIds, toggle, isFavorite };
}
