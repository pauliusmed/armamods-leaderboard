import { useEffect, useMemo, useState } from 'react';
import { serversApi, type GameType } from '../api/client';
import type { Server } from '../types';
import { isServerFavorite } from '../lib/serverFavorites';

const NO_SERVERS: Server[] = [];

/** Resolve favorite servers for pin block — reuse page slice, fetch missing by id. */
export function usePinnedFavoriteServers(
  game: GameType,
  favoriteIds: string[],
  pageServers: Server[],
  enabled: boolean
) {
  const [fetchedById, setFetchedById] = useState<Map<string, Server>>(new Map());
  const [loading, setLoading] = useState(false);

  const active = enabled && favoriteIds.length > 0;

  const pageById = useMemo(
    () => new Map(pageServers.map((server) => [server.id, server])),
    [pageServers]
  );

  const pinnedServers = useMemo(() => {
    if (!active) return NO_SERVERS;
    return favoriteIds
      .map((id) => pageById.get(id) ?? fetchedById.get(id))
      .filter((server): server is Server => Boolean(server));
  }, [active, favoriteIds, pageById, fetchedById]);

  // Reset loading when the set of missing ids changes (React "derived state" pattern).
  const missingKey = active ? favoriteIds.filter((id) => !pageById.has(id)).join(',') : '';
  const [prevMissingKey, setPrevMissingKey] = useState('');
  if (prevMissingKey !== missingKey) {
    setPrevMissingKey(missingKey);
    setLoading(missingKey !== '');
  }

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const missingIds = favoriteIds.filter((id) => !pageById.has(id));
    if (missingIds.length === 0) return;

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await serversApi.getById(id, game);
          return res?.data?.id ? res.data : null;
        } catch {
          return null;
        }
      })
    )
      .then((fetched) => {
        if (cancelled) return;
        setFetchedById((prev) => {
          const next = new Map(prev);
          for (const server of fetched) {
            if (server) next.set(server.id, server);
          }
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, game, favoriteIds, pageById]);

  return { pinnedServers, loadingPinned: active ? loading : false };
}

export function excludeFavoriteServersFromList(
  game: GameType,
  servers: Server[],
  favoriteIds: string[],
  exclude: boolean
): Server[] {
  if (!exclude || favoriteIds.length === 0) return servers;
  return servers.filter((server) => !isServerFavorite(game, server.id, favoriteIds));
}
