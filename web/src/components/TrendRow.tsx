import { Link } from 'react-router-dom';
import type { TrendingMod } from '../types';
import type { GameType } from '../api/client';
import { ModThumbnail } from './ui/ModThumbnail';
import { ModWorkshopStatusBadge, useWorkshopStatus } from './ui/ModWorkshopStatus';
import { CopyModConfigButton } from './ui/CopyModConfigButton';
import { FavoriteModButton } from './ui/FavoriteModButton';
import { workshopPageUrl } from '../lib/workshop';
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_GAP } from '../lib/touchTargets';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendRowProps {
  mod: TrendingMod;
  category: TrendCategory;
  game?: GameType;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  pinned?: boolean;
}

/**
 * Dense trending row — mirrors the mod/server tables, with a Change column
 * that is the whole point of trending: rank movement (green up / red down),
 * or a "New" badge for freshly detected mods.
 */
export function TrendRow({
  mod,
  category,
  game = 'reforger',
  isFavorite = false,
  onToggleFavorite,
  pinned = false,
}: TrendRowProps) {
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
    <tr
      className={`group border-b border-white/5 hover:bg-white/[0.03] transition-colors ${
        pinned ? 'bg-tactical-orange/[0.04]' : ''
      }`}
    >
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
              delta > 0 ? 'text-signal-ok' : 'text-signal-critical'
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

      {/* Actions */}
      <td className="py-3 md:py-2.5 pl-2 pr-4 text-right align-middle whitespace-nowrap">
        <div className={`inline-flex items-center justify-end ${TOUCH_TARGET_GAP}`}>
          {onToggleFavorite && (
            <FavoriteModButton
              active={isFavorite}
              modName={mod.name}
              onToggle={onToggleFavorite}
            />
          )}
          {game === 'reforger' && (
            <CopyModConfigButton modId={mod.id} modName={mod.name} />
          )}
          {workshopUnavailable ? (
            <span
              className={`${TOUCH_TARGET_BUTTON} px-2.5 py-1.5 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest text-amber-200/70 cursor-not-allowed`}
              title="No longer on Reforger Workshop"
            >
              Workshop
            </span>
          ) : (
            <a
              href={workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${mod.name} on ${game === 'arma3' ? 'Steam Workshop' : 'Reforger Workshop'}`}
              className={`${TOUCH_TARGET_BUTTON} px-2.5 py-1.5 border border-tactical-orange/40 text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:bg-tactical-orange hover:text-black transition-colors`}
            >
              {game === 'arma3' ? 'Steam' : 'Workshop'} ↗
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}
