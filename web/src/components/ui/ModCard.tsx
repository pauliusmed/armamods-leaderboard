import { Link } from 'react-router-dom';
import type { Mod } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';
import { ModAuthorCell } from './ModAuthorCell';
import { ModWorkshopStatusBadge, useWorkshopStatus } from './ModWorkshopStatus';
import { ModActions } from './ModActions';
import { formatBytes } from '../../lib/formatBytes';

interface ModCardProps {
  mod: Mod;
  rank?: number;
  game?: GameType;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  pinned?: boolean;
  priority?: 'eager' | 'lazy';
}

export function ModCard({
  mod,
  rank,
  game = 'reforger',
  isFavorite = false,
  onToggleFavorite,
  pinned = false,
  priority = 'lazy',
}: ModCardProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const isTop3 = rank != null && rank <= 3;
  const share = mod.marketShare ?? 0;
  const { status: workshopStatus, isUnavailable: workshopUnavailable } = useWorkshopStatus(
    mod.id,
    game,
    mod.workshopStatus !== undefined ? { initialStatus: mod.workshopStatus } : undefined
  );

  return (
    <div className={`px-4 py-3 border-b border-white/5 ${pinned ? 'bg-tactical-orange/[0.04]' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <ModThumbnail modId={mod.id} modName={mod.name} game={game} size="sm" thumbnailUrl={mod.thumbnail} priority={priority} />
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
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono tabular-nums text-gray-500">
            <span>{mod.totalPlayers?.toLocaleString() ?? '0'} personnel</span>
            <span>{mod.serverCount} deploy</span>
            <span>{share.toFixed(1)}% share</span>
            {game === 'reforger' && mod.sizeBytes != null && (
              <span>{formatBytes(mod.sizeBytes)}</span>
            )}
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
