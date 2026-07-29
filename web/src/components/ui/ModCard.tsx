import { Link } from 'react-router-dom';
import type { Mod } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';

interface ModCardProps {
  mod: Mod;
  rank?: number;
  game?: GameType;
  pinned?: boolean;
  priority?: 'eager' | 'lazy';
}

export function ModCard({
  mod,
  rank,
  game = 'reforger',
  pinned = false,
  priority = 'lazy',
}: ModCardProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const isTop3 = rank != null && rank <= 3;
  const share = mod.marketShare ?? 0;

  return (
    <Link
      to={`${gp}/mod/${mod.id}`}
      className={`block px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${pinned ? 'bg-tactical-orange/[0.04]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <ModThumbnail modId={mod.id} modName={mod.name} game={game} size="sm" thumbnailUrl={mod.thumbnail} priority={priority} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-tight text-white line-clamp-1" title={mod.name}>
            {mod.name}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono tabular-nums text-gray-500">
            <span>{mod.totalPlayers?.toLocaleString() ?? '0'} personnel</span>
            <span>{mod.serverCount} deploy</span>
            <span>{share.toFixed(1)}% share</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
