import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { howToJsonLd } from '../lib/seoJsonLd';
import { SITE_ORIGIN } from '../lib/site';

const PATH = '/how-to-find-popular-arma-reforger-mods';

const STEPS = [
  {
    name: 'Open the mod leaderboard',
    text: 'Go to the live mod popularity leaderboard on reforgermods.com to see mods ranked by players on active servers.',
  },
  {
    name: 'Sort and filter by activity',
    text: 'Use activity filters and sort options to find mods with real player load, not just workshop subscriptions.',
  },
  {
    name: 'Check trending and co-deployed mods',
    text: 'Open Trending for rising mods, then open a mod detail page to see co-deployed modules commonly installed together.',
  },
  {
    name: 'Verify on a live server',
    text: 'Browse the server list or a server detail page to confirm the mod is deployed on servers you want to join.',
  },
];

/** Long-tail SEO guide: finding popular mods via live network data. */
export function HowToFindModsPage() {
  const url = `${SITE_ORIGIN}${PATH}`;
  const description =
    'Step-by-step guide to find popular Arma Reforger mods using live server player counts, trending charts, and co-deployed mod data — not workshop subscription counts alone.';

  return (
    <article className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-700 py-8">
      <SEO
        title="How to Find Popular Arma Reforger Mods"
        description={description}
        url={PATH}
        jsonLd={howToJsonLd({
          name: 'How to Find Popular Arma Reforger Mods',
          description,
          url,
          steps: STEPS,
        })}
      />

      <header className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-tactical-orange text-[10px] font-black uppercase tracking-[0.3em]">
          // Guide
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">
          How to Find Popular Arma Reforger Mods
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </header>

      <ol className="space-y-8 list-decimal list-inside">
        {STEPS.map((step) => (
          <li key={step.name} className="text-white font-bold space-y-2">
            <span className="uppercase tracking-wide">{step.name}</span>
            <p className="text-gray-400 text-sm font-medium normal-case tracking-normal pl-0 sm:pl-6">
              {step.text}
            </p>
          </li>
        ))}
      </ol>

      <nav className="grid gap-3 sm:grid-cols-2 border-t border-white/10 pt-8" aria-label="Related tools">
        <Link to="/" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Mod leaderboard →
        </Link>
        <Link to="/trending" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Trending mods →
        </Link>
        <Link to="/servers" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Server list →
        </Link>
        <Link to="/arma-reforger-console-mod-storage" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Console mod storage →
        </Link>
      </nav>
    </article>
  );
}
