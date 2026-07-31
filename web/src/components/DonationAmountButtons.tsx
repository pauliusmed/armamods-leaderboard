import { DONATION_QUICK_AMOUNTS } from '../lib/donation';
import { paypalDonateUrl } from '../lib/siteLinks';

/** Quick fixed amounts — one-tap PayPal checkout, lowers decision friction. */
export function DonationAmountButtons() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {DONATION_QUICK_AMOUNTS.map((amount) => (
        <a
          key={amount}
          href={paypalDonateUrl(amount)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Donate $${amount}`}
          className="px-2 py-3 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-center text-sm hover:bg-white/10 hover:border-tactical-orange transition-all"
        >
          ${amount}
        </a>
      ))}
    </div>
  );
}
