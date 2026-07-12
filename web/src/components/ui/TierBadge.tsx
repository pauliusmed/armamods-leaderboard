const TIER_STYLES: Record<string, string> = {
  S: 'bg-tactical-orange text-black',
  A: 'bg-tactical-orange/70 text-black',
  B: 'bg-zinc-600 text-white',
  C: 'bg-zinc-700 text-signal-neutral',
};

interface TierBadgeProps {
  tier?: 'S' | 'A' | 'B' | 'C' | null;
  className?: string;
  /** Render size: sm (default 20px) or md (28px). */
  size?: 'sm' | 'md';
}

/**
 * Compact S/A/B/C quality-tier chip — the platform's collision-free quality mark
 * (letters instead of evocative names like "Apex"/"Vanguard" that servers use themselves).
 */
export function TierBadge({ tier, className = '', size = 'sm' }: TierBadgeProps) {
  if (!tier) return null;
  const style = TIER_STYLES[tier] ?? 'bg-zinc-700 text-gray-400';
  const dim = size === 'md' ? 'w-7 h-7 text-sm' : 'w-5 h-5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center justify-center ${dim} font-black font-mono leading-none ${style} ${className}`}
      title={`Tier ${tier}`}
      aria-label={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}
