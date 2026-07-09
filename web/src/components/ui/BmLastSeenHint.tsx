import type { BmServerStatus } from '../../types';
import { describeBmLastSeenOnline } from '../../lib/serverStatus';

interface BmLastSeenHintProps {
  status?: BmServerStatus | null;
  lastSeenAt?: string | null;
  className?: string;
}

/** Subtitle for offline/dead servers — when we last saw them online in collector data. */
export function BmLastSeenHint({ status, lastSeenAt, className = '' }: BmLastSeenHintProps) {
  const text = describeBmLastSeenOnline(status, lastSeenAt);
  if (!text) return null;

  return (
    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 ${className}`}>
      {text}
    </span>
  );
}
