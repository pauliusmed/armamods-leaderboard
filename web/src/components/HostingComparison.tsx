import { useState } from 'react';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Globe, Check, ExternalLink, Database, Activity, Cpu } from 'lucide-react';

interface HostingComparisonProps {
  game: 'arma3' | 'reforger';
}

export function HostingComparison({ game }: HostingComparisonProps) {
  const [modCount, setModCount] = useState(40);
  
  const isReforger = game === 'reforger';
  const gameName = isReforger ? 'Arma Reforger' : 'Arma 3';
  const maxStableSlots = isReforger ? '64' : '100+';

  // RAM logic based on mods
  const getRecommendedRAM = (mods: number) => {
    if (mods < 30) return 8;
    if (mods < 80) return 16;
    if (mods < 140) return 32;
    return 64;
  };

  const recRAM = getRecommendedRAM(modCount);

  const providers = [
    {
      name: "EmpowerServers",
      basePrice: 9.99,
      ramPricePer8GB: 5.00,
      baseRAM: 8,
      slots: "Unlimited",
      cpu: "Ryzen 9 / i9 High-Clock",
      ddos: "Advanced L7 Filtering",
      isWinner: true,
      url: isReforger ? "https://empowerservers.com/games/arma-reforger/?aff=294" : "https://empowerservers.com/games/arma3/?aff=294"
    },
    {
      name: "GTXGaming",
      basePrice: isReforger ? 26.00 : 30.00,
      ramPricePer8GB: 12.00,
      baseRAM: 4,
      slots: isReforger ? "64 Slots" : "100 Slots",
      cpu: "Ryzen 9 Option",
      ddos: "Standard Protection",
      isWinner: false,
      url: isReforger 
        ? "https://www.gtxgaming.co.uk/server-hosting/arma-reforger-server-hosting/" 
        : "https://www.gtxgaming.co.uk/server-hosting/arma-3-server-hosting/"
    },
    {
      name: "PingPerfect",
      basePrice: isReforger ? 22.00 : 25.00,
      ramPricePer8GB: 10.00,
      baseRAM: 4,
      slots: isReforger ? "64 Slots" : "100 Slots",
      cpu: "Enterprise Xeon",
      ddos: "Standard Protection",
      isWinner: false,
      url: isReforger 
        ? "https://pingperfect.com/gameservers/arma-reforger-server-hosting.php" 
        : "https://pingperfect.com/gameservers/arma-3-server-hosting.php"
    },
    {
      name: "Nitrado",
      basePrice: isReforger ? 34.00 : 38.00,
      ramPricePer8GB: 15.00,
      baseRAM: 4,
      slots: isReforger ? "64 Slots" : "100 Slots",
      cpu: "Standard Infrastructure",
      ddos: "Basic Protection",
      isWinner: false,
      url: isReforger 
        ? "https://server.nitrado.net/en-GB/offers/arma-reforger" 
        : "https://server.nitrado.net/en-GB/offers/arma-3"
    }
  ];

  const calculateTotalPrice = (p: any) => {
    const extraRAMNeeded = Math.max(0, recRAM - p.baseRAM);
    const ramUnits = Math.ceil(extraRAMNeeded / 8);
    return (p.basePrice + (ramUnits * p.ramPricePer8GB)).toFixed(2);
  };

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
          Interactive performance and real-world cost analysis for modded {gameName} ({maxStableSlots} Slots).
        </p>
      </section>

      {/* Interactive Mod Calculator */}
      <section className="max-w-4xl mx-auto px-4">
        <Card className="bg-zinc-950 border border-white/10 p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tactical-orange/5 blur-3xl" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <Database className="w-5 h-5 text-tactical-orange" />
                Mod Load Calculator
              </h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                Calculate real costs based on your community's mod requirements.
              </p>
            </div>
            
            <div className="bg-zinc-900 border border-white/5 px-6 py-4 rounded-sm text-center min-w-[200px]">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Recommended RAM</div>
              <div className="text-3xl font-black text-tactical-orange italic">{recRAM}GB</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-widest">
              <span>Lightweight (Vanilla)</span>
              <span className="text-tactical-orange">{modCount} Active Mods</span>
              <span>Extreme (150+ Mods)</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="200" 
              value={modCount} 
              onChange={(e) => setModCount(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-tactical-orange"
            />
            {modCount > 100 && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3">
                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">
                  High Mod Alert: Requires High-Clock CPU and 32GB+ RAM to avoid engine desync.
                </p>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Main Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <table className="w-full border-collapse bg-zinc-950 border border-white/5 min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Estimated Cost ({recRAM}GB)</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Base RAM</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">DDoS Security</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Hardware Node</th>
              <th className="p-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Action</th>
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
                    <div className="text-white font-black uppercase tracking-widest text-sm">{p.name}</div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className={`text-xl font-black italic ${p.isWinner ? 'text-tactical-orange' : 'text-white'}`}>
                    ${calculateTotalPrice(p)}
                    <span className="text-[10px] not-italic text-gray-500">/mo</span>
                  </div>
                  <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Total Estimated Bill</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.baseRAM}GB Included</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic leading-none mt-1">Upgrade: ${p.ramPricePer8GB}/8GB</div>
                </td>
                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest text-[10px]">
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

      {/* Hidden Costs Breakdown */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-center text-xl font-black text-white uppercase tracking-tighter">Where do the costs come from?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Player Slots', impact: 'High', icon: <Check className="w-3 h-3 text-tactical-orange" />, desc: 'Competitors charge per player. Empower offers Unlimited, but we recommend capping Reforger at 64-100 for engine stability.' },
            { label: 'RAM Upgrades', impact: 'Moderate', icon: <Cpu className="w-3 h-3 text-tactical-orange" />, desc: 'Essential for modding. Most hosts hide fees in extra RAM.' },
            { label: 'CPU Priority', icon: <Zap className="w-3 h-3 text-tactical-orange" />, impact: 'High', desc: 'Hidden fee for "Extreme" CPU performance in many hosts.' },
            { label: 'DDoS Fees', icon: <Shield className="w-3 h-3 text-tactical-orange" />, impact: 'Low', desc: 'Often free, but premium protection can be an addon.' }
          ].map((item, i) => (
            <div key={i} className="p-4 bg-zinc-900 border border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                {item.icon}
                <div className="text-[10px] font-black text-tactical-orange uppercase tracking-widest">{item.label}</div>
              </div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{item.desc}</div>
              <div className="inline-block px-2 py-0.5 bg-white/5 text-[8px] font-black text-white uppercase tracking-tighter">Impact: {item.impact}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final Verdict Card */}
      <section className="max-w-4xl mx-auto px-4 pt-10">
        <Card className="bg-zinc-900 border-tactical-orange/20 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-tactical-orange" />
          <CardContent className="p-12 text-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">The Heavy-Mod Verdict</h2>
              <p className="text-tactical-orange text-xs font-black uppercase tracking-widest underline decoration-2 underline-offset-4 decoration-white/20 italic">For 120+ Mod Communities</p>
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
              If your community runs a large modpack ({modCount} mods selected), the real-world cost difference is over <span className="text-white">$30-$50 per month</span>. <span className="text-white">EmpowerServers</span> provides the necessary 16GB-32GB RAM overhead for {maxStableSlots} players at the lowest market rate.
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
