import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ModDependency } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';
import { workshopPageUrl } from '../../lib/workshop';

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
        <a
          href={workshopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-2.5 py-1.5 border border-tactical-orange/40 text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:bg-tactical-orange hover:text-black transition-colors"
        >
          {game === 'arma3' ? 'Steam' : 'Workshop'} ↗
        </a>
      </td>
    </tr>
  );
}

export function ModDependencyTable({ children }: { children: ReactNode }) {
  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pl-4 pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Required module
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Version
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Live activity
              </th>
              <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Workshop
              </th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
