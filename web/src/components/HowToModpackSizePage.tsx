import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { howToJsonLd } from '../lib/seoJsonLd';
import { SITE_ORIGIN } from '../lib/site';

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
        jsonLd={howToJsonLd({
          name: 'How to Check Arma Reforger Modpack Size',
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
          How to Check Modpack Size on Console
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
        <Link to="/arma-reforger-console-mod-storage" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Console storage landing →
        </Link>
        <Link to="/storage-planner" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Open Storage Planner →
        </Link>
        <Link to="/servers" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Browse servers →
        </Link>
        <Link to="/how-to-find-popular-arma-reforger-mods" className="min-h-11 px-4 py-3 border border-white/10 hover:border-tactical-orange/40 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-tactical-orange">
          Find popular mods →
        </Link>
      </nav>
    </article>
  );
}
