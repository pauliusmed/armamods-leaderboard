import { useEffect, useMemo } from 'react';
import { useMods } from '../hooks/useMods';
import { useModAuthors } from '../hooks/useModAuthors';
import { ModRow } from './ModRow';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { StatsHero } from './ui/StatsHero';
import { ModListSkeleton } from './ui/ModListSkeleton';
import { DonationCard } from './DonationCard';
import { SortableTh } from './ui/SortableTh';
import type { GameType } from '../api/client';
import type { ModSortBy } from '../hooks/useMods';

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

  const authors = useModAuthors(
    filteredMods.map((m) => m.id),
    game
  );

  const displayMods = useMemo(() => {
    if (sortBy !== 'author') return filteredMods;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredMods].sort((a, b) => {
      const aa = (authors[a.id] || '').toLowerCase();
      const ab = (authors[b.id] || '').toLowerCase();
      if (!aa && !ab) return 0;
      if (!aa) return 1;
      if (!ab) return -1;
      return dir * aa.localeCompare(ab);
    });
  }, [filteredMods, sortBy, sortDir, authors]);

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

      <div className="sticky top-[72px] sm:top-[84px] z-30 mb-12">
        <div className="p-2 bg-zinc-950/60 backdrop-blur-md border border-white/5 flex flex-col md:flex-row items-center gap-4 transition-all">
          <div className="relative flex-1 w-full flex items-center px-4">
             <span className="text-gray-700 font-mono text-xs mr-4" aria-hidden="true">📡</span>
            <input
              type="search"
              placeholder="SCAN FOR TITLES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search mods by name"
              className="w-full py-3 bg-transparent text-[13px] font-bold text-white uppercase tracking-widest outline-none transition-all placeholder:text-gray-800 font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto pr-2 min-w-0">
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value as any)}
              aria-label="Filter by player activity"
              className="w-full sm:flex-1 sm:min-w-0 px-4 py-3 bg-white/5 border border-white/5 text-xs font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:bg-white/10 hover:text-white transition-all outline-none"
            >
              <option value="all">PERSONNEL: ALL</option>
              <option value="high">ACTIVITY: HIGH</option>
              <option value="medium">ACTIVITY: MEDIUM</option>
              <option value="low">ACTIVITY: LOW</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => toggleSort(e.target.value as typeof sortBy)}
              aria-label="Sort mods by"
              className="w-full sm:flex-1 sm:min-w-0 px-4 py-3 bg-zinc-900 border border-white/10 text-xs font-black text-white uppercase tracking-widest cursor-pointer hover:bg-zinc-800 hover:border-tactical-orange transition-all outline-none"
            >
              <option value="overall" className="bg-zinc-900 text-white">SORT: RANK</option>
              <option value="name" className="bg-zinc-900 text-white">SORT: NAME</option>
              <option value="author" className="bg-zinc-900 text-white">SORT: AUTHOR</option>
              <option value="players" className="bg-zinc-900 text-white">SORT: PERSONNEL</option>
              <option value="servers" className="bg-zinc-900 text-white">SORT: DEPLOY</option>
              <option value="share" className="bg-zinc-900 text-white">SORT: SHARE</option>
            </select>

            <button
              onClick={resetFilters}
              className="w-full sm:w-auto px-6 py-3 border border-white/5 hover:bg-white/5 text-xs font-black text-gray-700 hover:text-tactical-orange uppercase tracking-widest transition-all italic"
            >
              [ RST ]
            </button>
          </div>
        </div>
      </div>

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
                    label="Share"
                    sortKey="share"
                    activeSort={sortBy}
                    sortDir={sortDir}
                    onSort={(key) => toggleSort(key as ModSortBy)}
                    align="right"
                    className="hidden md:table-cell pl-4 pr-4"
                  />
                  <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                    Workshop
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayMods.map((mod) => (
                  <ModRow
                    key={mod.id}
                    mod={mod}
                    rank={mod.overallRank}
                    game={game}
                    variant="leaderboard"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!initialLoading && displayMods.length > 0 && (
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
