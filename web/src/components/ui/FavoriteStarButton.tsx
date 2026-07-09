import { TOUCH_TARGET_BUTTON } from '../../lib/touchTargets';

interface FavoriteStarButtonProps {
  active: boolean;
  itemName: string;
  onToggle: () => void;
  className?: string;
}

export function FavoriteStarButton({
  active,
  itemName,
  onToggle,
  className = '',
}: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? `Remove ${itemName} from favorites` : `Add ${itemName} to favorites`}
      aria-pressed={active}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`${TOUCH_TARGET_BUTTON} px-2 sm:px-2.5 border text-sm sm:text-base leading-none transition-colors ${
        active
          ? 'border-tactical-orange/60 text-tactical-orange bg-tactical-orange/10'
          : 'border-white/15 text-gray-500 hover:border-tactical-orange/40 hover:text-tactical-orange'
      } ${className}`}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
