import { Card, CardContent } from './ui/Card';
import { PAYPAL_DONATE_URL } from '../lib/siteLinks';

export function DonationCard() {
  const goal = 100;
  const paypalUrl = PAYPAL_DONATE_URL;

  return (
    <Card>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
            Support the Project
          </h3>
          <p className="text-gray-400 text-sm">
            Help us get a better domain and keep the data updated daily
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">
              Funding Goal
            </span>
            <span className="text-xl font-black text-tactical-orange">
              €{goal}
            </span>
          </div>

          <div className="h-3 bg-white/5 overflow-hidden">
            <div className="h-full bg-tactical-orange/20 w-full animate-pulse" />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">
              What your donation covers:
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Custom domain (armamods.com)</li>
              <li>• Daily data updates</li>
              <li>• Server costs & API usage</li>
            </ul>
          </div>
        </div>

        <a
          href={paypalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-4 bg-tactical-orange text-black text-center font-black uppercase tracking-widest text-sm hover:bg-white transition-all"
        >
          Donate via PayPal
        </a>

        <p className="text-[8px] text-gray-600 text-center">
          Every euro helps keep this project alive
        </p>
      </CardContent>
    </Card>
  );
}
