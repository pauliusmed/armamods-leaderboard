import { useEffect, useState, useMemo, useCallback } from 'react';
import { modsApi, type GameType } from '../api/client';
import type { Mod } from '../types';

export type PlayerFilter = 'all' | 'high' | 'medium' | 'low';
export type ModSortBy = 'overall' | 'players' | 'servers' | 'name' | 'share' | 'author' | 'size';
export type SortDir = 'asc' | 'desc';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all');
  const [sortBy, setSortBy] = useState<ModSortBy>('overall');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const apiSortBy = sortBy === 'author' || sortBy === 'size' ? 'overall' : sortBy;

  const loadMods = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const [listData, statsData] = await Promise.all([
        modsApi.getPopular(itemsPerPage, offset, searchQuery, apiSortBy, sortDir, game),
        modsApi.getGlobalStats(game)
      ]);

      setMods(Array.isArray(listData?.data) ? listData.data : []);
      setTotalMods(listData?.meta?.total || 0);
      setGlobalStats(statsData || { totalPlayers: 0, totalServers: 0, totalMods: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, apiSortBy, sortDir, game]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, playerFilter, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMods();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, apiSortBy, sortDir, loadMods]);

  const filteredMods = useMemo(() => {
    if (!Array.isArray(mods)) return [];
    
    let filtered = [...mods];

    if (playerFilter !== 'all') {
      filtered = filtered.filter(mod => {
        const players = mod.totalPlayers || 0;
        if (playerFilter === 'high') return players >= 500;
        if (playerFilter === 'medium') return players >= 100 && players < 500;
        if (playerFilter === 'low') return players < 100;
        return true;
      });
    }

    return filtered;
  }, [mods, playerFilter]);

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
