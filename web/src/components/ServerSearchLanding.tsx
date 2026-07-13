import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';

const FAQ = [
  {
    q: 'How do I find active Arma Reforger servers?',
    a: 'Our server browser sorts all public servers by player count and SQE rank. You can filter by online status, console storage fit, and search by server name. The list refreshes every ~2 hours from live network scans.',
  },
  {
    q: 'What is SQE Rank?',
    a: 'Server Quality & Efficiency Index — a score that combines player count, mod uniqueness, and uptime history. Servers must sustain quality over ~14 days to reach top tiers (S/A/B/C). A single good snapshot is not enough to rank #1.',
  },
  {
    q: 'Can I see which mods a server uses?',
    a: 'Yes — each server detail page lists the full Installed Mod Stack with global ranks, player counts, and download sizes. You can also see co-deployed mods and workshop dependencies for every mod on the server.',
  },
  {
    q: 'Does this work for Arma 3 too?',
    a: 'Yes. Switch to Arma 3 mode in the header to browse Arma 3 servers, mod rankings, and scenarios. Arma 3 data comes from the same BattleMetrics network scan with the same SQE ranking system.',
  },
  {
    q: 'How often is the server list updated?',
    a: 'The collector runs every 2 hours via GitHub Actions and writes fresh data to Cloudflare KV. You are always seeing the latest network snapshot, cached at the edge for fast loading.',
  },
] as const;

export function ServerSearchLanding() {
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
        title="Arma Reforger & Arma 3 Server Browser — Find Active Servers"
        description="Browse live Arma Reforger and Arma 3 servers by player count, mods, SQE rank, and online status. Find the perfect server for your playstyle with real-time network data."
        keywords="arma reforger servers, arma 3 servers, arma server list, arma multiplayer servers, find arma servers, reforger server browser, arma 3 modded servers, arma server search, arma community servers"
        url="/arma-server-browser"
      />
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>

      <section className="text-center space-y-6 pt-8 px-4">
        <p className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">
          // SERVER_NETWORK_INTEL
        </p>
        <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-tight max-w-4xl mx-auto">
          Find the Best{' '}
          <span className="text-tactical-orange italic">Arma Reforger &amp; Arma 3</span> Servers
        </h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.15em] max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
          Browse live server network data — sorted by player count, SQE rank, mods, and online status.
          See what is running right now, not what was popular last week.
        </p>
        <Link
          to="/servers"
          className="inline-block mt-4 px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors"
        >
          Browse active servers →
        </Link>
      </section>

      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight text-center">
          Why use our server browser?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Live network data',
              body: 'No stale player counts. See exactly how many players are on each server right now, updated every 2 hours from public network scans.',
            },
            {
              title: 'SQE quality ranking',
              body: 'Servers are ranked by sustained performance — player count, mod quality, and uptime history over weeks, not one-time snapshots.',
            },
            {
              title: 'Full mod stack visibility',
              body: 'Every server detail page shows the complete mod list with global ranks, sizes, workshop status, and co-deployment analytics.',
            },
          ].map((item) => (
            <Card key={item.title} className="border-l-4 border-l-tactical-orange/60">
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
          How to find your next server
        </h2>
        <ol className="space-y-4">
          {[
            'Open the server browser — all public servers are listed, sorted by SQE rank by default.',
            'Use the search bar to find servers by name, or filter by online status and console storage fit.',
            'Click any server to see its full profile — mod stack, player history, uptime chart, and similar deployed servers.',
            'Compare modpacks with the Storage Planner to see if your console has enough space for a new server.',
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
        <div className="text-center">
          <Link
            to="/servers"
            className="inline-block px-8 py-3 border border-tactical-orange/50 text-tactical-orange text-[10px] font-black uppercase tracking-[0.25em] hover:bg-tactical-orange hover:text-black transition-colors"
          >
            Browse servers →
          </Link>
        </div>
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
          Ready to explore the network?
        </h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
          Server and player stats aggregated from public network sources · synced every ~2 hours
        </p>
        <Link
          to="/servers"
          className="inline-block px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors"
        >
          Open Server Browser
        </Link>
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest pt-2">
          Also explore{' '}
          <Link to="/" className="text-tactical-orange hover:underline">
            mod rankings
          </Link>
          {' · '}
          <Link to="/trending" className="text-tactical-orange hover:underline">
            trending mods
          </Link>
          {' · '}
          <Link to="/arma-reforger-console-mod-storage" className="text-tactical-orange hover:underline">
            console storage planner
          </Link>
        </p>
      </section>
    </div>
  );
}
