import type { GameType } from '../../api/client';
import type { WorkshopAvailability } from '../../types';

interface ModWorkshopStatusBadgeProps {
  status: WorkshopAvailability;
  game?: GameType;
  className?: string;
}

/** Compact label for list rows when the mod is no longer on Reforger Workshop. */
export function ModWorkshopStatusBadge({
  status,
  game = 'reforger',
  className = '',
}: ModWorkshopStatusBadgeProps) {
  if (game !== 'reforger' || status !== 'unavailable') return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-200/90 bg-amber-500/10 border border-amber-500/30 ${className}`}
      title="No longer on Reforger Workshop"
    >
      Off Workshop
    </span>
  );
}

interface ModWorkshopUnavailableBannerProps {
  game?: GameType;
  status: WorkshopAvailability;
  checkedAt?: string | null;
}

/** Full-width notice on mod detail — explains BM data vs workshop removal. */
export function ModWorkshopUnavailableBanner({
  game = 'reforger',
  status,
  checkedAt,
}: ModWorkshopUnavailableBannerProps) {
  if (game !== 'reforger' || status !== 'unavailable') return null;

  return (
    <div
      className="mb-6 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] leading-relaxed text-amber-100/90"
      role="status"
    >
      <p className="font-black uppercase tracking-[0.2em] text-amber-200 mb-1">
        No longer on Workshop
      </p>
      <p>
        This mod was removed or is no longer available on the official Reforger Workshop. Telemetry
        still shows servers that have it installed — rankings may drop as owners remove it.
        {checkedAt ? (
          <span className="block mt-1 text-[10px] text-amber-200/70 font-mono tabular-nums">
            Checked: {new Date(checkedAt).toLocaleString()}
          </span>
        ) : null}
      </p>
    </div>
  );
}
