import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Cpu, Globe, Check, ExternalLink } from 'lucide-react';

interface HostingComparisonProps {
  game: 'arma3' | 'reforger';
}

export function HostingComparison({ game }: HostingComparisonProps) {
  const isReforger = game === 'reforger';
  const gameName = isReforger ? 'Arma Reforger' : 'Arma 3';
  const engineName = isReforger ? 'Enfusion Engine' : 'Real Virtuality';
  const maxStableSlots = isReforger ? '64' : '100+';

  const providers = [
    {
      name: "EmpowerServers",
      price: "$9.99",
      slots: isReforger ? "64+ Stable" : "Unlimited",
      ram: "8GB Baseline",
      cpu: "Ryzen 9 / i9 High-Clock",
      ddos: "Advanced L7 Filtering",
      features: isReforger ? "Full Cross-play (PC/Xbox/PS5)" : "High-Speed NVMe",
      isWinner: true,
      url: isReforger ? "https://empowerservers.com/games/arma-reforger/?aff=294" : "https://empowerservers.com/games/arma3/?aff=294"
    },
    {
      name: "GTXGaming",
      price: isReforger ? "~$26.00" : "~$30.00",
      slots: isReforger ? "64 Slots" : "100 Slots",
      ram: "4GB Baseline",
      cpu: "Ryzen 9 7950X Option",
      ddos: "Standard Protection",
      features: "Global Data Centers",
      isWinner: false,
      url: isReforger 
        ? "https://www.gtxgaming.co.uk/server-hosting/arma-reforger-server-hosting/" 
        : "https://www.gtxgaming.co.uk/server-hosting/arma-3-server-hosting/"
    },
    {
      name: "PingPerfect",
      price: isReforger ? "~$22.00" : "~$25.00",
      slots: isReforger ? "64 Slots" : "100 Slots",
      ram: "4GB Baseline",
      cpu: "Enterprise Xeon",
      ddos: "Standard Protection",
      features: "48-Hour Trial",
      isWinner: false,
      url: isReforger 
        ? "https://pingperfect.com/gameservers/arma-reforger-server-hosting.php" 
        : "https://pingperfect.com/gameservers/arma-3-server-hosting.php"
    },
    {
      name: "Nitrado",
      price: isReforger ? "~$34.00" : "~$38.00",
      slots: isReforger ? "64 Slots" : "100 Slots",
      ram: "4GB Baseline",
      cpu: "Standard Infrastructure",
      ddos: "Basic Protection",
      features: "Mobile App Manager",
      isWinner: false,
      url: isReforger 
        ? "https://server.nitrado.net/en-GB/offers/arma-reforger" 
        : "https://server.nitrado.net/en-GB/offers/arma-3"
    }
  ];

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <SEO 
        title={`Best ${gameName} Server Hosting Comparison 2026`}
        description={`Expert analysis of ${gameName} hosting providers. We evaluate EmpowerServers, GTXGaming, and PingPerfect based on TPS stability, -maxFPS configuration, and DDoS protection.`}
        keywords={`best ${gameName.toLowerCase()} hosting, ${gameName.toLowerCase()} server rental, arma crossplay hosting, stable ${gameName.toLowerCase()} mods server`}
      />

      {/* Header */}
      <section className="text-center space-y-4 pt-12">
        <h1 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-tight px-4">
          The <span className="text-tactical-orange italic">Tactical Report</span>:<br/>
          {gameName} Analysis
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto text-sm sm:text-base px-4">
          Objective hardware benchmarking and real-world cost analysis for {maxStableSlots}-slot {gameName} environments.
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
            {isReforger 
              ? `For Arma Reforger, we prioritize hosts that properly configure -maxFPS thresholds (60-120 TPS). This prevents CPU bottlenecking on the Enfusion engine, especially in cross-play environments where PC and Console synchronization is critical.`
              : `Arma 3's Real Virtuality engine relies heavily on single-core clock speed. Our benchmarks focus on providers utilizing Ryzen 9 or i9 architecture to maintain high server FPS (TPS) during large-scale Milsim operations.`
            }
          </p>
        </div>
      </section>

      {/* Main Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <table className="w-full border-collapse bg-zinc-950 border border-white/5 min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">{maxStableSlots}-Slot Price</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Memory (RAM)</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Key Feature</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">DDoS Security</th>
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
                      <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">{p.cpu}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className={`text-xl font-black italic ${p.isWinner ? 'text-tactical-orange' : 'text-white'}`}>{p.price}<span className="text-[10px] not-italic text-gray-500">/mo</span></div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">{p.isWinner ? 'No Slot Fees' : 'Slot-Based'}</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.ram}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic leading-none mt-1">DDR4 / DDR5</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-[10px] leading-tight max-w-[120px] mx-auto">
                    {p.features}
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest text-[10px]">
                    <Shield className={`w-3 h-3 ${p.isWinner ? 'text-tactical-orange' : 'text-gray-500'}`} />
                    {p.ddos}
                  </div>
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
            <h3 className="font-black uppercase tracking-widest text-sm italic">TPS Optimization</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            We only recommend hosts that allow full access to startup parameters. Setting proper -maxFPS limits (60-120) is essential for {gameName} to prevent the CPU from eking out unnecessary cycles, ensuring more headroom for complex AI and mods.
          </p>
        </div>
        <div className="space-y-4 p-6 bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Globe className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm italic">Cross-play Readiness</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            {isReforger 
              ? 'Arma Reforger servers must be optimized for PC, Xbox, and PS5 players simultaneously. This requires low-latency peering and high single-core frequency to handle Enfusion\'s network dynamic simulation.' 
              : 'Arma 3 Milsim requires robust database connections (ExtDB3) and fast NVMe storage to handle thousands of object spawns during long-term persistent operations (Persistence Support).'}
          </p>
        </div>
        <div className="space-y-4 p-6 bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Check className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm italic">Slot-Free Value</h3>
          </div>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            While basic hosts charge $0.50-$1.00 per slot, we prioritize resource-based providers. EmpowerServers allows you to scale up to the engine's stable limit ({maxStableSlots} players) without increasing your monthly cost.
          </p>
        </div>
      </section>

      {/* Final Verdict Card */}
      <section className="max-w-4xl mx-auto px-4 pt-10">
        <Card className="bg-zinc-900 border-tactical-orange/20 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-tactical-orange" />
          <CardContent className="p-12 text-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">2026 Technical Verdict</h2>
              <p className="text-tactical-orange text-xs font-black uppercase tracking-widest underline decoration-2 underline-offset-4 decoration-white/20">Official Recommendation</p>
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
              For modded {gameName} communities requiring stable {maxStableSlots}-slot performance, <span className="text-white">EmpowerServers</span> offers the best price-to-performance ratio in the current market.
            </p>
            <div className="pt-4 flex flex-col items-center gap-4">
              <a 
                href={isReforger ? "https://empowerservers.com/games/arma-reforger/?aff=294" : "https://empowerservers.com/games/arma3/?aff=294"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-16 py-6 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)] transform hover:scale-105"
              >
                Launch Your {gameName} Server →
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
