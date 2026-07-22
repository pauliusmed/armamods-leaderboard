import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/Card';
import { PAYPAL_DONATE_URL } from '../lib/siteLinks';
import {
  DONATION_CTA_LABEL,
  DONATION_FOOTNOTE,
  DONATION_GOAL_BLURB,
  DONATION_GOAL_LABEL,
  DONATION_GOAL_USD,
  DONATION_PROGRESS_LABEL,
  DONATION_RAISED_USD,
  donationProgressPercent,
} from '../lib/donation';

export function SupportPage() {
  const pct = donationProgressPercent();

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-6 pt-12">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-[#172635] border border-white/5">
          <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.3em]">
            // Community Fund
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
          Built By The Community
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-sm max-w-2xl mx-auto">
          Free for every player. No ads. No tracking. Shared intel for the Arma network.
        </p>
      </div>

      <Card>
        <CardContent className="p-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
              A Shared Cost, Shared Benefit
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              BattleMetrics now requires a paid API key for all requests. Without a funded key,
              live rankings, player counts, and trending freeze for <span className="text-white font-bold">everyone</span>
              — the site can only keep the last community snapshot.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              {DONATION_GOAL_BLURB}.
            </p>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                {DONATION_PROGRESS_LABEL}
              </span>
              <span className="text-lg font-black text-tactical-orange">
                ${DONATION_RAISED_USD} / {DONATION_GOAL_LABEL}
              </span>
            </div>
            <div
              className="h-3 bg-white/5 overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Community pool ${pct}%`}
            >
              <div className="h-full bg-tactical-orange" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-gray-500 text-xs">
              ${DONATION_GOAL_USD} shared goal ≈ one year of API access so the whole community
              gets live sync again.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-8 pt-8 pb-12">
        <a
          href={PAYPAL_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-4 px-12 py-6 bg-tactical-orange text-black font-black uppercase tracking-widest text-sm hover:bg-white transition-all"
        >
          {DONATION_CTA_LABEL} — {DONATION_GOAL_LABEL} pool
        </a>

        <p className="text-gray-600 text-[9px] font-medium uppercase tracking-[0.3em]">
          {DONATION_FOOTNOTE}
        </p>

        <div className="flex items-center justify-center gap-8 pt-12 border-t border-white/5">
          <Link
            to="/"
            className="text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            ← Back to Mods
          </Link>
          <Link
            to="/servers"
            className="text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            View Servers →
          </Link>
        </div>
      </div>
    </div>
  );
}
