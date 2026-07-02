import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useServers, type ConsoleFitFilter } from '../hooks/useServers';
import { ServerRow } from './ServerRow';
import { StatsHero } from './ui/StatsHero';
import { Pagination } from './ui/Pagination';
import { StatusState } from './ui/StatusState';
import { SortableTh } from './ui/SortableTh';
import { ListFilterBar } from './ui/ListFilterBar';
import type { GameType } from '../api/client';
import type { ServerSortBy } from '../hooks/useServers';
import { CONSOLE_FIT_FILTER_OPTIONS, SERVER_LIST_SORT_OPTIONS } from '../lib/modListFilters';

interface ServerListProps {
  game?: GameType;
}

export function ServerList({ game = 'reforger' }: ServerListProps) {
  const {
    filteredServers,
    totalItems,
    initialLoading,
    error,
    searchInput,
    setSearchInput,
    searchQuery,
    sortBy,
    sortDir,
    toggleSort,
    consoleFilter,
    setConsoleFilter,
    consoleLimitGb,
    consoleLimitBytes,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh
  } = useServers({ game });

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (initialLoading) return <StatusState type="loading" />;
  if (error) return <StatusState type="error" details={error} onAction={refresh} actionText="Try Again" />;
  if (stats.totalServers === 0 && !searchQuery) return <StatusState type="empty" message="No servers active" details="Check your filters or wait for the system to scan more servers." onAction={resetFilters} actionText="Reset Filters" />;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <StatsHero
        title="Active Server Network"
        subtitle="Real-time monitoring of all community and official servers using mods."
        stats={[
          { label: 'Active Servers', value: stats.totalServers },
          { label: 'Total Players', value: stats.totalPlayers },
          { label: 'Capacity (80%+)', value: stats.fullServers },
          { label: 'Network Spans', value: stats.totalPages }
        ]}
      />

      <ListFilterBar
        search={{
          label: '// SEARCH',
          value: searchInput,
          onChange: setSearchInput,
          placeholder: 'Search servers…',
          ariaLabel: 'Search servers by name',
          hint: (
            <>
              {initialLoading && (
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-tactical-orange animate-pulse">
                  Loading server network…
                </p>
              )}
              {!initialLoading && searchQuery && totalItems === 0 && (
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                  No servers match &quot;{searchQuery}&quot;
                </p>
              )}
            </>
          ),
        }}
        selects={[
          {
            id: 'sort',
            label: '// SORT',
            value: sortBy,
            onChange: (v) => {
              const col = v as ServerSortBy;
              if (col !== sortBy) toggleSort(col);
            },
            options: SERVER_LIST_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            ariaLabel: 'Sort servers by',
          },
          ...(game === 'reforger'
            ? [
                {
                  id: 'console',
                  label: '// CONSOLE',
                  value: consoleFilter,
                  onChange: (v: string) => setConsoleFilter(v as ConsoleFitFilter),
                  options: CONSOLE_FIT_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                  ariaLabel: 'Filter servers by console mod storage',
                },
              ]
            : []),
        ]}
        onReset={resetFilters}
        columns={game === 'reforger' ? 3 : 2}
        footer={
          game === 'reforger' ? (
            <>
              {consoleFilter !== 'all' && (
                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                  {totalItems} match · unknown sizes excluded from fit filter
                </p>
              )}
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
                Modpack = estimated download size ·{' '}
                <Link to="/storage-planner" className="text-tactical-orange hover:underline">
                  Storage Planner
                </Link>{' '}
                for multi-server planning
              </p>
            </>
          ) : undefined
        }
      />

      <div className="border border-white/5 bg-black/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <SortableTh
                  label="Rank"
                  sortKey="rank"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => toggleSort(key as ServerSortBy)}
                  className="pl-4 pr-2"
                />
                <SortableTh
                  label="Server"
                  sortKey="name"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => toggleSort(key as ServerSortBy)}
                  className="pr-4"
                />
                <SortableTh
                  label="Players"
                  sortKey="players"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => toggleSort(key as ServerSortBy)}
                  align="right"
                  className="px-4"
                />
                <SortableTh
                  label="Mods"
                  sortKey="mods"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => toggleSort(key as ServerSortBy)}
                  align="right"
                  className="px-4"
                />
                <SortableTh
                  label="Modpack"
                  sortKey="modpack"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => toggleSort(key as ServerSortBy)}
                  align="right"
                  className="hidden lg:table-cell pl-4 pr-4"
                />
              </tr>
            </thead>
            <tbody>
              {filteredServers.map((server) => (
                <ServerRow
                  key={server.id}
                  server={server}
                  game={game}
                  showConsoleFit={game === 'reforger'}
                  consoleLimitGb={consoleLimitGb}
                  consoleLimitBytes={consoleLimitBytes}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
}
