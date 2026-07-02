import { useEffect } from 'react';
import { useServers } from '../hooks/useServers';
import { ServerRow } from './ServerRow';
import { StatsHero } from './ui/StatsHero';
import { Pagination } from './ui/Pagination';
import { StatusState } from './ui/StatusState';
import { SortableTh } from './ui/SortableTh';
import type { GameType } from '../api/client';
import type { ServerSortBy } from '../hooks/useServers';

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

      <div className="bg-zinc-900/50 p-4 border border-white/5 backdrop-blur-sm shadow-2xl sticky top-28 z-40 transition-all hover:bg-zinc-900/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="group">
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 group-hover:text-tactical-orange transition-colors italic">// SCAN_REMOTE_SERVERS</label>
            <input
              type="search"
              placeholder="Server name (any word order)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search servers by name"
              className="w-full px-8 py-3 bg-black/60 border border-white/10 focus:border-tactical-orange focus:bg-black transition-all font-black text-white placeholder-gray-700 uppercase tracking-widest text-[13px] rounded-none outline-none"
            />
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
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 italic">// DATA_METRIC</label>
            <select
              value={sortBy}
              onChange={(e) => {
                const col = e.target.value as ServerSortBy;
                if (col !== sortBy) toggleSort(col);
              }}
              aria-label="Sort servers by"
              className="w-full px-8 py-3 bg-black/60 border border-white/10 focus:border-tactical-orange focus:bg-black transition-all font-black text-white appearance-none cursor-pointer uppercase tracking-widest text-[13px] rounded-none outline-none"
            >
              <option value="rank">SQE_LEADERBOARD</option>
              <option value="players">PERSONNEL_IDX</option>
              <option value="mods">MODULE_IDX</option>
              <option value="modpack">MODPACK_SIZE</option>
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
                  className="hidden md:table-cell px-4"
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
                <ServerRow key={server.id} server={server} game={game} />
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
