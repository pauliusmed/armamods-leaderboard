import { useEffect } from 'react';
import { useMods } from '../hooks/useMods';
import { ModCard } from './ModCard';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { StatsHero } from './ui/StatsHero';
import { DonationCard } from './DonationCard';
import type { GameType } from '../api/client';

interface ModListProps {
  game?: GameType;
}

export function ModList({ game = 'reforger' }: ModListProps) {
  const {
    filteredMods,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    playerFilter,
    setPlayerFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh
  } = useMods({ game });

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (loading && filteredMods.length === 0) return <StatusState type="loading" />;

  if (error) return (
    <StatusState
      type="error"
      message={error}
      onAction={refresh}
      actionText="Retry Connection"
    />
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <SEO 
        title={`${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'} Mods - Leaderboard`}
        description={`Browse the most popular ${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'} mods. Compare real-time player counts, server usage, and find the best modules for your mission.`}
      />
      <StatsHero
        title="Mod Popularity Leaderboard"
        subtitle="Discover which mods are actually being played by the community right now."
        stats={[
          { label: 'Total Mods', value: stats.totalMods },
          { label: 'Active Players', value: stats.totalPlayers },
          { label: 'Total Servers', value: stats.totalServers },
          { label: 'Pages', value: stats.totalPages }
        ]}
      />

      {/* Sleeker Glassmorphic Filter Bar */}
      <div className="sticky top-4 z-50 mb-12">
        <div className="p-2 bg-zinc-950/60 backdrop-blur-md border border-white/5 flex flex-col md:flex-row items-center gap-4 transition-all">
          <div className="relative flex-1 w-full flex items-center px-4">
             <span className="text-gray-700 font-mono text-xs mr-4">📡</span>
            <input
              type="text"
              placeholder="SCAN FOR TITLES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 bg-transparent text-[11px] font-bold text-white uppercase tracking-widest outline-none transition-all placeholder:text-gray-800 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto pr-2">
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value as any)}
              className="px-4 py-3 bg-white/5 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:bg-white/10 hover:text-white transition-all outline-none"
            >
              <option value="all">PERSONNEL: ALL</option>
              <option value="high">ACTIVITY: HIGH</option>
              <option value="medium">ACTIVITY: MEDIUM</option>
              <option value="low">ACTIVITY: LOW</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-zinc-900 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest cursor-pointer hover:bg-zinc-800 hover:border-tactical-orange transition-all outline-none"
            >
              <option value="overall" className="bg-zinc-900 text-white">SORT: OVERALL RANK</option>
              <option value="players" className="bg-zinc-900 text-white">SORT: PERSONNEL RANK</option>
              <option value="servers" className="bg-zinc-900 text-white">SORT: SERVER RANK</option>
            </select>

            <button
              onClick={resetFilters}
              className="px-6 py-3 border border-white/5 hover:bg-white/5 text-[9px] font-black text-gray-700 hover:text-tactical-orange uppercase tracking-widest transition-all italic"
            >
              [ RST ]
            </button>
          </div>
        </div>
      </div>

      {filteredMods.length === 0 ? (
        <StatusState type="empty" message="No matches found" details="No mods match your current filter settings. Try resetting them." onAction={resetFilters} actionText="Clear Filters" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMods.map((mod) => (
            <ModCard
              key={mod.id}
              mod={mod}
              rank={mod.overallRank}
              game={game}
            />
          ))}
        </div>
      )}

      {/* Donation Section - after user sees the content */}
      {filteredMods.length > 0 && (
        <div className="mt-20">
          <DonationCard />
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-20 flex justify-center items-center gap-4 pb-12">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-8 py-4 bg-zinc-900 border border-white/10 text-[10px] font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
          >
            ← Previous Intel
          </button>
          <span className="px-8 py-4 bg-black/40 border border-white/5 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
            Module Slice <span className="text-white font-black">{currentPage}</span> / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-8 py-4 bg-zinc-900 border border-white/10 text-[10px] font-black text-white hover:bg-tactical-orange hover:text-black disabled:opacity-30 transition-all uppercase tracking-widest italic"
          >
            Next Sector →
          </button>
        </div>
      )}
    </div>
  );
}
