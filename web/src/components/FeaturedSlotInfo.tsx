import { Card, CardContent } from './ui/Card';
import { PAYPAL_DONATE_URL, PROJECT_DISCORD_URL, PROJECT_GITHUB_URL } from '../lib/siteLinks';

const FEATURED_PRICE = '$9.99/mo';

/** Buyer instructions for the paid FEATURED server slot — Support page. */
export function FeaturedSlotInfo() {
  return (
    <Card>
      <CardContent className="p-10 space-y-8">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-tactical-orange/10 border border-tactical-orange/30 text-tactical-orange font-black text-[10px] uppercase tracking-[0.3em]">
            Server Owners
          </span>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            Featured Server Slot
          </h2>
          <p className="text-gray-400 text-sm">
            Put your server at the top of the network list. A clear, marked placement — never a
            ranking shortcut.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="border border-white/5 bg-white/[0.02] p-4 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Price</p>
            <p className="text-2xl font-black text-tactical-orange">{FEATURED_PRICE}</p>
            <p className="text-xs text-gray-400">Per server, one month of placement.</p>
          </div>
          <div className="border border-white/5 bg-white/[0.02] p-4 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">You get</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>FEATURED strip at the top of the server list</li>
              <li>FEATURED badge on your server inside mod pages</li>
            </ul>
          </div>
          <div className="border border-white/5 bg-white/[0.02] p-4 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Fairness</p>
            <p className="text-xs text-gray-400">
              Never affects rankings, player counts, or data. The strip is clearly marked as
              sponsored.
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 space-y-4">
          <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">
            How to activate
          </p>
          <ol className="space-y-2 text-sm text-gray-400">
            <li>
              1. Send {FEATURED_PRICE} via PayPal.
            </li>
            <li>
              2. Tell us your server ID — open a{' '}
              <a
                href={PROJECT_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tactical-orange hover:underline"
              >
                GitHub issue
              </a>{' '}
              or write on the{' '}
              <a
                href={PROJECT_DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tactical-orange hover:underline"
              >
                community Discord
              </a>
              .
            </li>
            <li>3. Your server appears in the FEATURED strip within 24h.</li>
          </ol>
          <a
            href={PAYPAL_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-tactical-orange text-black text-center font-black uppercase tracking-widest text-sm hover:bg-white transition-all"
          >
            Send {FEATURED_PRICE} — Get Featured
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
