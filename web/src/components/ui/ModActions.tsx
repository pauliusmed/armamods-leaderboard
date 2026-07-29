import type { GameType } from '../../api/client';
import { workshopPageUrl } from '../../lib/workshop';
import { CopyModConfigButton } from './CopyModConfigButton';
import { OpenModStatsButton } from './OpenModStatsButton';
import { FavoriteModButton } from './FavoriteModButton';
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_GAP } from '../../lib/touchTargets';

interface ModActionsProps {
  modId: string;
  modName: string;
  game: GameType;
  workshopStatus?: { isUnavailable?: boolean };
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function ModActions({ modId, modName, game, workshopStatus, isFavorite, onToggleFavorite }: ModActionsProps) {
  const workshopUrl = workshopPageUrl(modId, game);
  const isUnavailable = workshopStatus?.isUnavailable ?? false;

  return (
    <div className={`inline-flex items-center justify-end ${TOUCH_TARGET_GAP}`}>
      {onToggleFavorite && (
        <FavoriteModButton active={!!isFavorite} modName={modName} onToggle={onToggleFavorite} />
      )}
      {game === 'reforger' && <CopyModConfigButton modId={modId} modName={modName} />}
      <OpenModStatsButton modId={modId} modName={modName} game={game} />
      {isUnavailable ? (
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
          aria-label={`Open ${modName} on ${game === 'arma3' ? 'Steam Workshop' : 'Reforger Workshop'}`}
          className={`${TOUCH_TARGET_BUTTON} px-2.5 py-1.5 border border-tactical-orange/40 text-[9px] font-black uppercase tracking-widest text-tactical-orange hover:bg-tactical-orange hover:text-black transition-colors`}
        >
          {game === 'arma3' ? 'Steam' : 'Workshop'} ↗
        </a>
      )}
    </div>
  );
}
