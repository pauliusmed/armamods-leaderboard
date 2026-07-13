import { useEffect, useMemo } from 'react';
import { useMods } from '../hooks/useMods';
import { useModFavorites } from '../hooks/useModFavorites';
import { excludeFavoriteModsFromList, usePinnedFavoriteMods } from '../hooks/usePinnedFavoriteMods';
import { ModRow } from './ModRow';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { StatsHero } from './ui/StatsHero';
import { ModListSkeleton } from './ui/ModListSkeleton';
import { DonationCard } from './DonationCard';
import { Pagination } from './ui/Pagination';
import { ModLeaderboardHead, MOD_LEADERBOARD_COL_COUNT } from './ui/ModLeaderboardHead';
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
    retryCount,
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

  const { favoriteIds, toggle, isFavorite } = useModFavorites(game);
  const showFavoritesPin =
    currentPage === 1 && !searchQuery.trim() && playerFilter === 'all';
  const { pinnedMods, loadingPinned } = usePinnedFavoriteMods(
    game,
    favoriteIds,
    filteredMods,
    showFavoritesPin
  );
  const listMods = useMemo(
    () => excludeFavoriteModsFromList(game, filteredMods, favoriteIds, showFavoritesPin),
    [game, filteredMods, favoriteIds, showFavoritesPin]
  );

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
        <>
          {retryCount > 0 && (
            <div className="mb-4 p-3 border border-signal-critical/30 bg-red-950/10 text-signal-critical text-[10px] font-black uppercase tracking-widest animate-pulse text-center">
              ⚠ UPLINK LOST — Auto-retrying ({retryCount}/3)...
            </div>
          )}
          <ModListSkeleton />
        </>
      ) : filteredMods.length === 0 && pinnedMods.length === 0 ? (
        <StatusState type="empty" message="No matches found" details="No mods match your current filter settings. Try resetting them." onAction={resetFilters} actionText="Clear Filters" />
      ) : (
        <div
          className={`border border-white/5 bg-black/40 ${loading ? 'opacity-70' : ''}`}
          aria-busy={loading}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[18rem] border-collapse">
              <ModLeaderboardHead sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <tbody>
                {showFavoritesPin && (pinnedMods.length > 0 || loadingPinned) && (
                  <>
                    <tr className="border-b border-white/10 bg-[#172635]">
                      <td
                        colSpan={MOD_LEADERBOARD_COL_COUNT}
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-tactical-orange"
                      >
                        ★ Favorites · pinned to top
                      </td>
                    </tr>
                    {loadingPinned && pinnedMods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={MOD_LEADERBOARD_COL_COUNT}
                          className="py-4 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest animate-pulse"
                        >
                          Loading favorites…
                        </td>
                      </tr>
                    ) : (
                      pinnedMods.map((mod) => (
                        <ModRow
                          key={`fav-${mod.id}`}
                          mod={mod}
                          rank={mod.overallRank}
                          game={game}
                          variant="leaderboard"
                          pinned
                          isFavorite={isFavorite(mod.id)}
                          onToggleFavorite={() => toggle(mod.id)}
                        />
                      ))
                    )}
                  </>
                )}
                {listMods.map((mod, index) => (
                  <ModRow
                    key={mod.id}
                    mod={mod}
                    rank={sortBy === 'overall' ? mod.overallRank : (currentPage - 1) * itemsPerPage + index + 1}
                    game={game}
                    variant="leaderboard"
                    isFavorite={isFavorite(mod.id)}
                    onToggleFavorite={() => toggle(mod.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="border-t border-white/5">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                sliceLabel="Module Slice"
                className="py-6 pb-8"
              />
            </div>
          )}
        </div>
      )}

      {!initialLoading && (listMods.length > 0 || pinnedMods.length > 0) && (
        <div className="border-t border-white/5 pt-10">
          <DonationCard />
        </div>
      )}
    </div>
  );
}
