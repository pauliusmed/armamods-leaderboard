import { useEffect, useMemo, useState } from 'react';
import { modsApi, type GameType } from '../api/client';
import type { Mod } from '../types';
import { isModFavorite } from '../lib/modFavorites';

function modIdKey(game: GameType, id: string): string {
  return game === 'reforger' ? id.toUpperCase() : id;
}

const NO_MODS: Mod[] = [];

/** Resolve favorite mods for pin block — reuse page slice, fetch missing by id. */
export function usePinnedFavoriteMods(
  game: GameType,
  favoriteIds: string[],
  pageMods: Mod[],
  enabled: boolean
) {
  const [fetchedById, setFetchedById] = useState<Map<string, Mod>>(new Map());
  const [loading, setLoading] = useState(false);

  const active = enabled && favoriteIds.length > 0;

  const pageById = useMemo(
    () => new Map(pageMods.map((mod) => [modIdKey(game, mod.id), mod])),
    [game, pageMods]
  );

  const pinnedMods = useMemo(() => {
    if (!active) return NO_MODS;
    return favoriteIds
      .map((id) => pageById.get(modIdKey(game, id)) ?? fetchedById.get(modIdKey(game, id)))
      .filter((mod): mod is Mod => Boolean(mod));
  }, [active, game, favoriteIds, pageById, fetchedById]);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    const missingIds = favoriteIds.filter((id) => !pageById.has(modIdKey(game, id)));
    if (missingIds.length === 0) {
      setLoading(false);
      return;
    }
    // Jau turim šiuos fetch'intus — nereikia krauti iš naujo (getCached vis tiek greit, bet vengiame mirgėjimo).
    const toFetch = missingIds.filter((id) => !fetchedById.has(modIdKey(game, id)));
    if (toFetch.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      toFetch.map(async (id) => {
        try {
          const res = await modsApi.getById(id, game);
          const data = res?.data;
          if (!data?.id) return null;
          return {
            id: data.id,
            name: data.name,
            serverCount: data.serverCount ?? 0,
            totalPlayers: data.totalPlayers ?? 0,
            overallRank: data.overallRank ?? data.stats?.overallRank ?? 0,
            marketShare: data.marketShare,
            thumbnail: data.thumbnail,
            author: data.author,
            workshopStatus: data.workshopStatus,
          } satisfies Mod;
        } catch {
          return null;
        }
      })
    )
      .then((fetched) => {
        setFetchedById((prev) => {
          const next = new Map(prev);
          for (const mod of fetched) {
            if (mod) next.set(modIdKey(game, mod.id), mod);
          }
          return next;
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [active, game, favoriteIds, pageById]);

  return { pinnedMods, loadingPinned: active ? loading : false };
}

export function excludeFavoriteModsFromList(
  game: GameType,
  mods: Mod[],
  favoriteIds: string[],
  exclude: boolean
): Mod[] {
  if (!exclude || favoriteIds.length === 0) return mods;
  return mods.filter((mod) => !isModFavorite(game, mod.id, favoriteIds));
}
