import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { serversApi, modsApi, type GameType } from '../api/client';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { matchesServerSearch } from '../lib/searchMatch';
import { matchesConsoleFilter, type ConsoleFitFilter } from '../lib/serverModpack';
import { matchesBmStatusFilter, type BmStatusFilter } from '../lib/serverStatus';
import { loadStorageProfile } from '../lib/storageProfile';
import { useUrlListState, parseEnum, parsePositiveInt, parseSortDir } from './useUrlListState';
import type { Server } from '../types';

export type { ConsoleFitFilter };
export type { BmStatusFilter };

export type ServerSortBy = 'rank' | 'players' | 'name' | 'mods' | 'modpack';
export type ServerSortDir = 'asc' | 'desc';

const SERVER_SORTS: readonly ServerSortBy[] = ['rank', 'players', 'name', 'mods', 'modpack'];
const CONSOLE_FILTERS: readonly ConsoleFitFilter[] = ['all', 'vanilla', 'ps5', 'xbox-x', 'xbox-s'];
const BM_STATUS_FILTERS: readonly BmStatusFilter[] = ['all', 'online', 'offline'];

function modpackSortBytes(server: Server): number {
  if ((server.mods?.length ?? 0) === 0) return 0;
  return server.modpackEstimatedBytes ?? server.modpackKnownBytes ?? 0;
}

interface UseServersOptions {
  game?: GameType;
}

export function useServers(options: UseServersOptions = {}) {
  const { game = 'reforger' } = options;
  const [servers, setServers] = useState<Server[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, fullServers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const parseServerSort = useCallback(
    (raw: string | null) => parseEnum(SERVER_SORTS)(raw, 'rank'),
    []
  );
  const parseConsole = useCallback(
    (raw: string | null) => parseEnum(CONSOLE_FILTERS)(raw, 'all'),
    []
  );
  const parseBmStatus = useCallback(
    (raw: string | null) => parseEnum(BM_STATUS_FILTERS)(raw, 'all'),
    []
  );

  const [searchInput, setSearchInput] = useUrlListState({
    param: 'q',
    fallback: '',
    parse: (raw) => raw ?? '',
    serialize: (v) => v.trim() || null,
    delayMs: 300,
  });
  const [sortBy, setSortBy] = useUrlListState<ServerSortBy>({
    param: 'sort',
    fallback: 'rank',
    parse: parseServerSort,
    serialize: (v) => (v === 'rank' ? null : v),
  });
  const [sortDir, setSortDir] = useUrlListState<ServerSortDir>({
    param: 'dir',
    fallback: 'asc',
    parse: (raw) => parseSortDir(raw, 'asc'),
    serialize: (v) => (v === 'asc' ? null : v),
  });
  const [consoleFilter, setConsoleFilter] = useUrlListState<ConsoleFitFilter>({
    param: 'console',
    fallback: 'all',
    parse: parseConsole,
    serialize: (v) => (v === 'all' ? null : v),
  });
  const [bmStatusFilter, setBmStatusFilter] = useUrlListState<BmStatusFilter>({
    param: 'status',
    fallback: 'all',
    parse: parseBmStatus,
    serialize: (v) => (v === 'all' ? null : v),
  });
  const [currentPage, setCurrentPage] = useUrlListState<number>({
    param: 'page',
    fallback: 1,
    parse: (raw) => parsePositiveInt(raw, 1),
    serialize: (v) => (v <= 1 ? null : String(v)),
    mode: 'push',
  });
  const itemsPerPage = 24;
  // Monotonic request seq — search responses load up to 5000 rows and can resolve
  // out of order; a slow stale response must never overwrite a newer one.
  const loadSeqRef = useRef(0);

  const loadServers = useCallback(async (search?: string) => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      const query = search?.trim() || '';
      const [serversData, statsData] = await fetchWithRetry(
        () =>
          Promise.all([
            serversApi.getList(query ? 5000 : 200, 0, game, { search: query || undefined }),
            modsApi.getGlobalStats(game),
          ]),
        (attempt) => setRetryCount(attempt),
      );
      setRetryCount(0);
      if (seq !== loadSeqRef.current) return; // stale — a newer load already won
      const fetchedServers = serversData?.data || [];
      setServers(fetchedServers);
      setTotalServers(serversData?.meta?.total || fetchedServers.length);

      const fullCount =
        fetchedServers.length > 0
          ? fetchedServers.filter(
              (s: Server) => s.maxPlayers > 0 && s.players / s.maxPlayers >= 0.8
            ).length
          : 0;

      const fullRatio = fetchedServers.length > 0 ? fullCount / fetchedServers.length : 0;
      const estimatedFull = Math.round((serversData?.meta?.total || 0) * fullRatio);

      setGlobalStats({
        totalPlayers: statsData?.totalPlayers || 0,
        fullServers: estimatedFull || 0,
      });
      setError(null);
    } catch (err) {
      if (seq !== loadSeqRef.current) return; // stale failure — ignore
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
        const body = axiosErr.response?.data;
        setError(body?.message || body?.error || (err instanceof Error ? err.message : 'Failed to load servers'));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load servers');
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, sortBy, sortDir, consoleFilter, bmStatusFilter, setCurrentPage]);

  const toggleSort = useCallback((column: ServerSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir(column === 'name' ? 'asc' : column === 'rank' ? 'asc' : 'desc');
  }, [sortBy, setSortBy, setSortDir]);

  useEffect(() => {
    loadServers(searchInput);
  }, [loadServers, searchInput]);

  const allFilteredServers = useMemo(() => {
    if (!Array.isArray(servers)) return [];

    const query = searchInput.trim();
    const dir = sortDir === 'asc' ? 1 : -1;

    return servers
      .filter((server) => {
        if (query && !matchesServerSearch(server, query)) {
          return false;
        }
        if (game === 'reforger' && !matchesConsoleFilter(server, consoleFilter)) {
          return false;
        }
        if (!matchesBmStatusFilter(server.bmStatus, bmStatusFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rank') {
          const rankA = a.sqeRank ?? 99999;
          const rankB = b.sqeRank ?? 99999;
          if (rankA !== rankB) return dir * (rankA - rankB);
          return dir * ((a.players || 0) - (b.players || 0));
        }
        if (sortBy === 'players') return dir * (a.players - b.players);
        if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
        if (sortBy === 'mods') return dir * ((a.mods?.length ?? 0) - (b.mods?.length ?? 0));
        if (sortBy === 'modpack') return dir * (modpackSortBytes(a) - modpackSortBytes(b));
        return 0;
      });
  }, [servers, searchInput, sortBy, sortDir, consoleFilter, bmStatusFilter, game]);

  const paginatedServers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allFilteredServers.slice(start, start + itemsPerPage);
  }, [allFilteredServers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(allFilteredServers.length / itemsPerPage);
  const searchQuery = searchInput.trim();

  const consoleLimitGb = useMemo(() => {
    if (consoleFilter === 'ps5') return 25;
    if (consoleFilter === 'xbox-x') return 40;
    if (consoleFilter === 'xbox-s') return 20;
    return loadStorageProfile(game).availableGb;
  }, [consoleFilter, game]);

  const consoleLimitBytes = Math.round(consoleLimitGb * 1024 ** 3);

  const stats = useMemo(
    () => ({
      totalServers: searchQuery ? allFilteredServers.length : totalServers,
      totalPlayers: globalStats.totalPlayers,
      fullServers: globalStats.fullServers,
      totalPages,
    }),
    [totalServers, globalStats, totalPages, searchQuery, allFilteredServers.length]
  );

  const resetFilters = () => {
    setSearchInput('');
    setSortBy('rank');
    setSortDir('asc');
    setConsoleFilter('all');
    setBmStatusFilter('all');
    setCurrentPage(1);
  };

  return {
    servers,
    allFilteredServers,
    filteredServers: paginatedServers,
    totalItems: allFilteredServers.length,
    loading,
    initialLoading: loading && servers.length === 0,
    error,
    retryCount,
    searchInput,
    setSearchInput,
    searchQuery,
    sortBy,
    setSortBy,
    sortDir,
    toggleSort,
    consoleFilter,
    setConsoleFilter,
    bmStatusFilter,
    setBmStatusFilter,
    consoleLimitGb,
    consoleLimitBytes,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh: () => loadServers(searchInput),
  };
}
