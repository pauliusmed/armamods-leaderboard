import { Link } from 'react-router-dom';
import type { TrendingMod } from '../types';
import type { GameType } from '../api/client';
import { ModThumbnail } from './ui/ModThumbnail';
import { ModWorkshopStatusBadge, useWorkshopStatus } from './ui/ModWorkshopStatus';
import { workshopPageUrl } from '../lib/workshop';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendRowProps {
  mod: TrendingMod;
  category: TrendCategory;
  game?: GameType;
}

/**
 * Dense trending row — mirrors the mod/server tables, with a Change column
 * that is the whole point of trending: rank movement (green up / red down),
 * or a "New" badge for freshly detected mods.
 */
export function TrendRow({ mod, category, game = 'reforger' }: TrendRowProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const rank = mod.overallRank ?? mod.currentRank;
  const isTop3 = rank != null && rank <= 3;

  const prevRank = mod.prevRank;
  const currentRank = mod.currentRank;
  const hasChange = category !== 'new' && prevRank != null && currentRank != null;
  const delta = hasChange ? (prevRank as number) - (currentRank as number) : 0; // positive = rising
  const magnitude = Math.abs(delta);
  const workshopUrl = workshopPageUrl(mod.id, game);
  const { status: workshopStatus, isUnavailable: workshopUnavailable } = useWorkshopStatus(
    mod.id,
    game
  );

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      {/* Rank */}
      <td className="py-3 md:py-2.5 pl-4 pr-2 align-middle">
        <span
          className={`font-mono text-sm tabular-nums ${
            isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'
          }`}
        >
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
      </td>

      {/* Module name — thumbnail + primary CTA */}
      <td className="py-3 md:py-2.5 pr-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <ModThumbnail modId={mod.id} modName={mod.name} game={game} size="sm" />
          <div className="min-w-0">
            <Link
              to={`${gp}/mod/${mod.id}`}
              className="block text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-1"
              title={mod.name}
            >
              {mod.name}
            </Link>
            <ModWorkshopStatusBadge status={workshopStatus} game={game} className="mt-0.5" />
          </div>
        </div>
      </td>

      {/* Change — the trending signal */}
      <td className="py-3 md:py-2.5 px-4 align-middle whitespace-nowrap">
        {category === 'new' ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-tactical-orange">New</span>
        ) : hasChange ? (
          <span
            title={`#${prevRank} → #${currentRank}`}
            className={`font-mono text-xs font-bold tabular-nums ${
              delta > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {delta > 0 ? '↑' : '↓'} {magnitude}
          </span>
        ) : (
          <span className="text-gray-700">–</span>
        )}
      </td>

      {/* Personnel */}
      <td className="py-3 md:py-2.5 px-4 text-right align-middle">
        <span className="font-mono text-sm tabular-nums text-white">
          {(mod.totalPlayers || 0).toLocaleString()}
        </span>
      </td>

      {/* Deployments — hidden on mobile */}
      <td className="hidden md:table-cell py-3 md:py-2.5 px-4 text-right align-middle">
        <span className="font-mono text-sm tabular-nums text-gray-300">{mod.serverCount}</span>
      </td>

      {/* Workshop link */}
      <td className="py-3 md:py-2.5 pl-2 pr-4 text-right align-middle">
        {workshopUnavailable ? (
          <span
            className="inline-block px-1 text-xs font-black text-amber-200/50 cursor-not-allowed"
            title="No longer on Reforger Workshop"
            aria-hidden
          >
            —
          </span>
        ) : (
          <a
            href={workshopUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${mod.name} on the workshop`}
            className="inline-block px-1 text-xs font-black text-gray-600 hover:text-tactical-orange transition-colors"
          >
            ↗
          </a>
        )}
      </td>
    </tr>
  );
}
