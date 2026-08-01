import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { GraphicHero } from './ui/GraphicHero';
import { howToJsonLd } from '../lib/seoJsonLd';
import { SITE_ORIGIN } from '../lib/site';
import serverNetwork960 from '../assets/generated/server-network-960.webp';
import serverNetwork1600 from '../assets/generated/server-network-1600.webp';

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
        image="/og-servers.png"
        jsonLd={howToJsonLd({
          name: 'How to Find Popular Arma Reforger Mods',
          description,
          url,
          steps: STEPS,
        })}
      />

      <GraphicHero
        compact
        eyebrow="// MOD DISCOVERY GUIDE"
        title="How to Find Popular Arma Reforger Mods"
        description={description}
        imageSrc={serverNetwork1600}
        imageSrcSet={`${serverNetwork960} 960w, ${serverNetwork1600} 1600w`}
        imageAlt="Modern military operations map linking active modded servers"
      />

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

      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-6 text-[9px] font-black uppercase tracking-widest" aria-label="Related tools">
        <span className="text-gray-600">Related tools</span>
        <Link to="/" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Mod leaderboard
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/trending" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Trending mods
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/servers" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Server list
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/arma-reforger-console-mod-storage" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Console mod storage
        </Link>
      </nav>
    </article>
  );
}
