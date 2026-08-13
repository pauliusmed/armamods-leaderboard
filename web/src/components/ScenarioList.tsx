import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useScenarios } from '../hooks/useScenarios';
import { ServerRow } from './ServerRow';
import { StatsHero } from './ui/StatsHero';
import { Pagination } from './ui/Pagination';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { ListFilterBar } from './ui/ListFilterBar';
import { SortableTh } from './ui/SortableTh';
import { scenarioDetailHref, scenarioKindBadgeClass, scenarioKindLabel } from '../lib/scenarioLinks';
import { DATA_STALE_HERO_NOTE, SCENARIO_EMPTY, SCENARIO_SUBTITLE } from '../lib/siteCopy';
import { SCENARIO_LIST_SORT_OPTIONS } from '../lib/modListFilters';
import { useDataFreshness, formatSyncAge } from '../hooks/useDataFreshness';
import { useListScrollRestoration } from '../hooks/useListScrollRestoration';
import type { ScenarioSortBy } from '../hooks/useScenarios';
import type { GameType } from '../api/client';
import type { ScenarioRankingEntry } from '../types';

interface ScenarioListProps {
  game?: GameType;
}

function ScenarioNameCell({
  scenario,
  isSelected,
  gamePrefix,
}: {
  scenario: ScenarioRankingEntry;
  isSelected: boolean;
  gamePrefix: string;
}) {
  const detailHref = scenarioDetailHref(scenario, gamePrefix);
  const label = scenario.displayName ?? scenario.name;

  return (
    <div className="space-y-1">
      {detailHref ? (
        <Link
          to={detailHref}
          onClick={(e) => e.stopPropagation()}
          className={`block text-[13px] font-bold tracking-tight line-clamp-2 transition-colors ${
            isSelected ? 'text-tactical-orange' : 'text-white hover:text-tactical-orange'
          }`}
        >
          {label}
        </Link>
      ) : (
        <span
          className={`block text-[13px] font-bold tracking-tight line-clamp-2 transition-colors ${
            isSelected ? 'text-tactical-orange' : 'text-white group-hover:text-tactical-orange'
          }`}
        >
          {scenario.name}
        </span>
      )}
      {scenario.name !== label && (
        <span className="block text-[10px] text-gray-600 font-mono truncate">{scenario.name}</span>
      )}
      {scenario.kind !== 'unknown' && (
        <span
          className={`md:hidden inline-block text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 border ${scenarioKindBadgeClass(scenario.kind)}`}
        >
          {scenarioKindLabel(scenario.kind)}
        </span>
      )}
      <div className="md:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-gray-500">
        <span>{Math.round(scenario.avgFillPercent)}% fill</span>
        {scenario.topServer && (
          <Link
            to={`${gamePrefix}/server/${scenario.topServer.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-gray-400 hover:text-tactical-orange break-words max-w-full"
          >
            {scenario.topServer.name}
          </Link>
        )}
      </div>
    </div>
  );
}

export function ScenarioList({ game = 'reforger' }: ScenarioListProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const gameLabel = game === 'reforger' ? 'Arma Reforger' : 'Arma 3';
  const freshness = useDataFreshness(game);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedName = searchParams.get('s') ?? '';
  const sortParam = searchParams.get('sort') ?? undefined;
  const dirParam = searchParams.get('dir') ?? undefined;

  const {
    scenarios,
    totalItems,
    initialLoading,
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
    selectedServers,
    serversLoading,
    getScenarioByName,
    resetFilters,
    refresh,
  } = useScenarios({ game, selectedName, sortParam, dirParam });

  const selectedScenario = selectedName ? getScenarioByName(selectedName) : null;

  type DeployedSortBy = 'rank' | 'name' | 'players' | 'mods';
  const [deployedSortBy, setDeployedSortBy] = useState<DeployedSortBy>('rank');
  const [deployedSortDir, setDeployedSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleDeployedSort = (column: DeployedSortBy) => {
    if (deployedSortBy === column) {
      setDeployedSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setDeployedSortBy(column);
    setDeployedSortDir(column === 'name' || column === 'rank' ? 'asc' : 'desc');
  };
  const sortedDeployedServers = useMemo(() => {
    const dir = deployedSortDir === 'asc' ? -1 : 1;
    return [...selectedServers].sort((a, b) => {
      if (deployedSortBy === 'rank') return dir * ((a.sqeRank ?? 99999) - (b.sqeRank ?? 99999));
      if (deployedSortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (deployedSortBy === 'players') return dir * (a.players - b.players);
      return dir * ((a.mods?.length ?? 0) - (b.mods?.length ?? 0));
    });
  }, [selectedServers, deployedSortBy, deployedSortDir]);

  // Restore scroll position when coming back (POP) — URL state is restored by useScenarios.
  useListScrollRestoration(`scenarios:${game}:${currentPage}`);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const toggleScenario = (name: string) => {
    const next = new URLSearchParams(searchParams);
    if (selectedName === name) {
      next.delete('s');
    } else {
      next.set('s', name);
    }
    setSearchParams(next, { replace: true });
  };

  const handleSort = (column: ScenarioSortBy) => {
    const next = new URLSearchParams(searchParams);
    if (sortBy === column) {
      next.set('dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      next.set('sort', column);
      next.set('dir', column === 'name' || column === 'rank' ? 'asc' : 'desc');
    }
    setSearchParams(next, { replace: true });
    toggleSort(column);
  };

  if (initialLoading) return <StatusState type="loading" retryCount={retryCount} />;
  if (error) {
    return (
      <StatusState type="error" details={error} onAction={refresh} actionText="Try Again" />
    );
  }
  if (stats.uniqueScenarios === 0 && !searchInput) {
    return (
      <StatusState
        type="empty"
        message="No scenario data"
        details={SCENARIO_EMPTY}
        onAction={resetFilters}
        actionText="Reset Filters"
      />
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SEO
        title={`${gameLabel} Scenario Leaderboard`}
        description={`Popular scenarios and missions across ${gameLabel} modded servers — ranked by active players and deployments.`}
        keywords={`${gameLabel}, scenario leaderboard, mission popularity, server scenarios`}
        url={game === 'arma3' ? '/arma3/scenarios' : '/scenarios'}
      />

      <StatsHero
        title="Scenario Leaderboard"
        subtitle={SCENARIO_SUBTITLE}
        note={freshness.isStale ? DATA_STALE_HERO_NOTE(formatSyncAge(freshness.staleHours)) : null}
        noteTone={freshness.isStale ? 'warning' : 'default'}
        stats={[
          { label: 'Scenarios', value: stats.uniqueScenarios },
          { label: 'Servers', value: stats.totalServers },
          { label: 'Players', value: stats.totalPlayers.toLocaleString() },
          { label: 'No Scenario', value: stats.unknownServers },
        ]}
      />

      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest -mt-6">
        Workshop scenarios link to their mod page ·{' '}
        <Link to={`${gp}/scenarios/official`} className="text-tactical-orange hover:underline">
          Official scenarios reference
        </Link>
      </p>

      <ListFilterBar
        search={{
          label: '// SEARCH',
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search scenarios…',
          ariaLabel: 'Search scenarios',
          hint:
            searchInput && totalItems === 0 ? (
              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                No scenarios match &quot;{searchInput}&quot;
              </p>
            ) : undefined,
        }}
        selects={[
          {
            id: 'sort',
            label: '// SORT',
            value: sortBy,
            onChange: (v) => setSortBy(v as typeof sortBy),
            options: SCENARIO_LIST_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            ariaLabel: 'Sort scenarios by',
          },
        ]}
        columns={2}
      />

      <div className="border border-white/5 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <SortableTh
                  label="#"
                  sortKey="rank"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => handleSort(key as typeof sortBy)}
                  className="pl-4 pr-2"
                />
                <SortableTh
                  label="Scenario"
                  sortKey="name"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => handleSort(key as typeof sortBy)}
                  className="pr-4"
                />
                <SortableTh
                  label="Servers"
                  sortKey="servers"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => handleSort(key as typeof sortBy)}
                  align="right"
                  className="px-4"
                />
                <SortableTh
                  label="Players"
                  sortKey="players"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => handleSort(key as typeof sortBy)}
                  align="right"
                  className="px-4"
                />
                <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Type
                </th>
                <SortableTh
                  label="Avg Fill"
                  sortKey="fill"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => handleSort(key as typeof sortBy)}
                  align="right"
                  className="hidden md:table-cell px-4"
                />
                <th className="hidden lg:table-cell pl-4 pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Top Server
                </th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario, index) => {
                const displayRank =
                  sortBy === 'rank' ? scenario.rank : (currentPage - 1) * 24 + index + 1;
                const isSelected = selectedName === scenario.name;
                const isTop3 = displayRank <= 3;

                return (
                  <tr
                    key={scenario.name}
                    className={`group border-b border-white/5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-tactical-orange/10' : 'hover:bg-white/[0.03]'
                    }`}
                    onClick={() => toggleScenario(scenario.name)}
                  >
                    <td className="py-3 pl-4 pr-2 align-middle">
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'
                        }`}
                      >
                        {String(displayRank).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <ScenarioNameCell scenario={scenario} isSelected={isSelected} gamePrefix={gp} />
                    </td>
                    <td className="py-3 px-4 text-right align-middle">
                      <span className="font-mono text-sm tabular-nums text-gray-300">
                        {scenario.serverCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right align-middle">
                      <span className="font-mono text-sm tabular-nums text-white">
                        {scenario.totalPlayers.toLocaleString()}
                      </span>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 align-middle">
                      {scenario.kind !== 'unknown' ? (
                        <span
                          className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 border ${scenarioKindBadgeClass(scenario.kind)}`}
                        >
                          {scenarioKindLabel(scenario.kind)}
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-right align-middle">
                      <span className="font-mono text-sm tabular-nums text-gray-400">
                        {Math.round(scenario.avgFillPercent)}%
                      </span>
                    </td>
                    <td className="hidden lg:table-cell py-3 pl-4 pr-4 align-middle">
                      {scenario.topServer ? (
                        <Link
                          to={`${gp}/server/${scenario.topServer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-bold text-gray-500 hover:text-tactical-orange transition-colors line-clamp-1"
                        >
                          {scenario.topServer.name}
                        </Link>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} className="pb-12" />

      {selectedScenario && (
        <section className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-2">
                // SCENARIO_DEPLOYMENTS
              </p>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {selectedScenario.displayName ?? selectedScenario.name}
              </h2>
              {selectedScenario.displayName && selectedScenario.displayName !== selectedScenario.name && (
                <p className="text-[10px] font-mono text-gray-600 mt-1">{selectedScenario.name}</p>
              )}
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                {selectedScenario.serverCount} servers · {selectedScenario.totalPlayers.toLocaleString()} players
              </p>
              {scenarioDetailHref(selectedScenario, gp) && (
                <Link
                  to={scenarioDetailHref(selectedScenario, gp)!}
              className="inline-block mt-3 min-h-11 text-[10px] font-black uppercase tracking-[0.2em] text-tactical-orange border border-tactical-orange/30 hover:bg-tactical-orange/10 px-3 py-1.5 transition-colors"
              >
                {selectedScenario.kind === 'workshop' ? 'Open workshop mod →' : 'Official scenario →'}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('s');
                setSearchParams(next, { replace: true });
              }}
              className="self-start sm:self-auto min-h-11 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-tactical-orange border border-white/5 hover:border-tactical-orange/40 px-4 py-2 bg-zinc-900 transition-colors"
              >
              Close
            </button>
          </div>

          <div className="border border-white/5 bg-black/40">
            {serversLoading ? (
              <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                Loading deployments…
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <SortableTh
                      label="Rank"
                      sortKey="rank"
                      activeSort={deployedSortBy}
                      sortDir={deployedSortDir}
                      onSort={(key) => toggleDeployedSort(key as DeployedSortBy)}
                      className="pl-4 pr-2"
                    />
                    <SortableTh
                      label="Server"
                      sortKey="name"
                      activeSort={deployedSortBy}
                      sortDir={deployedSortDir}
                      onSort={(key) => toggleDeployedSort(key as DeployedSortBy)}
                      className="pr-4"
                    />
                    <SortableTh
                      label="Players"
                      sortKey="players"
                      activeSort={deployedSortBy}
                      sortDir={deployedSortDir}
                      onSort={(key) => toggleDeployedSort(key as DeployedSortBy)}
                      align="right"
                      className="px-4"
                    />
                    <SortableTh
                      label="Mods"
                      sortKey="mods"
                      activeSort={deployedSortBy}
                      sortDir={deployedSortDir}
                      onSort={(key) => toggleDeployedSort(key as DeployedSortBy)}
                      align="right"
                      className="hidden md:table-cell pl-4 pr-4"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedDeployedServers.map((server) => (
                    <ServerRow key={server.id} server={server} game={game} />
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
