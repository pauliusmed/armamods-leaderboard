import { useEffect, useRef, useState } from 'react';
import { modsApi, type GameType } from '../api/client';
import type { Mod } from '../types';
import { isModFavorite } from '../lib/modFavorites';

function modIdKey(game: GameType, id: string): string {
  return game === 'reforger' ? id.toUpperCase() : id;
}

function modsEqual(a: Mod[], b: Mod[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].name !== b[i].name) return false;
  }
  return true;
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
  const lastValueRef = useRef<Mod[]>([]);

  function setIfChanged(next: Mod[]) {
    if (!modsEqual(next, lastValueRef.current)) {
      lastValueRef.current = next;
      setPinnedMods(next);
    }
  }

  useEffect(() => {
    if (!enabled || favoriteIds.length === 0) {
      setIfChanged([]);
      return;
    }

    let cancelled = false;
    const pageById = new Map(pageMods.map((mod) => [modIdKey(game, mod.id), mod]));
    const orderedFromPage = favoriteIds
      .map((id) => pageById.get(modIdKey(game, id)))
      .filter((mod): mod is Mod => Boolean(mod));

    const missingIds = favoriteIds.filter((id) => !pageById.has(modIdKey(game, id)));

    if (missingIds.length === 0) {
      setIfChanged(orderedFromPage);
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
        setIfChanged(merged);
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
