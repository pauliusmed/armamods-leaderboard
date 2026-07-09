import type { BmServerStatus } from '../../types';
import { BM_STATUS_SHORT } from '../../lib/serverStatus';
import { SERVER_STATUS_TITLE } from '../../lib/siteCopy';

const STATUS_STYLE: Record<BmServerStatus, string> = {
  online: 'border-emerald-600/50 bg-emerald-950/30 text-emerald-300',
  offline: 'border-gray-600/50 bg-zinc-900/60 text-gray-400',
  dead: 'border-red-900/50 bg-red-950/25 text-red-400/80',
  removed: 'border-gray-700/40 bg-black/40 text-gray-600',
  invalid: 'border-amber-700/40 bg-amber-950/20 text-amber-300/80',
  unknown: 'border-gray-800/40 bg-black/30 text-gray-600',
};

interface ServerStatusBadgeProps {
  status?: BmServerStatus | null;
  className?: string;
  /** sm = table rows; md = detail header */
  size?: 'sm' | 'md';
}

/** BattleMetrics server reachability from attributes.status. */
export function ServerStatusBadge({
  status,
  className = '',
  size = 'sm',
}: ServerStatusBadgeProps) {
  if (!status || status === 'unknown') return null;

  const label = BM_STATUS_SHORT[status];
  const pad = size === 'md' ? 'px-3 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]';

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-[0.12em] border ${pad} ${STATUS_STYLE[status]} ${className}`}
      title={SERVER_STATUS_TITLE(label)}
    >
      {label}
    </span>
  );
}
