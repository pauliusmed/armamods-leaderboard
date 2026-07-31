import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { GraphicHero } from './ui/GraphicHero';
import { STORAGE_LANDING_SOURCES } from '../lib/siteCopy';
import storageModules960 from '../assets/generated/storage-modules-960.webp';
import storageModules1600 from '../assets/generated/storage-modules-1600.webp';

const FAQ = [
  {
    q: 'How much storage do Arma Reforger mods take on PS5 or Xbox?',
    a: 'It depends on the server modpack. A single server can use anywhere from a few GB to 40+ GB. Shared mods like RHS or WCS only count once when you compare multiple servers — our planner deduplicates them automatically.',
  },
  {
    q: 'Can I only keep mods for 2–3 servers on console?',
    a: 'Yes — that is the most common console limitation. Pick the servers you actually play on, check the combined deduplicated size against your free space, and see which mods are safe to remove or which servers fit together.',
  },
  {
    q: 'Does the planner know exactly which mods I have installed?',
    a: 'Not directly. We approximate your library from one main server you select (the server you usually play on). It is a practical proxy — not a perfect inventory — but it matches how most players manage console storage.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Your console preset and server choices are saved in your browser (localStorage). No sign-up, no login.',
  },
  {
    q: 'Where do mod file sizes come from?',
    a: 'Download sizes are pulled from the official Arma Reforger Workshop (version size). Sizes are cached for performance; the first analysis may load sizes gradually.',
  },
] as const;

export function StoragePlannerLanding() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <SEO
        title="Arma Reforger Console Mod Storage Planner — PS5 & Xbox"
        description="Free tool for PS5 and Xbox players: compare server modpack sizes, see combined download weight, find mods safe to delete, and check which servers fit your console storage."
        keywords="arma reforger console mods, ps5 mod storage, xbox series mod space, reforger modpack size, delete mods reforger, server mod comparison, console storage limit"
        url="/arma-reforger-console-mod-storage"
        image="/og-storage.png"
      />
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>

      <GraphicHero
        eyebrow="// MODERN MOD LOADOUT"
        title={
          <>
            Arma Reforger <span className="text-brand-mineral">Console Mod Storage</span> Planner
          </>
        }
        description="PS5 and Xbox players: see how much space a server modpack needs, compare multiple servers with shared-mod deduplication, and know what to delete before you run out of room."
        imageSrc={storageModules1600}
        imageSrcSet={`${storageModules960} 960w, ${storageModules1600} 1600w`}
        imageAlt="Modern military mission-data cases illustrating shared mod storage"
      >
        <Link
          to="/storage-planner"
          className="inline-flex min-h-11 items-center bg-tactical-orange px-7 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-black transition-colors hover:bg-white sm:px-10 sm:py-4"
        >
          Open free planner →
        </Link>
      </GraphicHero>

      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight text-center">
          The problem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Limited console space',
              body: 'You can usually save mods for only 2–3 servers, not all 5–6 your group plays on.',
            },
            {
              title: 'Manual guesswork',
              body: 'Players scroll workshop lists trying to figure out what to delete to make room for another server.',
            },
            {
              title: 'Shared mod confusion',
              body: 'RHS, WCS, and framework mods overlap across servers — raw mod counts lie about real storage.',
            },
          ].map((item) => (
            <Card key={item.title} className="border-l-4 border-l-red-500/60">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{item.title}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide leading-relaxed">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight text-center">
          How it works
        </h2>
        <ol className="space-y-4">
          {[
            'Pick your platform and how many GB you have free for mods (PS5 / Xbox presets or custom).',
            'Select your main server — we treat its modpack as your current installed library.',
            'Multi-select every server you want to play on. We compute one deduplicated total and show downloads vs safe removals.',
          ].map((step, i) => (
            <li
              key={step}
              className="flex gap-4 items-start border border-white/5 bg-[#172635] p-5"
            >
              <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-[#172635] border border-white/10 text-signal-neutral font-black text-sm">
                {i + 1}
              </span>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed pt-1">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-3xl mx-auto px-4 space-y-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight text-center">
          FAQ
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group border border-white/5 bg-[#172635] open:border-tactical-orange/30"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-[11px] font-black text-white uppercase tracking-wide hover:text-tactical-orange transition-colors">
                {item.q}
              </summary>
              <p className="px-5 pb-4 text-[10px] text-gray-500 font-bold uppercase tracking-wide leading-relaxed border-t border-white/5 pt-3">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 text-center space-y-4 border border-white/5 bg-[#172635] p-8">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">
          Ready to compare your servers?
        </h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          {STORAGE_LANDING_SOURCES}
        </p>
        <Link
          to="/storage-planner"
          className="inline-block px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors"
        >
          Open Storage Planner
        </Link>
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest pt-2">
          Also browse{' '}
          <Link to="/servers" className="text-tactical-orange hover:underline">
            active servers
          </Link>{' '}
          or{' '}
          <Link to="/" className="text-tactical-orange hover:underline">
            mod rankings
          </Link>
        </p>
      </section>
    </div>
  );
}
