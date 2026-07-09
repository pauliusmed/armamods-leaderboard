import { Link } from 'react-router-dom';
import type { Mod } from '../types';
import type { GameType } from '../api/client';
import { ModThumbnail } from './ui/ModThumbnail';
import { ModAuthorCell } from './ui/ModAuthorCell';
import { ModWorkshopStatusBadge, useWorkshopStatus } from './ui/ModWorkshopStatus';
import { CopyModConfigButton } from './ui/CopyModConfigButton';
import { FavoriteModButton } from './ui/FavoriteModButton';
import { workshopPageUrl } from '../lib/workshop';
import { formatBytes } from '../lib/formatBytes';
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_GAP } from '../lib/touchTargets';

interface ModRowProps {
  mod: Mod;
  rank?: number;
  game?: GameType;
  /** Leaderboard shows author + workshop CTA; embedded tables on mod detail stay compact. */
  variant?: 'leaderboard' | 'embedded';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** Pin row styling on favorites block */
  pinned?: boolean;
}

export function ModRow({
  mod,
  rank,
  game = 'reforger',
  variant = 'leaderboard',
  isFavorite = false,
  onToggleFavorite,
  pinned = false,
}: ModRowProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const isTop3 = rank != null && rank <= 3;
  const share = mod.marketShare ?? 0;
  const workshopUrl = workshopPageUrl(mod.id, game);
  const isLeaderboard = variant === 'leaderboard';
  const { status: workshopStatus, isUnavailable: workshopUnavailable } = useWorkshopStatus(
    mod.id,
    game,
    mod.workshopStatus !== undefined ? { initialStatus: mod.workshopStatus } : undefined
  );

  return (
    <tr
      className={`group border-b border-white/5 hover:bg-white/[0.03] transition-colors ${
        pinned ? 'bg-tactical-orange/[0.04]' : ''
      }`}
    >
      <td className="w-14 py-3 md:py-2.5 pl-4 pr-2 align-middle">
        <span
          className={`font-mono text-sm tabular-nums ${
            isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'
          }`}
        >
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
      </td>

      <td className="py-3 md:py-2.5 pr-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <ModThumbnail
            modId={mod.id}
            modName={mod.name}
            game={game}
            size="sm"
            thumbnailUrl={mod.thumbnail}
          />
          <div className="min-w-0">
            <Link
              to={`${gp}/mod/${mod.id}`}
              className="block text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-1"
              title={mod.name}
            >
              {mod.name}
            </Link>
            <ModWorkshopStatusBadge status={workshopStatus} game={game} className="mt-1" />
            {isLeaderboard && (
              <span className="md:hidden">
                <ModAuthorCell modId={mod.id} game={game} author={mod.author} className="mt-0.5" />
              </span>
            )}
          </div>
        </div>
      </td>

      {isLeaderboard && (
        <td className="hidden md:table-cell w-[140px] max-w-[140px] py-3 md:py-2.5 px-3 align-middle">
          <ModAuthorCell modId={mod.id} game={game} author={mod.author} />
        </td>
      )}

      <td className="w-[5.5rem] py-3 md:py-2.5 px-4 text-right align-middle tabular-nums">
        <span className="font-mono text-sm tabular-nums text-white">
          {(mod.totalPlayers || 0).toLocaleString()}
        </span>
      </td>

      <td className="hidden md:table-cell w-[4.5rem] py-3 md:py-2.5 px-4 text-right align-middle tabular-nums">
        <span className="font-mono text-sm tabular-nums text-gray-300">{mod.serverCount}</span>
      </td>

      <td className="hidden md:table-cell w-[5rem] py-3 md:py-2.5 px-4 text-right align-middle tabular-nums">
        <span className="font-mono text-xs tabular-nums text-gray-400">
          {formatBytes(mod.sizeBytes)}
        </span>
      </td>

      <td className="hidden md:table-cell w-[7.5rem] py-3 md:py-2.5 pl-4 pr-4 align-middle">
        <div className="flex items-center justify-end gap-3">
          <span className="font-mono text-xs tabular-nums text-tactical-orange/80">
            {share.toFixed(1)}%
          </span>
          <div className="w-16 h-[3px] bg-white/5 overflow-hidden">
            <div
              className="h-full bg-tactical-orange/60 group-hover:bg-tactical-orange transition-colors"
              style={{ width: `${Math.min(share, 100)}%` }}
            />
          </div>
        </div>
      </td>

      {isLeaderboard && (
        <td className="w-[11rem] py-3 md:py-2.5 pl-2 pr-4 text-right align-middle whitespace-nowrap">
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
      )}
    </tr>
  );
}
