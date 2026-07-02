import type { Server } from '../../types';
import { consoleFitLabel, serverConsoleFit } from '../../lib/serverModpack';

interface ConsoleFitBadgeProps {
  server: Server;
  limitGb: number;
  limitBytes: number;
}

export function ConsoleFitBadge({ server, limitGb, limitBytes }: ConsoleFitBadgeProps) {
  const status = serverConsoleFit(server, limitBytes);
  if (status === 'unknown') return null;

  const label = consoleFitLabel(status, limitGb);
  const className =
    status === 'vanilla'
      ? 'border-gray-600/50 text-gray-500 bg-gray-950/40'
      : status === 'fits'
        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
        : 'border-amber-500/40 text-amber-400/90 bg-amber-950/20';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest border ${className}`}
      title={
        status === 'fits'
          ? `Estimated modpack fits ${limitGb} GB console workshop limit`
          : status === 'over'
            ? `Estimated modpack exceeds ${limitGb} GB console workshop limit`
            : 'No mods required'
      }
    >
      {label}
    </span>
  );
}
