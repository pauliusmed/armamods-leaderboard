import { useEffect } from 'react';
import { useMods } from '../hooks/useMods';
import { ModRow } from './ModRow';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { StatsHero } from './ui/StatsHero';
import { ModListSkeleton } from './ui/ModListSkeleton';
import { DonationCard } from './DonationCard';
import { SortableTh } from './ui/SortableTh';
import { ListFilterBar } from './ui/ListFilterBar';
import type { GameType } from '../api/client';
import type { ModSortBy } from '../hooks/useMods';
import { ACTIVITY_FILTER_OPTIONS, MOD_LEADERBOARD_SORT_OPTIONS } from '../lib/modListFilters';

interface ModListProps {
  game?: GameType;
}

export function ModList({ game = 'reforger' }: ModListProps) {
  const {
    filteredMods,
    loading,
    initialLoading,
    error,
    searchQuery,
    setSearchQuery,
    playerFilter,
    setPlayerFilter,
    sortBy,
    sortDir,
    toggleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh
  } = useMods({ game });

  const itemsPerPage = 24;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (error && initialLoading) {
    return (
      <StatusState
        type="error"
        message={error}
        onAction={refresh}
        actionText="Retry Connection"
      />
    );
  }

  const statPlaceholder = initialLoading ? '…' : undefined;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <SEO 
        title={`${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'} Mods - Leaderboard`}
        description={`Browse the most popular ${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'} mods. Compare real-time player counts, server usage, and find the best modules for your mission.`}
      />
      <StatsHero
        title="Mod Popularity Leaderboard"
        subtitle="Supplements the workshop with live player counts — see what is deployed right now, not just subscribed."
        stats={[
          { label: 'Total Mods', value: statPlaceholder ?? stats.totalMods },
          { label: 'Active Players', value: statPlaceholder ?? stats.totalPlayers },
          { label: 'Total Servers', value: statPlaceholder ?? stats.totalServers },
          { label: 'Pages', value: statPlaceholder ?? stats.totalPages }
        ]}
      />

      <ListFilterBar
        search={{
          label: '// SEARCH',
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search mods or author…',
          ariaLabel: 'Search mods by name, id, or workshop author',
        }}
        selects={[
          {
            id: 'activity',
            label: '// ACTIVITY',
            value: playerFilter,
            onChange: (v) => setPlayerFilter(v as typeof playerFilter),
            options: ACTIVITY_FILTER_OPTIONS,
            ariaLabel: 'Filter mods by player activity',
          },
          {
            id: 'sort',
            label: '// SORT',
            value: sortBy,
            onChange: (v) => toggleSort(v as ModSortBy),
            options: MOD_LEADERBOARD_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            ariaLabel: 'Sort mods by',
          },
        ]}
        onReset={resetFilters}
        columns={3}
      />

      {initialLoading ? (
        <ModListSkeleton />
      ) : filteredMods.length === 0 ? (
        <StatusState type="empty" message="No matches found" details="No mods match your current filter settings. Try resetting them." onAction={resetFilters} actionText="Clear Filters" />
      ) : (
        <div
          className={`border border-white/5 bg-black/40 ${loading ? 'opacity-70' : ''}`}
          aria-busy={loading}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <SortableTh
                    label="Rank"
                    sortKey="overall"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    className="pl-4 pr-2"
                  />
                  <SortableTh
                    label="Module"
                    sortKey="name"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    className="pr-4"
                  />
                  <SortableTh
                    label="Author"
                    sortKey="author"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    className="hidden md:table-cell px-3"
                  />
                  <SortableTh
                    label="Personnel"
                    sortKey="players"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    align="right"
                    className="px-4"
                  />
                  <SortableTh
                    label="Deploy"
                    sortKey="servers"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    align="right"
                    className="hidden md:table-cell px-4"
                  />
                  <SortableTh
                    label="Size"
                    sortKey="size"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    align="right"
                    className="hidden md:table-cell px-4"
                  />
                  <SortableTh
                    label="Share"
                    sortKey="share"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    align="right"
                    className="hidden md:table-cell pl-4 pr-4"
                  />
                  <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMods.map((mod, index) => (
                  <ModRow
                    key={mod.id}
                    mod={mod}
                    rank={sortBy === 'overall' ? mod.overallRank : (currentPage - 1) * itemsPerPage + index + 1}
                    game={game}
                    variant="leaderboard"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!initialLoading && filteredMods.length > 0 && (
        <div className="mt-20">
          <DonationCard />
        </div>
      )}

      {!initialLoading && totalPages > 1 && (
        <div className="mt-20 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 pb-12">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-zinc-900 border border-white/10 text-xs font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
          >
            <span className="sm:hidden">← Prev</span>
            <span className="hidden sm:inline">← Previous Intel</span>
          </button>
          <span className="w-full sm:w-auto text-center px-6 sm:px-8 py-4 bg-black/40 border border-white/5 text-xs font-mono text-gray-500 uppercase tracking-widest">
            <span className="sm:hidden">Page <span className="text-white font-black">{currentPage}</span> / {totalPages}</span>
            <span className="hidden sm:inline">Module Slice <span className="text-white font-black">{currentPage}</span> / {totalPages}</span>
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-zinc-900 border border-white/10 text-xs font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
          >
            <span className="sm:hidden">Next →</span>
            <span className="hidden sm:inline">Next Sector →</span>
          </button>
        </div>
      )}
    </div>
  );
}
