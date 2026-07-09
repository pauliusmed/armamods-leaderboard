import { Link } from 'react-router-dom';
import type { GameType } from '../../api/client';
import type { Mod } from '../../types';
import { ModThumbnail } from './ModThumbnail';

export type CoDeployedMod = NonNullable<Mod['coDeployed']>[number];

interface CoDeployTableProps {
  items: CoDeployedMod[];
  parentServerCount: number;
  game?: GameType;
}

/** Co-deploy stats — shared server count, not global mod popularity. */
export function CoDeployTable({ items, parentServerCount, game = 'reforger' }: CoDeployTableProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;

  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pl-4 pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Module
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Shared servers
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Of your deploys
              </th>
              <th className="hidden md:table-cell pl-4 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                Network rank
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const sharePct =
                parentServerCount > 0 ? Math.round((item.count / parentServerCount) * 100) : null;

              return (
                <CoDeployRow
                  key={item.id}
                  item={item}
                  sharePct={sharePct}
                  game={game}
                  modHref={`${gp}/mod/${item.id}`}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoDeployRow({
  item,
  sharePct,
  game,
  modHref,
}: {
  item: CoDeployedMod;
  sharePct: number | null;
  game: GameType;
  modHref: string;
}) {
  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="py-3 md:py-2.5 pl-4 pr-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <ModThumbnail modId={item.id} modName={item.name} game={game} size="sm" />
          <div className="min-w-0">
            <Link
              to={modHref}
              className="block text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-1"
              title={item.name}
            >
              {item.name}
            </Link>
          </div>
        </div>
      </td>
      <td className="py-3 md:py-2.5 px-4 text-right align-middle whitespace-nowrap">
        <span className="font-mono text-sm tabular-nums text-tactical-orange font-bold">
          {item.count.toLocaleString()}
        </span>
        <span className="sm:hidden block text-[9px] font-bold uppercase tracking-widest text-gray-600 mt-0.5">
          {sharePct != null ? `${sharePct}% of deploys` : '—'}
        </span>
      </td>
      <td className="hidden sm:table-cell py-3 md:py-2.5 px-4 text-right align-middle whitespace-nowrap">
        <span className="font-mono text-sm tabular-nums text-gray-300">
          {sharePct != null ? `${sharePct}%` : '—'}
        </span>
      </td>
      <td className="hidden md:table-cell py-3 md:py-2.5 pl-4 pr-4 text-right align-middle whitespace-nowrap">
        <span className="font-mono text-sm tabular-nums text-gray-500">
          {item.overallRank != null ? `#${item.overallRank}` : '—'}
        </span>
      </td>
    </tr>
  );
}
