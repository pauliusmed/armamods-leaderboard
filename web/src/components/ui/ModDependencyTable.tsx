import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ModDependency } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';
import { OpenModStatsButton } from './OpenModStatsButton';
import { workshopPageUrl } from '../../lib/workshop';
import { SortableTh } from './SortableTh';

type DepSortBy = 'name' | 'players' | 'servers';
type DepSortDir = 'asc' | 'desc';

interface DependencyRowProps {
  dep: ModDependency;
  game?: GameType;
}

/** Workshop-required dependency — not a popularity leaderboard row. */
export function DependencyRow({ dep, game = 'reforger' }: DependencyRowProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const workshopUrl = workshopPageUrl(dep.id, game);
  const hasLive =
    (dep.totalPlayers != null && dep.totalPlayers > 0) ||
    (dep.serverCount != null && dep.serverCount > 0);

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="py-3 md:py-2.5 pl-4 pr-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <ModThumbnail modId={dep.id} modName={dep.name} game={game} size="sm" />
          <Link
            to={`${gp}/mod/${dep.id}`}
            className="min-w-0 text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-2"
            title={dep.name}
          >
            {dep.name}
          </Link>
        </div>
      </td>

      <td className="py-3 md:py-2.5 px-4 align-middle whitespace-nowrap">
        <span className="font-mono text-xs tabular-nums text-gray-400">
          {dep.version ? `v${dep.version}` : '—'}
        </span>
      </td>

      <td className="hidden md:table-cell py-3 md:py-2.5 px-4 align-middle">
        {hasLive ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {(dep.totalPlayers ?? 0).toLocaleString()} players · {dep.serverCount ?? 0} servers
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
            No BM telemetry
          </span>
        )}
      </td>

      <td className="py-3 md:py-2.5 pl-2 pr-4 text-right align-middle whitespace-nowrap">
        <div className="inline-flex items-center justify-end gap-1.5">
          <OpenModStatsButton modId={dep.id} modName={dep.name} game={game} />
          <a
            href={workshopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 px-2.5 py-1.5 border border-tactical-orange/40 text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:bg-tactical-orange hover:text-black transition-colors"
          >
            {game === 'arma3' ? 'Steam' : 'Workshop'} ↗
          </a>
        </div>
      </td>
    </tr>
  );
}

export function ModDependencyTable({ deps, game = 'reforger' }: { deps: ModDependency[]; game?: GameType }) {
  const [sortBy, setSortBy] = useState<DepSortBy>('name');
  const [sortDir, setSortDir] = useState<DepSortDir>('asc');
  const toggleSort = (column: DepSortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir(column === 'name' ? 'asc' : 'desc');
  };

  const sortedDeps = useMemo(() => {
    const dir = sortDir === 'asc' ? -1 : 1;
    return [...deps].sort((a, b) => {
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'players') return dir * ((a.totalPlayers ?? 0) - (b.totalPlayers ?? 0));
      return dir * ((a.serverCount ?? 0) - (b.serverCount ?? 0));
    });
  }, [deps, sortBy, sortDir]);

  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <SortableTh
                label="Required module"
                sortKey="name"
                activeSort={sortBy}
                sortDir={sortDir}
                onSort={(key) => toggleSort(key as DepSortBy)}
                className="pl-4 pr-4"
              />
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Version
              </th>
              <SortableTh
                label="Live activity"
                sortKey="players"
                activeSort={sortBy}
                sortDir={sortDir}
                onSort={(key) => toggleSort(key as DepSortBy)}
                className="hidden md:table-cell px-4"
              />
              <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDeps.map((dep) => (
              <DependencyRow key={dep.id} dep={dep} game={game} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
