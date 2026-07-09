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
        <ModListSkeleton />
      ) : filteredMods.length === 0 && pinnedMods.length === 0 ? (
        <StatusState type="empty" message="No matches found" details="No mods match your current filter settings. Try resetting them." onAction={resetFilters} actionText="Clear Filters" />
      ) : (
        <div className="space-y-4">
          {showFavoritesPin && (pinnedMods.length > 0 || loadingPinned) && (
            <div className="border border-tactical-orange/25 bg-tactical-orange/[0.03]">
              <div className="px-4 py-2.5 border-b border-tactical-orange/20">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tactical-orange">
                  ★ Favorites · pinned to top
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {loadingPinned && pinnedMods.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest animate-pulse">
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
