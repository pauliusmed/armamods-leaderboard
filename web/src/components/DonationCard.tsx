import { Card, CardContent } from './ui/Card';
import { PAYPAL_DONATE_URL } from '../lib/siteLinks';
import {
  DONATION_COVERS,
  DONATION_CTA_LABEL,
  DONATION_FOOTNOTE,
  DONATION_GOAL_BLURB,
  DONATION_GOAL_LABEL,
  DONATION_GOAL_USD,
  DONATION_PROGRESS_LABEL,
  DONATION_RAISED_USD,
  donationProgressPercent,
} from '../lib/donation';

export function DonationCard() {
  const pct = donationProgressPercent();

  return (
    <Card>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
            Community Sync Fund
          </h3>
          <p className="text-gray-400 text-sm">
            {DONATION_GOAL_BLURB}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">
              {DONATION_PROGRESS_LABEL}
            </span>
            <span className="text-xl font-black text-tactical-orange">
              ${DONATION_RAISED_USD} / {DONATION_GOAL_LABEL}
            </span>
          </div>

          <div
            className="h-3 bg-white/5 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Community pool ${pct}% of ${DONATION_GOAL_LABEL}`}
          >
            <div
              className={`h-full bg-tactical-orange transition-all ${pct === 0 ? 'w-0' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">
              What the ${DONATION_GOAL_USD} pool unlocks:
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              {DONATION_COVERS.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>

        <a
          href={PAYPAL_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-4 bg-tactical-orange text-black text-center font-black uppercase tracking-widest text-sm hover:bg-white transition-all"
        >
          {DONATION_CTA_LABEL}
        </a>

        <p className="text-[8px] text-gray-600 text-center">
          {DONATION_FOOTNOTE}
        </p>
      </CardContent>
    </Card>
  );
}
