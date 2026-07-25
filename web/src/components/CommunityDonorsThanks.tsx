import {
  COMMUNITY_DONORS,
  DONATION_GOAL_MET,
  DONATION_GOAL_MET_BADGE,
  DONATION_THANKS_HEADING,
  formatDonorDate,
} from '../lib/donation';

/** Compact public credit list — Support page + DonationCard. */
export function CommunityDonorsThanks({ compact = false }: { compact?: boolean }) {
  if (COMMUNITY_DONORS.length === 0) return null;

  return (
    <div className={compact ? 'space-y-3 pt-2' : 'space-y-4'}>
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={`font-black uppercase tracking-[0.3em] text-tactical-orange ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {DONATION_THANKS_HEADING}
        </p>
        {DONATION_GOAL_MET ? (
          <span className="text-[8px] font-black uppercase tracking-widest text-black bg-emerald-400 px-2 py-0.5">
            {DONATION_GOAL_MET_BADGE}
          </span>
        ) : null}
      </div>
      <ul className="space-y-3">
        {COMMUNITY_DONORS.map((donor) => (
          <li
            key={`${donor.name}-${donor.date}-${donor.note ?? ''}`}
            className="border border-white/5 bg-white/[0.02] px-4 py-3 space-y-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-black text-white tracking-wide">
                {donor.name}
                {donor.tag ? (
                  <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {donor.tag}
                  </span>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                {donor.first ? (
                  <span className="text-[8px] font-black uppercase tracking-widest text-black bg-tactical-orange px-2 py-0.5">
                    First
                  </span>
                ) : null}
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                  {formatDonorDate(donor.date)}
                </span>
              </div>
            </div>
            {donor.note ? (
              <p className="text-xs text-gray-400 leading-relaxed">{donor.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
