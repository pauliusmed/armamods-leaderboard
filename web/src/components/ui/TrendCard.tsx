import { Link } from 'react-router-dom';
import type { TrendingMod } from '../../types';
import type { GameType } from '../../api/client';
import { ModThumbnail } from './ModThumbnail';

type TrendCategory = 'rising' | 'falling' | 'new';

interface TrendCardProps {
  mod: TrendingMod;
  category: TrendCategory;
  game?: GameType;
  pinned?: boolean;
}

export function TrendCard({
  mod,
  category,
  game = 'reforger',
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

  return (
    <Link
      to={`${gp}/mod/${mod.id}`}
      className={`block px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${pinned ? 'bg-tactical-orange/[0.04]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <ModThumbnail modId={mod.id} modName={mod.name} game={game} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-tight text-white line-clamp-1" title={mod.name}>
            {mod.name}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono tabular-nums text-gray-500">
            {category === 'new' ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-tactical-orange">New</span>
            ) : hasChange ? (
              <span
                className={`font-mono text-xs font-bold tabular-nums ${delta > 0 ? 'text-signal-ok' : 'text-signal-critical'}`}
              >
                {delta > 0 ? '↑' : '↓'} {magnitude}
              </span>
            ) : (
              <span className="text-gray-700">–</span>
            )}
            <span>{(mod.totalPlayers || 0).toLocaleString()} personnel</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
