import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Globe, Cpu } from 'lucide-react';
import type { GameType } from '../api/client';

interface HostingLandingProps {
  game: GameType;
}

export function HostingLanding({ game }: HostingLandingProps) {
  const isReforger = game === 'reforger';
  const gameName = isReforger ? 'Arma Reforger' : 'Arma 3';
  
  // Game-specific deep links with affiliate tracking
  const affiliateUrl = `/api/click/empower?game=${isReforger ? 'reforger' : 'arma3'}`;

  return (
    <div className="space-y-20 animate-in fade-in duration-1000">
      <SEO 
        title={`Best ${gameName} Server Hosting - High Performance Nodes`}
        description={`Deploy your ${gameName} dedicated server today. Ryzen & i9 processors, unmetered NVMe storage, and 24/7 expert support. Starting from $9.99/mo.`}
        keywords={`${gameName} hosting, arma server rental, best arma hosting, ddos protected arma server`}
      />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-24 overflow-hidden border-b border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-tactical-orange/10 via-transparent to-transparent blur-[120px] pointer-events-none" />
        
        <div className="text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#172635] border border-white/5">
            <span className="relative flex w-2 h-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-ok"></span>
              </span>
            <span className="text-[10px] font-black text-tactical-orange uppercase tracking-[0.3em]">Flash Sale: Use Code 10OFF for $10 Off</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
              {gameName}<br/>
              <span className="text-tactical-orange">Server Hosting</span>
            </h1>
            <p className="text-gray-500 text-lg sm:text-xl font-bold uppercase tracking-widest max-w-3xl mx-auto leading-relaxed">
              We partnered with a top-tier provider to bring you the best hardware at the lowest price. No per-slot fees.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <a 
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-12 py-5 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)]"
            >
              Deploy Your Server Now →
            </a>
            <div className="flex items-center gap-4 text-gray-500 font-bold uppercase tracking-widest text-xs">
              <Shield className="w-5 h-5 text-tactical-orange" />
              DDoS Protected Network
            </div>
          </div>
        </div>
      </section>

      {/* Market Comparison - The Value Proposition */}
      <section className="max-w-5xl mx-auto space-y-8 px-4">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Why this is an unbeatable deal</h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Standard Arma hosting charges per slot. Our partner doesn't.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Average Competitor */}
          <Card className="bg-zinc-900/40 border-red-500/20 opacity-70">
            <CardContent className="p-8 space-y-6">
              <h3 className="text-gray-400 font-black uppercase tracking-widest text-sm text-center">Average Market Standard</h3>
              <div className="text-center">
                <span className="text-4xl font-black text-gray-400 line-through decoration-red-500/50">~$50.00</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest ml-2">/mo</span>
              </div>
              <ul className="space-y-3">
                <li className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                  <span>Player Limit</span> <span className="text-red-400">Strict 64 Slots</span>
                </li>
                <li className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                  <span>Memory</span> <span className="text-red-400">Standard 4GB</span>
                </li>
                <li className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                  <span>Processor</span> <span className="text-gray-400">Shared/Unknown</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Official Partner */}
          <Card className="bg-zinc-900 border-tactical-orange shadow-[0_0_30px_rgba(249,115,22,0.1)] relative transform md:scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#172635] border border-white/10 text-signal-neutral font-black uppercase tracking-widest text-[10px] px-4 py-1">
              Official Partner Deal
            </div>
            <CardContent className="p-8 space-y-6">
              <h3 className="text-tactical-orange font-black uppercase tracking-widest text-sm text-center">Premium Infrastructure</h3>
              <div className="text-center">
                <span className="text-6xl font-black text-white italic shadow-black drop-shadow-md">$9.99</span>
                <span className="text-sm text-gray-400 uppercase tracking-widest ml-2">/mo</span>
              </div>
              <ul className="space-y-4">
                <li className="flex justify-between text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-2">
                  <span>Player Limit</span> <span className="text-tactical-orange">UNLIMITED SLOTS</span>
                </li>
                <li className="flex justify-between text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-2">
                  <span>Memory</span> <span className="text-tactical-orange">8GB+ RAM BASELINE</span>
                </li>
                <li className="flex justify-between text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-2">
                  <span>Storage</span> <span className="text-tactical-orange">UNLIMITED NVMe</span>
                </li>
                <li className="flex justify-between text-sm font-black uppercase tracking-widest text-white">
                  <span>Processor</span> <span className="text-tactical-orange">Ryzen / Intel i9</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-zinc-900/50 border-white/5 hover:border-tactical-orange/30 transition-all">
          <CardContent className="p-8 space-y-4">
            <Cpu className="w-10 h-10 text-tactical-orange" />
            <h3 className="text-xl font-black text-white uppercase">Extreme Hardware</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed uppercase">
              High performance processors such as Ryzen and Intel i9 using NVMe SSD disks. Raw power for lag-free combat.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5 hover:border-tactical-orange/30 transition-all">
          <CardContent className="p-8 space-y-4">
            <Globe className="w-10 h-10 text-tactical-orange" />
            <h3 className="text-xl font-black text-white uppercase">Global Network</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed uppercase">
              Data center locations throughout the world hosted on 1Gbps and 10Gbps top-tier networks for low latency.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5 hover:border-tactical-orange/30 transition-all">
          <CardContent className="p-8 space-y-4">
            <Zap className="w-10 h-10 text-tactical-orange" />
            <h3 className="text-xl font-black text-white uppercase">Instant Setup</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed uppercase">
              No need to wait – with only a few clicks, start playing with friends in minutes. 100% automated deployment.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Pricing / CTA Section */}
      <section className="bg-[#172635] border border-white/5 p-12 sm:p-20">
        <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(249,115,22,0.02)_50%,transparent_75%)] bg-[length:20px_20px]" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Everything you need<br/>to run a community</h2>
              <div className="w-20 h-px bg-white/10" />
            </div>
            
            <ul className="space-y-4">
              {[
                'No Player Limit - Host as many as you need',
                'Unmetered NVMe Storage for all your mods',
                '8GB RAM Baseline (easily upgradeable)',
                'Ryzen & Intel i9 Processors',
                'Full FTP & File Manager Access',
                'Automated Daily Backups'
              ].map(item => (
                <li key={item} className="flex items-center gap-4 text-gray-400 font-bold uppercase tracking-widest text-xs">
                  <div className="w-1.5 h-1.5 bg-signal-neutral" />
                  {item}
                </li>
              ))}
            </ul>
            
            <div className="pt-4 border-t border-white/10">
              <p className="text-tactical-orange text-xs font-bold uppercase tracking-widest leading-loose">
                🤝 Community Reciprocity: <span className="text-gray-400">By deploying through this page, you directly support the ArmaMods Leaderboard project, keeping our daily tracking systems online.</span>
              </p>
            </div>
          </div>

          <div className="bg-black/60 border border-tactical-orange/40 p-10 space-y-8 text-center relative shadow-[0_0_50px_rgba(249,115,22,0.05)]">
            <div className="absolute top-0 right-0 px-4 py-1 bg-[#172635] border border-white/10 text-signal-neutral text-[10px] font-black uppercase tracking-widest transform translate-x-4 -translate-y-4">
              Official Partner Deal
            </div>
            <div className="space-y-2">
              <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">Starter Deployment</p>
              <div className="text-6xl font-black text-white tracking-tighter italic shadow-black drop-shadow-md">
                $9.99<span className="text-xl text-gray-600 not-italic">/mo</span>
              </div>
            </div>
            <a 
              href={affiliateUrl}
              className="block w-full py-5 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] transform hover:scale-105"
            >
              Deploy My Server Now →
            </a>
            <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-widest px-4">
              <span>Step 1: Choose Node</span>
              <span>Step 2: Initialize</span>
              <span className="text-tactical-orange">Ready in 60s</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Trusted by thousands of gamers</h2>
          <div className="flex items-center justify-center gap-1 text-tactical-orange">
            {[1,2,3,4,5].map(i => <span key={i} className="text-xl">★</span>)}
            <span className="ml-4 text-white font-black uppercase tracking-widest text-xs">4.7/5.0 on Trustpilot</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-zinc-900/30 border-white/5 italic text-gray-400 font-medium leading-relaxed p-8">
            "Had some issues setting up my new server, used the live chat to talk to support team and had my issues sorted out in no time! Stoked with their customer service."
          </Card>
          <Card className="bg-zinc-900/30 border-white/5 italic text-gray-400 font-medium leading-relaxed p-8">
            "I went through a couple other server providers and this has been one of the best. Support replies within seconds with real answers, not some AI."
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-12 border-t border-white/5 pt-20 pb-20">
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter text-center">Frequently Asked Questions</h2>
        <div className="max-w-4xl mx-auto space-y-8">
          {[
            { q: `How do I set up an ${gameName} server?`, a: `Simply select your plan, complete the order, and your server will be deployed instantly. You can then access the control panel to install mods and configure settings.` },
            { q: `Can I host custom mods?`, a: `Yes! You have full FTP access and a built-in file manager. You can install any mod from the Steam Workshop or Arma Reforger Workshop easily.` },
            { q: `Is the network DDoS protected?`, a: `Absolutely. Every server is hosted on our enterprise-grade network with 100% uptime SLA and advanced DDoS mitigation.` }
          ].map(faq => (
            <div key={faq.q} className="space-y-3">
              <h4 className="text-tactical-orange font-black uppercase tracking-widest text-sm">{faq.q}</h4>
              <p className="text-gray-500 font-medium uppercase tracking-wide text-xs leading-loose">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
