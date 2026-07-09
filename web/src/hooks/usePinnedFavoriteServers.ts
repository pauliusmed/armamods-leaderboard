import { useEffect, useState } from 'react';
import { serversApi, type GameType } from '../api/client';
import type { Server } from '../types';
import { isServerFavorite } from '../lib/serverFavorites';

/** Resolve favorite servers for pin block — reuse page slice, fetch missing by id. */
export function usePinnedFavoriteServers(
  game: GameType,
  favoriteIds: string[],
  pageServers: Server[],
  enabled: boolean
) {
  const [pinnedServers, setPinnedServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || favoriteIds.length === 0) {
      setPinnedServers([]);
      return;
    }

    let cancelled = false;
    const pageById = new Map(pageServers.map((server) => [server.id, server]));
    const orderedFromPage = favoriteIds
      .map((id) => pageById.get(id))
      .filter((server): server is Server => Boolean(server));

    const missingIds = favoriteIds.filter((id) => !pageById.has(id));

    if (missingIds.length === 0) {
      setPinnedServers(orderedFromPage);
      return;
    }

    setLoading(true);
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
        const fetchedById = new Map<string, Server>();
        for (const server of fetched) {
          if (server) fetchedById.set(server.id, server);
        }
        const merged = favoriteIds
          .map((id) => pageById.get(id) ?? fetchedById.get(id))
          .filter((server): server is Server => Boolean(server));
        setPinnedServers(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [game, favoriteIds, pageServers, enabled]);

  return { pinnedServers, loadingPinned: loading };
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
