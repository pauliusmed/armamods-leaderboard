import { TOUCH_TARGET_BUTTON } from '../../lib/touchTargets';
import type { GameType } from '../../api/client';

interface OpenModStatsButtonProps {
  modId: string;
  modName: string;
  game?: GameType;
  className?: string;
}

/**
 * Opens our mod detail page in a new tab — same stay-on-list UX as Workshop,
 * but keeps traffic on reforgermods.com (ranks, trends, co-deploy, storage).
 */
export function OpenModStatsButton({
  modId,
  modName,
  game = 'reforger',
  className = '',
}: OpenModStatsButtonProps) {
  const path =
    game === 'arma3'
      ? `/arma3/mod/${encodeURIComponent(modId)}`
      : `/mod/${encodeURIComponent(modId)}`;

  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${modName} stats on reforgermods.com`}
      title="Live stats, trends, and co-deployed mods"
      className={`${TOUCH_TARGET_BUTTON} px-2.5 py-1.5 border border-white/20 text-[9px] font-black uppercase tracking-widest text-gray-200 hover:border-white/50 hover:text-white transition-colors ${className}`}
    >
      Stats
    </a>
  );
}
