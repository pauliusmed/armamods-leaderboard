import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';

const PATH = '/privacy';

const SECTIONS = [
  {
    id: 'principle',
    title: 'Principle',
    body: [
      'This site does not collect or store personal data about its visitors. There is no account system, no sign-up, no login, and no email collection. Everything shown is aggregated telemetry from public game-network data.',
    ],
  },
  {
    id: 'telemetry',
    title: 'Server telemetry',
    body: [
      'The leaderboard, server list, and trending pages display data derived from public Arma Reforger / Arma 3 server telemetry and the BattleMetrics paid API. This data describes servers and mods, not individual people. No player identifiers are processed beyond the aggregate player counts you see on the site.',
    ],
  },
  {
    id: 'browser',
    title: 'Browser-local data',
    body: [
      'Favorites (mods/servers) and the storage planner profile are stored in your own browser via localStorage/IndexedDB. This data never leaves your device and is never transmitted to our servers.',
    ],
  },
  {
    id: 'affiliate',
    title: 'Affiliate tracking',
    body: [
      'When you follow a hosting recommendation link, a click is counted as an aggregate number in an edge cache (KV counter). We do not store your IP address, user-agent, or any identifier with those clicks.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & logs',
    body: [
      'The site runs on Cloudflare (Pages/Workers). Cloudflare Web Analytics provides privacy-first, cookie-free aggregate statistics. Standard edge request logs are retained by Cloudflare for operational security and may include IP addresses as part of their own logging; see Cloudflare\'s privacy policy for details.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: [
      'We do not set any cookies. No advertising, no tracking pixels, no social embeds. Fonts are self-hosted — no third-party font service is contacted when you load the site.',
    ],
  },
  {
    id: 'rights',
    title: 'Your rights (GDPR)',
    body: [
      'Because we process no personal data, GDPR rights such as access or erasure generally do not arise. If you believe any personal data was exposed, contact us and we will investigate and remove it promptly.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    body: [
      'Questions about this policy: open an issue on the public GitHub repository or reach us through the community Discord channel linked in the footer.',
    ],
  },
];

/** Static privacy policy — mirrors actual data practices, kept in plain language. */
export function PrivacyPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-700 py-8">
      <SEO
        title="Privacy Policy"
        description="Reforgermods.com privacy policy: no personal data collection, browser-local favorites, aggregate affiliate click counts, cookie-free Cloudflare analytics."
        url={PATH}
      />

      <header className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-tactical-orange text-[10px] font-black uppercase tracking-[0.3em]">
          // Policy
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">
          Privacy Policy
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Effective 2026-07-31. This site is a data-aggregation dashboard, not a data collector.
        </p>
      </header>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-2">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-gray-400 text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="border-t border-white/10 pt-8">
        <p className="text-gray-500 text-xs leading-relaxed">
          Want to know how this site processes game data? See{' '}
          <Link to="/support" className="text-tactical-orange hover:underline">
            Community Sync Fund
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}
