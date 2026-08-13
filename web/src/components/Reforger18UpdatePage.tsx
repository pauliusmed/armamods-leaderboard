import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { GraphicHero } from './ui/GraphicHero';
import { newsArticleJsonLd, breadcrumbJsonLd } from '../lib/seoJsonLd';
import { SITE_ORIGIN } from '../lib/site';
import serverNetwork1600 from '../assets/generated/server-network-1600.webp';
import serverNetwork960 from '../assets/generated/server-network-960.webp';

const PATH = '/reforger-1-8';
const OFFICIAL_CHANGELOG = 'https://reforger.armaplatform.com/news/changelog-august-13-2026';
const OFFICIAL_ANNOUNCEMENT =
  'https://store.steampowered.com/news/app/1874880/view/689765787249934969';

const HIGHLIGHTS = [
  {
    title: 'Far Hide & Concealment',
    items: [
      'New first iteration of the Far Hide system — distant characters in grass are concealed from long-range observers.',
      'Grass and camo nets now obstruct AI vision, making vegetation and camo genuinely useful for breaking line of sight.',
    ],
  },
  {
    title: 'Specialist Roles Matter',
    items: [
      'Medics inspect, treat, and load wounded into vehicles faster.',
      'Logistics loads/unloads supplies faster; vehicle crews repair, rearm, and refuel quicker.',
      'Engineers build structures and deployables faster.',
      'Fortification QoL: one sandbag is enough to start deployment, razor wire can be deployed solo, PKMN fits the 6T5 tripod (with/without 1P29).',
    ],
  },
  {
    title: 'Smoke & Signals',
    items: [
      'New tactical gesture animations and loiter animations (sit, pushups, smoke).',
      'US Army underbarrel smoke grenades in several colors.',
      'Smoke mortar rounds stay effective longer.',
    ],
  },
  {
    title: 'More Changes',
    items: [
      'Barefoot running can damage feet and occasionally make you stumble.',
      'Dying costs 30 rank progression points (friendly fire exempts the victim).',
      'Admins can teleport to players and promote/demote from the Player List.',
      'MOB construction is no longer blocked by nearby enemies.',
      'New crash fixes, memory/pathfinding improvements, and VoN updates.',
    ],
  },
];

const TOOLS = [
  {
    to: '/audit',
    label: 'CONFIG AUDIT',
    title: 'Find broken mods after 1.8',
    text: 'Paste your server config.json — the audit flags mods that were popular before the update and are effectively dead on BattleMetrics now.',
  },
  {
    to: '/',
    label: 'MOD LEADERBOARD',
    title: 'See what is dropping',
    text: 'Live player counts per mod across the whole network — spot 1.8 casualties as they happen.',
  },
  {
    to: '/storage-planner',
    label: 'STORAGE PLANNER',
    title: 'Re-check your modpack size',
    text: 'Updates often change download sizes — compare your stack against the console workshop budget.',
  },
  {
    to: '/servers',
    label: 'SERVER BROWSER',
    title: 'What the network runs now',
    text: 'Browse active servers by SQE rank and see which modpacks survived the update.',
  },
];

/** SEO landing for the Reforger 1.8 major update: official patch summary + our tools. */
export function Reforger18UpdatePage() {
  const url = `${SITE_ORIGIN}${PATH}`;
  const description =
    'Arma Reforger 1.8 “Stay Low, Stay Hidden” — official patch summary (Far Hide, specialist roles, smoke & signals) and what the update means for your server modpack.';

  return (
    <article className="space-y-12 animate-in fade-in duration-700 pb-12">
      <SEO
        title="Arma Reforger 1.8 Update — Patch Summary & Mod Impact"
        description={description}
        url={PATH}
        image="/og-servers.png"
        jsonLd={[
          newsArticleJsonLd({
            headline: 'Arma Reforger 1.8 “Stay Low, Stay Hidden” — Patch Summary',
            description,
            url,
            datePublished: '2026-08-13',
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: `${SITE_ORIGIN}/` },
            { name: 'Reforger 1.8 Update', url },
          ]),
        ]}
      />

      <GraphicHero
        compact
        eyebrow="// REFORGER 1.8 MAJOR UPDATE · 2026-08-13"
        title="Stay Low, Stay Hidden"
        description={description}
        imageSrc={serverNetwork1600}
        imageSrcSet={`${serverNetwork960} 960w, ${serverNetwork1600} 1600w`}
        imageAlt="Arma Reforger battlefield operations visual"
      >
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={OFFICIAL_CHANGELOG}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-tactical-orange text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
          >
            Official Changelog ↗
          </a>
          <a
            href={OFFICIAL_ANNOUNCEMENT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-white/25 text-white text-[10px] font-black uppercase tracking-widest hover:border-tactical-orange hover:text-tactical-orange transition-colors"
          >
            Steam Announcement ↗
          </a>
        </div>
      </GraphicHero>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="border-b border-white/5 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
            Patch Highlights
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Summary of the official 1.8 notes — full details in the official changelog
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((block) => (
            <div key={block.title} className="border border-white/5 bg-black/40 p-5">
              <h3 className="text-sm font-black text-tactical-orange uppercase tracking-widest mb-3">
                {block.title}
              </h3>
              <ul className="space-y-2">
                {block.items.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-gray-400 flex gap-2">
                    <span className="text-tactical-orange shrink-0" aria-hidden>
                      ▸
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-l-2 border-tactical-orange pl-4">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">
            What it means for your modpack
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Major updates break mods: Workshop builds go stale, scripts stop matching the new
            game version, and servers that do not update quietly drop off BattleMetrics. Check
            which of your mods survived 1.8 before the player base moves on.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group border border-white/5 bg-black/40 p-5 hover:border-tactical-orange/40 transition-colors"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 group-hover:text-tactical-orange transition-colors">
                {tool.label}
              </p>
              <h3 className="text-base font-black text-white mt-1.5">{tool.title}</h3>
              <p className="text-[13px] leading-relaxed text-gray-400 mt-2">{tool.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
