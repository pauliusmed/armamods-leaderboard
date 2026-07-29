import { Link } from 'react-router-dom';
import type { TrendingMod } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';
import { ModAuthorCell } from './ModAuthorCell';
import { ModWorkshopStatusBadge, useWorkshopStatus } from './ModWorkshopStatus';
import { ModActions } from './ModActions';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendCardProps {
  mod: TrendingMod;
  category: TrendCategory;
  game?: GameType;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  pinned?: boolean;
}

export function TrendCard({
  mod,
  category,
  game = 'reforger',
  isFavorite = false,
  onToggleFavorite,
  pinned = false,
}: TrendCardProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const rank = mod.overallRank ?? mod.currentRank;
  const isTop3 = rank != null && rank <= 3;
  const prevRank = mod.prevRank;
  const currentRank = mod.currentRank;
  const hasChange = category !== 'new' && prevRank != null && currentRank != null;
  const delta = hasChange ? (prevRank as number) - (currentRank as number) : 0;
  const magnitude = Math.abs(delta);
  const { status: workshopStatus, isUnavailable: workshopUnavailable } = useWorkshopStatus(mod.id, game);

  return (
    <div className={`px-4 py-3 border-b border-white/5 ${pinned ? 'bg-tactical-orange/[0.04]' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <ModThumbnail modId={mod.id} modName={mod.name} game={game} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            to={`${gp}/mod/${mod.id}`}
            className="block text-[13px] font-bold tracking-tight text-white hover:text-tactical-orange transition-colors line-clamp-1"
            title={mod.name}
          >
            {mod.name}
          </Link>
          <ModAuthorCell modId={mod.id} game={game} author={mod.author} className="mt-0.5" />
          <ModWorkshopStatusBadge status={workshopStatus} game={game} className="mt-0.5" />
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono tabular-nums text-gray-500">
            {category === 'new' ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-tactical-orange">New</span>
            ) : hasChange ? (
              <span
                className={`font-mono text-xs font-bold tabular-nums ${delta > 0 ? 'text-signal-ok' : 'text-signal-critical'}`}
              >
                {delta > 0 ? '↑' : '↓'} {magnitude} (#{prevRank} → #{currentRank})
              </span>
            ) : (
              <span className="text-gray-700">–</span>
            )}
            <span>{(mod.totalPlayers || 0).toLocaleString()} personnel</span>
            <span>{mod.serverCount} deploy</span>
          </p>
          <div className="flex items-center justify-end mt-2 border-t border-white/5 pt-2">
            <ModActions
              modId={mod.id}
              modName={mod.name}
              game={game}
              workshopStatus={{ isUnavailable: workshopUnavailable }}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
