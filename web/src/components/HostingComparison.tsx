import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Cpu, Globe, Check, ExternalLink } from 'lucide-react';

export function HostingComparison() {
  const providers = [
    {
      name: "EmpowerServers",
      price: "$9.99",
      slots: "64+ Stable",
      ram: "8GB Baseline",
      cpu: "Ryzen 9 / i9 High-Clock",
      ddos: "Advanced Game Protection",
      locations: "Global (EU/US/AS)",
      bestFor: "Heavily Modded Communities",
      isWinner: true,
      url: "https://empowerservers.com/games/arma-reforger/?aff=294"
    },
    {
      name: "GTXGaming",
      price: "~$28.00",
      slots: "64 Slots",
      ram: "4GB Baseline",
      cpu: "Ryzen 9 7950X Option",
      ddos: "Standard Protection",
      locations: "Global",
      bestFor: "Experienced Power Users",
      isWinner: false,
      url: "https://www.gtxgaming.co.uk/server-hosting/arma-reforger-server-hosting/"
    },
    {
      name: "PingPerfect",
      price: "~$26.00",
      slots: "64 Slots",
      ram: "4GB Baseline",
      cpu: "Enterprise Xeon/Ryzen",
      ddos: "Standard Protection",
      locations: "Global",
      bestFor: "Budget Stability",
      isWinner: false,
      url: "https://pingperfect.com/gameservers/arma-reforger-server-hosting.php"
    },
    {
      name: "Nitrado",
      price: "~$38.00",
      slots: "64 Slots",
      ram: "4GB Baseline",
      cpu: "Standard Infrastructure",
      ddos: "Basic Protection",
      locations: "Global",
      bestFor: "Console Cross-play",
      isWinner: false,
      url: "https://server.nitrado.net/en-GB/offers/arma-reforger"
    }
  ];

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <SEO 
        title="Arma Reforger & Arma 3 Server Hosting Comparison 2026"
        description="Technical comparison of the best Arma hosting providers. We evaluate EmpowerServers, GTXGaming, and PingPerfect based on mod stability, 64-slot performance, and DDoS protection."
        keywords="best arma reforger hosting, arma 3 server rental, gtxgaming vs empower, stable arma mods server"
      />

      {/* Header */}
      <section className="text-center space-y-4 pt-12">
        <h1 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-tight px-4">
          The <span className="text-tactical-orange italic">Tactical Report</span>:<br/>
          Hosting Analysis 2026
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto text-sm sm:text-base px-4">
          A deep dive into stability, performance, and real-world costs for 64-slot modded Arma environments.
        </p>
      </section>

      {/* Benchmarks Section */}
      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="bg-zinc-950 border border-white/10 p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tactical-orange/5 blur-3xl" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center justify-center gap-3">
            <Shield className="w-6 h-6 text-tactical-orange" />
            The Stability Benchmark
          </h2>
          <p className="text-gray-400 text-[11px] sm:text-xs font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
            While many hosts advertise high player counts, Arma Reforger's <span className="text-white">Enfusion Engine</span> requires specific hardware optimization to maintain 64-slot stability under heavy mod loads. We focused on providers that deliver consistent TPS (Ticks Per Second).
          </p>
        </div>
      </section>

      {/* Main Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <table className="w-full border-collapse bg-zinc-950 border border-white/5 min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">64-Slot Price</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Memory (RAM)</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">DDoS Security</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Hardware</th>
              <th className="p-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Direct Link</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={i} className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${p.isWinner ? 'bg-tactical-orange/[0.04]' : ''}`}>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    {p.isWinner ? (
                      <div className="bg-tactical-orange p-1.5 rounded-sm">
                        <Zap className="w-4 h-4 text-black" />
                      </div>
                    ) : (
                      <div className="bg-white/5 p-1.5 rounded-sm">
                        <Globe className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className="text-white font-black uppercase tracking-widest text-sm">{p.name}</div>
                      <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">{p.bestFor}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className={`text-xl font-black italic ${p.isWinner ? 'text-tactical-orange' : 'text-white'}`}>{p.price}<span className="text-[10px] not-italic text-gray-500">/mo</span></div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">{p.isWinner ? 'Flat Rate' : 'Per-Slot Base'}</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.ram}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic leading-none mt-1">DDR4 / DDR5</div>
                </td>
                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                    <Shield className={`w-3 h-3 ${p.isWinner ? 'text-tactical-orange' : 'text-gray-500'}`} />
                    {p.ddos}
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.cpu}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-1">NVMe Storage</div>
                </td>
                <td className="p-6 text-right">
                  <a 
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 font-black uppercase tracking-widest text-[10px] transition-all ${
                      p.isWinner 
                      ? 'bg-tactical-orange text-black hover:bg-white shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                      : 'border border-white/20 text-white hover:border-white'
                    }`}
                  >
                    {p.isWinner ? 'Deploy Now' : 'Visit Host'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Deep Dive Sections */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
        <div className="space-y-4 p-6 bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Cpu className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm italic">Engine Optimization</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            Arma Reforger's network synchronization is highly sensitive to single-core frequency. In 2026, shared infrastructure is the primary cause of server lag. We prioritize hosts using dedicated Ryzen 9 7900+ series nodes.
          </p>
        </div>
        <div className="space-y-4 p-6 bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Shield className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm italic">Community Security</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            PvP communities are frequent targets for DDoS attacks. While basic Null-routing is standard, EmpowerServers offers specific L7 game-filtering to prevent server crashes during active operations.
          </p>
        </div>
        <div className="space-y-4 p-6 bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Check className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm italic">Modded 64-Slot Load</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            Most hosts charge $1.00+ per slot. For a 64-player server, this can exceed $60. Empower's flat-rate model ($9.99) provides enough overhead for 80+ mods without additional costs.
          </p>
        </div>
      </section>

      {/* Final Verdict Card */}
      <section className="max-w-4xl mx-auto px-4 pt-10">
        <Card className="bg-zinc-900 border-tactical-orange/20 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-tactical-orange" />
          <CardContent className="p-12 text-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">2026 Technical Verdict</h2>
              <p className="text-tactical-orange text-xs font-black uppercase tracking-widest underline decoration-2 underline-offset-4 decoration-white/20">Official Recommendation</p>
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
              If you are running a modded Arma Reforger community, <span className="text-white">EmpowerServers</span> remains the most cost-effective choice for 64-slot environments. They offer double the RAM of most competitors for less than half the price.
            </p>
            <div className="pt-4 flex flex-col items-center gap-4">
              <a 
                href="https://empowerservers.com/games/arma-reforger/?aff=294"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-16 py-6 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)] transform hover:scale-105"
              >
                Launch Your Server Now →
              </a>
              <div className="bg-white/5 border border-white/10 px-4 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Exclusive Deal: Use Code <span className="text-tactical-orange">10OFF</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
