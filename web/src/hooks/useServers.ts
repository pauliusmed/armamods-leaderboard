import { useEffect, useState, useMemo, useCallback } from 'react';
import { serversApi, modsApi, type GameType } from '../api/client';
import { matchesServerSearch } from '../lib/searchMatch';
import type { Server } from '../types';

export type ServerSortBy = 'rank' | 'players' | 'name' | 'mods' | 'modpack';
export type ServerSortDir = 'asc' | 'desc';

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
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<ServerSortBy>('rank');
  const [sortDir, setSortDir] = useState<ServerSortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      const [serversData, statsData] = await Promise.all([
        serversApi.getList(5000, 0, game, { full: true }),
        modsApi.getGlobalStats(game),
      ]);
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
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, sortBy, sortDir]);

  const toggleSort = useCallback((column: ServerSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir(column === 'name' ? 'asc' : column === 'rank' ? 'asc' : 'desc');
  }, [sortBy]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const filteredServers = useMemo(() => {
    if (!Array.isArray(servers)) return [];

    const query = searchInput.trim();
    const dir = sortDir === 'asc' ? 1 : -1;

    return servers
      .filter((server) => {
        if (query && !matchesServerSearch(server, query)) {
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
  }, [servers, searchInput, sortBy, sortDir]);

  const paginatedServers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServers.slice(start, start + itemsPerPage);
  }, [filteredServers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const searchQuery = searchInput.trim();

  const stats = useMemo(
    () => ({
      totalServers: searchQuery ? filteredServers.length : totalServers,
      totalPlayers: globalStats.totalPlayers,
      fullServers: globalStats.fullServers,
      totalPages,
    }),
    [totalServers, globalStats, totalPages, searchQuery, filteredServers.length]
  );

  const resetFilters = () => {
    setSearchInput('');
    setSortBy('rank');
    setSortDir('asc');
    setCurrentPage(1);
  };

  return {
    servers,
    filteredServers: paginatedServers,
    totalItems: filteredServers.length,
    loading,
    initialLoading: loading && servers.length === 0,
    error,
    searchInput,
    setSearchInput,
    searchQuery,
    sortBy,
    setSortBy,
    sortDir,
    toggleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh: loadServers,
  };
}
