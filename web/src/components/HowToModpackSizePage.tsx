import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { GraphicHero } from './ui/GraphicHero';
import { howToJsonLd } from '../lib/seoJsonLd';
import { SITE_ORIGIN } from '../lib/site';
import storageModules960 from '../assets/generated/storage-modules-960.webp';
import storageModules1600 from '../assets/generated/storage-modules-1600.webp';

const PATH = '/how-to-check-arma-reforger-modpack-size';

const STEPS = [
  {
    name: 'Open the Storage Planner',
    text: 'Use the console mod storage planner to compare server modpacks against PS5 / Xbox workshop space limits (~25 GB).',
  },
  {
    name: 'Pick your main server',
    text: 'Select the server whose mods you already have installed — treated as your current library (auto-download baseline).',
  },
  {
    name: 'Add servers you want to play',
    text: 'Add one or more wanted servers. Shared mods (RHS, WCS, etc.) are deduplicated so you see true extra download size.',
  },
  {
    name: 'Read fit status and removable mods',
    text: 'Check whether the combined pack fits, what still needs downloading, and which mods are safe to remove if you are over limit.',
  },
];

/** Long-tail SEO guide: console modpack size / storage. */
export function HowToModpackSizePage() {
  const url = `${SITE_ORIGIN}${PATH}`;
  const description =
    'How to check Arma Reforger server modpack download size for PS5 and Xbox: compare packs, deduplicate shared mods, and see if you fit the ~25 GB workshop limit.';

  return (
    <article className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-700 py-8">
      <SEO
        title="How to Check Arma Reforger Modpack Size (PS5 / Xbox)"
        description={description}
        url={PATH}
        image="/og-storage.png"
        jsonLd={howToJsonLd({
          name: 'How to Check Arma Reforger Modpack Size',
          description,
          url,
          steps: STEPS,
        })}
      />

      <GraphicHero
        compact
        eyebrow="// MODPACK STORAGE GUIDE"
        title="How to Check Modpack Size on Console"
        description={description}
        imageSrc={storageModules1600}
        imageSrcSet={`${storageModules960} 960w, ${storageModules1600} 1600w`}
        imageAlt="Modern mission-data cases showing an optimized mod loadout"
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
        <Link to="/arma-reforger-console-mod-storage" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Console storage
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/storage-planner" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Open planner
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/servers" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Browse servers
        </Link>
        <span className="text-gray-700" aria-hidden="true">·</span>
        <Link to="/how-to-find-popular-arma-reforger-mods" className="min-h-11 inline-flex items-center text-gray-500 transition-colors hover:text-tactical-orange">
          Find popular mods
        </Link>
      </nav>
    </article>
  );
}
