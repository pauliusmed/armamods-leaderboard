import { useCallback, useEffect, useMemo, useState } from 'react';
import { scenariosApi, modsApi, type GameType } from '../api/client';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { useUrlListState, parsePositiveInt } from './useUrlListState';
import type { ScenarioRankingEntry, Server } from '../types';

export type ScenarioSortBy = 'players' | 'servers' | 'fill' | 'name' | 'rank';
export type ScenarioSortDir = 'asc' | 'desc';

function isScenarioSortBy(value: string | undefined): value is ScenarioSortBy {
  return value === 'players' || value === 'servers' || value === 'fill' || value === 'name' || value === 'rank';
}

const UNKNOWN_SCENARIO = '— Unknown —';

interface UseScenariosOptions {
  game?: GameType;
  selectedName?: string;
  sortParam?: string;
  dirParam?: string;
}

export function useScenarios(options: UseScenariosOptions = {}) {
  const { game = 'reforger', selectedName = '', sortParam, dirParam } = options;
  const [ranking, setRanking] = useState<ScenarioRankingEntry[]>([]);
  const [selectedServers, setSelectedServers] = useState<Server[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [totalServers, setTotalServers] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchInput, setSearchInput] = useUrlListState({
    param: 'q',
    fallback: '',
    parse: (raw) => raw ?? '',
    serialize: (v) => v.trim() || null,
    delayMs: 300,
  });
  const [sortBy, setSortBy] = useState<ScenarioSortBy>(isScenarioSortBy(sortParam) ? sortParam : 'players');
  const [sortDir, setSortDir] = useState<ScenarioSortDir>(dirParam === 'asc' || dirParam === 'desc' ? dirParam : 'desc');
  const [currentPage, setCurrentPage] = useUrlListState<number>({
    param: 'page',
    fallback: 1,
    parse: (raw) => parsePositiveInt(raw, 1),
    serialize: (v) => (v <= 1 ? null : String(v)),
    mode: 'push',
  });
  const itemsPerPage = 24;

  const loadScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const [scenarioData, statsData] = await fetchWithRetry(
        () =>
          Promise.all([
            scenariosApi.getRanking(game),
            modsApi.getGlobalStats(game),
          ]),
        (attempt) => setRetryCount(attempt),
      );
      setRetryCount(0);
      setRanking(scenarioData.data || []);
      setTotalServers(statsData?.totalServers || 0);
      setTotalPlayers(statsData?.totalPlayers || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, sortBy, setCurrentPage]);

  useEffect(() => {
    if (!selectedName) {
      setSelectedServers([]);
      return;
    }

    let cancelled = false;
    setServersLoading(true);
    scenariosApi
      .getServers(selectedName, game)
      .then((res) => {
        if (!cancelled) setSelectedServers(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setSelectedServers([]);
      })
      .finally(() => {
        if (!cancelled) setServersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedName, game]);

  const filteredScenarios = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    const filtered = query
      ? ranking.filter((s) => s.name.toLowerCase().includes(query))
      : ranking;

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'rank') return dir * (a.rank - b.rank);
      if (sortBy === 'players') {
        const byPlayers = dir * (a.totalPlayers - b.totalPlayers);
        return byPlayers !== 0 ? byPlayers : dir * (a.serverCount - b.serverCount);
      }
      if (sortBy === 'servers') return dir * (a.serverCount - b.serverCount);
      if (sortBy === 'fill') return dir * (a.avgFillPercent - b.avgFillPercent);
      return dir * a.name.localeCompare(b.name);
    });
  }, [ranking, searchInput, sortBy, sortDir]);

  const paginatedScenarios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredScenarios.slice(start, start + itemsPerPage);
  }, [filteredScenarios, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredScenarios.length / itemsPerPage);

  const stats = useMemo(() => {
    const known = ranking.filter((s) => s.name !== UNKNOWN_SCENARIO);
    const unknown = ranking.find((s) => s.name === UNKNOWN_SCENARIO);
    return {
      uniqueScenarios: known.length,
      totalServers,
      totalPlayers,
      unknownServers: unknown?.serverCount ?? 0,
      totalPages,
    };
  }, [ranking, totalServers, totalPlayers, totalPages]);

  const getScenarioByName = useCallback(
    (name: string) => ranking.find((s) => s.name === name) ?? null,
    [ranking],
  );

  const resetFilters = () => {
    setSearchInput('');
    setSortBy('players');
    setSortDir('desc');
    setCurrentPage(1);
  };

  const toggleSort = (column: ScenarioSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir(column === 'name' || column === 'rank' ? 'asc' : 'desc');
  };

  return {
    scenarios: paginatedScenarios,
    allScenarios: filteredScenarios,
    totalItems: filteredScenarios.length,
    selectedServers,
    serversLoading,
    loading,
    initialLoading: loading && ranking.length === 0,
    error,
    retryCount,
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    sortDir,
    toggleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    stats,
    getScenarioByName,
    resetFilters,
    refresh: loadScenarios,
  };
}
