import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { modsApi, type GameType } from '../api/client';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { useUrlListState, parseEnum, parsePositiveInt, parseSortDir } from './useUrlListState';
import type { Mod } from '../types';

export type PlayerFilter = 'all' | 'high' | 'medium' | 'low';
export type ModSortBy = 'overall' | 'players' | 'servers' | 'name' | 'share' | 'author' | 'size';
export type SortDir = 'asc' | 'desc';

const PLAYER_FILTERS: readonly PlayerFilter[] = ['all', 'high', 'medium', 'low'];
const MOD_SORTS: readonly ModSortBy[] = [
  'overall',
  'players',
  'servers',
  'name',
  'share',
  'author',
  'size',
];

interface UseModsOptions {
  game?: GameType;
}

export function useMods(options: UseModsOptions = {}) {
  const { game = 'reforger' } = options;
  const [mods, setMods] = useState<Mod[]>([]);
  const [totalMods, setTotalMods] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, totalServers: 0, totalMods: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const parsePlayerFilter = useCallback(
    (raw: string | null) => parseEnum(PLAYER_FILTERS)(raw, 'all'),
    []
  );
  const parseSort = useCallback((raw: string | null) => parseEnum(MOD_SORTS)(raw, 'overall'), []);

  const [searchQuery, setSearchQuery] = useUrlListState({
    param: 'q',
    fallback: '',
    parse: (raw) => raw ?? '',
    serialize: (v) => v.trim() || null,
    delayMs: 300,
  });
  const [playerFilter, setPlayerFilter] = useUrlListState<PlayerFilter>({
    param: 'activity',
    fallback: 'all',
    parse: parsePlayerFilter,
    serialize: (v) => (v === 'all' ? null : v),
  });
  const [sortBy, setSortBy] = useUrlListState<ModSortBy>({
    param: 'sort',
    fallback: 'overall',
    parse: parseSort,
    serialize: (v) => (v === 'overall' ? null : v),
  });
  const [sortDir, setSortDir] = useUrlListState<SortDir>({
    param: 'dir',
    fallback: 'asc',
    parse: (raw) => parseSortDir(raw, 'asc'),
    serialize: (v) => (v === 'asc' ? null : v),
  });
  const [currentPage, setCurrentPage] = useUrlListState<number>({
    param: 'page',
    fallback: 1,
    parse: (raw) => parsePositiveInt(raw, 1),
    serialize: (v) => (v <= 1 ? null : String(v)),
    mode: 'push',
  });
  const itemsPerPage = 24;
  // Monotonic request seq — a slow response (search loads all KV chunks server-side,
  // so /api/mods?q=… can take seconds) must never overwrite the result of a newer one.
  const loadSeqRef = useRef(0);

  const loadMods = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const [listData, statsData] = await fetchWithRetry(
        () =>
          Promise.all([
            modsApi.getPopular(itemsPerPage, offset, searchQuery, sortBy, sortDir, game, playerFilter),
            modsApi.getGlobalStats(game)
          ]),
        (attempt) => setRetryCount(attempt),
      );

      setRetryCount(0);
      if (seq !== loadSeqRef.current) return; // stale — a newer load already won
      const incoming = Array.isArray(listData?.data) ? listData.data : [];
      const incomingTotal = listData?.meta?.total ?? 0;
      // Apsauga nuo tuščio perrašymo: default view be filtrų neturi grąžinti tuščio
      // puslapio kai total>0 — tai persidengusios užklausos ar tuščias precompute shard'as.
      if (
        incoming.length === 0 &&
        incomingTotal > 0 &&
        mods.length > 0 &&
        searchQuery.trim() === '' &&
        playerFilter === 'all' &&
        sortBy === 'overall' &&
        sortDir === 'asc'
      ) {
        console.warn('[MODS] ignoring empty page for non-empty total (stale/race)', {
          incomingTotal,
          offset,
          page: currentPage,
        });
        setError(null);
        return;
      }
      setMods(incoming);
      setTotalMods(incomingTotal);
      setGlobalStats(statsData || { totalPlayers: 0, totalServers: 0, totalMods: 0 });
      setError(null);
    } catch (err) {
      if (seq !== loadSeqRef.current) return; // stale failure — ignore
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
        const body = axiosErr.response?.data;
        setError(body?.message || body?.error || (err instanceof Error ? err.message : 'Failed to load data'));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [currentPage, searchQuery, sortBy, sortDir, game, playerFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, playerFilter, sortBy, sortDir, setCurrentPage]);

  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      loadMods();
      return;
    }
    // Debounce subsequent filter/search/page changes to avoid request storms.
    const timer = setTimeout(() => {
      loadMods();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, sortBy, sortDir, playerFilter, loadMods]);

  const filteredMods = useMemo(() => (Array.isArray(mods) ? mods : []), [mods]);

  const resetFilters = () => {
    setSearchQuery('');
    setPlayerFilter('all');
    setSortBy('overall');
    setSortDir('asc');
    setCurrentPage(1);
  };

  const toggleSort = (column: ModSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir(column === 'name' || column === 'author' ? 'asc' : column === 'overall' ? 'asc' : 'desc');
  };

  const totalPages = Math.ceil(totalMods / itemsPerPage);

  const stats = useMemo(() => ({
    totalMods: globalStats?.totalMods || 0,
    totalPlayers: globalStats?.totalPlayers || 0,
    totalServers: globalStats?.totalServers || 0,
    totalPages
  }), [globalStats, totalPages]);

  return {
    mods,
    filteredMods,
    loading,
    initialLoading: loading && mods.length === 0,
    error,
    retryCount,
    searchQuery,
    setSearchQuery,
    playerFilter,
    setPlayerFilter,
    sortBy,
    setSortBy,
    sortDir,
    toggleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh: loadMods
  };
}
