import { useEffect, useState } from 'react';
import { api, type GameType } from '../api/client';

export interface DataFreshness {
  loading: boolean;
  isStale: boolean;
  lastUpdate: string | null;
  staleHours: number | null;
}

const EMPTY: DataFreshness = {
  loading: true,
  isStale: false,
  lastUpdate: null,
  staleHours: null,
};

type CacheEntry = { data: DataFreshness; at: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<DataFreshness>>();
const CACHE_TTL_MS = 60_000;

function formatAge(hours: number | null): string {
  if (hours === null) return 'unknown age';
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatSyncAge(hours: number | null): string {
  return formatAge(hours);
}

async function fetchFreshness(game: GameType): Promise<DataFreshness> {
  const hit = cache.get(game);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.data, loading: false };
  }

  const pending = inflight.get(game);
  if (pending) return pending;

  const promise = api
    .get('/health')
    .then((res) => {
      const check = res.data?.checks?.[game] as
        | { lastUpdate?: string | null; staleHours?: number | null; isStale?: boolean }
        | undefined;
      const next: DataFreshness = {
        loading: false,
        isStale: Boolean(check?.isStale),
        lastUpdate: check?.lastUpdate ?? null,
        staleHours: typeof check?.staleHours === 'number' ? check.staleHours : null,
      };
      cache.set(game, { data: next, at: Date.now() });
      return next;
    })
    .catch(() => ({
      loading: false,
      isStale: false,
      lastUpdate: null,
      staleHours: null,
    }))
    .finally(() => {
      inflight.delete(game);
    });

  inflight.set(game, promise);
  return promise;
}

/**
 * Reads /api/health for the active game. Collector writes cache:lastUpdate;
 * API marks isStale when age > 3h.
 */
export function useDataFreshness(game: GameType): DataFreshness {
  const [state, setState] = useState<DataFreshness>(() => {
    const hit = cache.get(game);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.data, loading: false };
    return EMPTY;
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));

    fetchFreshness(game).then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [game]);

  return state;
}
