import { useEffect, useState } from 'react';
import { modsApi, type GameType } from '../api/client';
import type { Mod } from '../types';
import { isModFavorite } from '../lib/modFavorites';

function modIdKey(game: GameType, id: string): string {
  return game === 'reforger' ? id.toUpperCase() : id;
}

/** Resolve favorite mods for pin block — reuse page slice, fetch missing by id. */
export function usePinnedFavoriteMods(
  game: GameType,
  favoriteIds: string[],
  pageMods: Mod[],
  enabled: boolean
) {
  const [pinnedMods, setPinnedMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || favoriteIds.length === 0) {
      setPinnedMods([]);
      return;
    }

    let cancelled = false;
    const pageById = new Map(pageMods.map((mod) => [modIdKey(game, mod.id), mod]));
    const orderedFromPage = favoriteIds
      .map((id) => pageById.get(modIdKey(game, id)))
      .filter((mod): mod is Mod => Boolean(mod));

    const missingIds = favoriteIds.filter((id) => !pageById.has(modIdKey(game, id)));

    if (missingIds.length === 0) {
      setPinnedMods(orderedFromPage);
      return;
    }

    setLoading(true);
    Promise.all(
      missingIds.map(async (id) => {
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
        if (cancelled) return;
        const fetchedById = new Map<string, Mod>();
        for (const mod of fetched) {
          if (mod) fetchedById.set(modIdKey(game, mod.id), mod);
        }
        const merged = favoriteIds
          .map((id) => pageById.get(modIdKey(game, id)) ?? fetchedById.get(modIdKey(game, id)))
          .filter((mod): mod is Mod => Boolean(mod));
        setPinnedMods(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [game, favoriteIds, pageMods, enabled]);

  return { pinnedMods, loadingPinned: loading };
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
