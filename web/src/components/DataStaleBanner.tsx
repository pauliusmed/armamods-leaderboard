import { Link } from 'react-router-dom';
import { useDataFreshness, formatSyncAge } from '../hooks/useDataFreshness';
import { DATA_STALE_BANNER, DATA_STALE_BANNER_SHORT } from '../lib/siteCopy';
import type { GameType } from '../api/client';

interface DataStaleBannerProps {
  game: GameType;
}

/**
 * Shown under the header when collector KV snapshot is older than health isStale (>3h).
 * Soft notice only — site stays usable on the last known snapshot.
 */
export function DataStaleBanner({ game }: DataStaleBannerProps) {
  const { isStale, staleHours, loading } = useDataFreshness(game);

  if (loading || !isStale) return null;

  const age = formatSyncAge(staleHours);

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 text-amber-100"
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-relaxed">
          <span className="text-amber-400 mr-2">[ STALE DATA ]</span>
          <span className="hidden sm:inline">{DATA_STALE_BANNER(age)}</span>
          <span className="sm:hidden">{DATA_STALE_BANNER_SHORT(age)}</span>
        </p>
        <Link
          to="/support"
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:text-black hover:bg-amber-400 px-3 py-2 sm:py-1.5 border border-amber-400/40 transition-colors text-center"
        >
          Community Fund
        </Link>
      </div>
    </div>
  );
}
