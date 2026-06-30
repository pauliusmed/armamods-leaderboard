import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useScenarios } from '../hooks/useScenarios';
import { ServerRow } from './ServerRow';
import { StatsHero } from './ui/StatsHero';
import { Pagination } from './ui/Pagination';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import type { GameType } from '../api/client';

interface ScenarioListProps {
  game?: GameType;
}

export function ScenarioList({ game = 'reforger' }: ScenarioListProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const gameLabel = game === 'reforger' ? 'Arma Reforger' : 'Arma 3';
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedName = searchParams.get('s') ?? '';

  const {
    scenarios,
    totalItems,
    initialLoading,
    error,
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    stats,
    selectedServers,
    serversLoading,
    getScenarioByName,
    resetFilters,
    refresh,
  } = useScenarios({ game, selectedName });

  const selectedScenario = selectedName ? getScenarioByName(selectedName) : null;

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

  if (initialLoading) return <StatusState type="loading" />;
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
        details="BattleMetrics has not reported active scenarios yet."
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
        url={`${gp || '/'}scenarios`}
      />

      <StatsHero
        title="Scenario Leaderboard"
        subtitle="Aggregated by active mission from BattleMetrics telemetry"
        stats={[
          { label: 'Scenarios', value: stats.uniqueScenarios },
          { label: 'Servers', value: stats.totalServers },
          { label: 'Players', value: stats.totalPlayers.toLocaleString() },
          { label: 'No Scenario', value: stats.unknownServers },
        ]}
      />

      <div className="bg-zinc-900/50 p-4 border border-white/5 backdrop-blur-sm shadow-2xl sticky top-28 z-40 transition-all hover:bg-zinc-900/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="group">
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 group-hover:text-tactical-orange transition-colors italic">
              // FILTER_SCENARIOS
            </label>
            <input
              type="search"
              placeholder="Scenario name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search scenarios"
              className="w-full px-8 py-3 bg-black/60 border border-white/10 focus:border-tactical-orange focus:bg-black transition-all font-black text-white placeholder-gray-700 uppercase tracking-widest text-[13px] rounded-none outline-none"
            />
            {searchInput && totalItems === 0 && (
              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                No scenarios match &quot;{searchInput}&quot;
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 italic">
              // DATA_METRIC
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort scenarios by"
              className="w-full px-8 py-3 bg-black/60 border border-white/10 focus:border-tactical-orange focus:bg-black transition-all font-black text-white appearance-none cursor-pointer uppercase tracking-widest text-[13px] rounded-none outline-none"
            >
              <option value="rank">LEADERBOARD_RANK</option>
              <option value="players">TOTAL_PERSONNEL</option>
              <option value="servers">DEPLOYMENT_IDX</option>
              <option value="fill">CAPACITY_IDX</option>
              <option value="name">IDENTIFIER_IDX</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border border-white/5 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  #
                </th>
                <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Scenario
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Servers
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Players
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                  Avg Fill
                </th>
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
                      <span
                        className={`block text-[13px] font-bold tracking-tight line-clamp-2 transition-colors ${
                          isSelected ? 'text-tactical-orange' : 'text-white group-hover:text-tactical-orange'
                        }`}
                      >
                        {scenario.name}
                      </span>
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

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {selectedScenario && (
        <section className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-2">
                // SCENARIO_DEPLOYMENTS
              </p>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {selectedScenario.name}
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                {selectedScenario.serverCount} servers · {selectedScenario.totalPlayers.toLocaleString()} players
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('s');
                setSearchParams(next, { replace: true });
              }}
              className="self-start sm:self-auto text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-tactical-orange border border-white/5 hover:border-tactical-orange/40 px-4 py-2 bg-zinc-900 transition-colors"
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
                    <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Rank
                    </th>
                    <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Server
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Players
                    </th>
                    <th className="hidden md:table-cell pl-4 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Mods
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedServers.map((server) => (
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
