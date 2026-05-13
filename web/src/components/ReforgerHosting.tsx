import { useState } from 'react';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Globe, ExternalLink, Database, Activity, Cpu, Users, HardDrive, AlertCircle } from 'lucide-react';

export function ReforgerHosting() {
  const [modCount, setModCount] = useState(40);
  const [playerCount, setPlayerCount] = useState(32);
  
  const gameName = 'Arma Reforger';
  const maxStableSlots = '64';

  // Arma Reforger Telemetry: 3GB Base + 0.25GB per Player
  const getRecs = (mods: number, players: number) => {
    const ramNeeded = 3 + (players * 0.25);
    
    // Empower specific tiers: 8, 10, 12, 16, 32
    let recRAM = 8;
    if (ramNeeded > 16) recRAM = 32;
    else if (ramNeeded > 12) recRAM = 16;
    else if (ramNeeded > 10) recRAM = 12;
    else if (ramNeeded > 8) recRAM = 10;
    else recRAM = 8;

    // Reforger mods average 0.5GB per asset
    const rawStorage = 25 + (mods * 0.5); 
    const recStorage = rawStorage <= 50 ? '50GB' : (rawStorage <= 100 ? '100GB' : '200GB+');

    return { recRAM, recStorage, rawStorage };
  };

  const { recRAM, recStorage, rawStorage } = getRecs(modCount, playerCount);

  const providers = [
    {
      name: "ArmaMods Official Partner",
      subName: "Powered by EmpowerServers",
      basePrice: 9.99,
      ramTiers: {
        8: 0, 10: 2.50, 12: 6.00, 16: 10.50, 32: 30.00
      },
      baseRAM: 8,
      pricePerSlot: 0,
      cpu: "Ryzen 9 / i9 High-Clock",
      ddos: "Advanced L7 Filtering",
      isWinner: true,
      url: "https://empowerservers.com/games/arma-reforger/?aff=294",
      included: ["Unlimited Storage", "Extreme NVMe", "CPU Priority"]
    },
    {
      name: "GTXGaming",
      basePrice: 0,
      slotTiers: [
        { s: 10, p: 12.66 }, { s: 20, p: 15.21 }, { s: 30, p: 17.87 },
        { s: 40, p: 20.28 }, { s: 50, p: 25.35 }, { s: 60, p: 28.90 },
        { s: 70, p: 34.60 }, { s: 80, p: 39.54 }, { s: 100, p: 48.16 },
        { s: 128, p: 60.84 }
      ],
      ramTiers: {
        10: 0, 12: 8.86, 14: 11.39, 16: 13.93, 20: 19.00, 24: 22.80, 32: 30.41, 64: 55.76
      },
      storageTiers: {
        100: 0, 120: 8.86, 140: 11.39, 160: 13.93, 180: 16.46, 200: 19.00
      },
      baseRAM: 10,
      cpu: "Standard (Boost Extra)",
      ddos: "Standard Protection",
      isWinner: false,
      url: "https://www.gtxgaming.co.uk/server-hosting/arma-reforger-server-hosting/"
    },
    {
      name: "PingPerfect",
      basePrice: 16.33,
      slotTiers: [
        { s: 10, p: 0 }, { s: 20, p: 3.69 }, { s: 30, p: 7.38 },
        { s: 40, p: 11.07 }, { s: 50, p: 14.76 }, { s: 60, p: 18.45 },
        { s: 70, p: 22.14 }, { s: 80, p: 25.83 }, { s: 90, p: 29.53 },
        { s: 100, p: 33.22 }, { s: 128, p: 40.60 }
      ],
      ramTiers: {
        9: 0, 12: 10.99, 15: 13.99, 18: 17.99, 21: 21.99, 24: 23.99, 27: 28.99, 30: 30.99, 33: 32.66
      },
      storageTiers: {
        100: 0, 200: 20.27, 300: 40.55
      },
      baseRAM: 9,
      cpu: "Enterprise (Upsell-Driven)",
      ddos: "Standard Protection",
      isWinner: false,
      url: "https://pingperfect.com/gameservers/arma-reforger-server-hosting.php"
    },
    {
      name: "Nitrado",
      basePrice: 0,
      slotTiers: [
        { s: 10, p: 14.70 },
        { s: 20, p: 22.40 },
        { s: 32, p: 36.00 },
        { s: 64, p: 62.00 },
        { s: 100, p: 85.00 }
      ],
      cpu: "Shared / Obscured Specs",
      ddos: "Basic / Shared",
      isWinner: false,
      url: "https://server.nitrado.net/en-GB/offers/arma-reforger",
      warning: "Hardware limits hidden; prone to OOM crashes with heavy modpacks."
    }
  ];

  const calculateTotalPrice = (p: any) => {
    let total = 0;
    let details = [];

    if (p.name === "EmpowerServers") {
      const ramCost = p.ramTiers[recRAM] || 0;
      total = p.basePrice + ramCost;
      if (ramCost > 0) details.push(`+$${ramCost.toFixed(2)} RAM`);
      return { total: total.toFixed(2), details: details.join(", "), warning: null };
    }

    if (p.name === "Nitrado") {
      const tier = p.slotTiers.find((t: any) => t.s >= playerCount) || p.slotTiers[p.slotTiers.length - 1];
      total = tier.p;
      const isOOMRisk = recRAM > 8 && playerCount <= 20; 
      return { 
        total: total.toFixed(2), 
        details: "", 
        warning: isOOMRisk ? "High OOM Crash Risk (Insufficient RAM for Mods)" : null 
      };
    }

    // GTX and PingPerfect logic
    total = p.basePrice || 0;
    
    // 1. Slots
    const slotTier = p.slotTiers.find((t: any) => t.s >= playerCount) || p.slotTiers[p.slotTiers.length - 1];
    total += slotTier.p;

    // 2. RAM
    const ramKeys = Object.keys(p.ramTiers).map(Number).sort((a, b) => a - b);
    const matchedRamKey = ramKeys.find(k => k >= recRAM) || ramKeys[ramKeys.length - 1];
    const ramCost = p.ramTiers[matchedRamKey] || 0;
    total += ramCost;
    if (ramCost > 0) details.push(`+$${ramCost.toFixed(2)} RAM`);

    // 3. Storage
    if (p.storageTiers) {
      const storageKeys = Object.keys(p.storageTiers).map(Number).sort((a, b) => a - b);
      const matchedStorageKey = storageKeys.find(k => k >= rawStorage) || storageKeys[storageKeys.length - 1];
      const storageCost = p.storageTiers[matchedStorageKey] || 0;
      total += storageCost;
      if (storageCost > 0) details.push(`+$${storageCost.toFixed(2)} Storage`);
    }

    // 4. Parity Upsells (CPU Priority/Extreme NVMe) needed for high pop/mods
    let upsellCost = 0;
    if (playerCount > 40 || modCount > 100) {
      if (p.name === "GTXGaming") {
        upsellCost = 12.64; // CPU Priority ($6.32) + NVMe ($6.32)
        details.push(`+$${upsellCost} Perf. Upsells`);
      } else if (p.name === "PingPerfect") {
        upsellCost = 27.03; // Extreme Hardware ($20.27) + 60 FPS ($6.76)
        details.push(`+$${upsellCost} Perf. Upsells`);
      }
    }
    total += upsellCost;

    return { total: total.toFixed(2), details: details.join(" | "), warning: null };
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <SEO 
        title={`Best ${gameName} Server Hosting Comparison 2026`}
        description={`Expert analysis of ${gameName} hosting providers based on real telemetry. 3GB base usage + 0.25GB per player calculation for Conflict and MILSIM.`}
        keywords="best arma reforger hosting, reforger server rental, enfusion engine hosting, arma crossplay server"
      />

      <section className="text-center space-y-4 pt-12">
        <h1 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-tight px-4">
          <span className="text-tactical-orange italic">Reforger</span> Capacity Analysis
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto text-sm sm:text-base px-4">
          Interactive Enfusion Engine infrastructure planning ({maxStableSlots} Slots Baseline).
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4">
        <Card className="bg-zinc-950 border border-white/10 p-8 space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tactical-orange/5 blur-3xl" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px]">
                    <Users className="w-3 h-3 text-tactical-orange" />
                    Target Player Count
                  </div>
                  <span className="text-tactical-orange font-black italic">{playerCount} Slots</span>
                </div>
                <input 
                  type="range" min="4" max="128" value={playerCount} 
                  onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-tactical-orange"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px]">
                    <Database className="w-3 h-3 text-tactical-orange" />
                    Modpack Complexity
                  </div>
                  <span className="text-tactical-orange font-black italic">{modCount} Mods</span>
                </div>
                <input 
                  type="range" min="0" max="250" value={modCount} 
                  onChange={(e) => setModCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-tactical-orange"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-white/5 p-5 rounded-sm text-center space-y-2">
                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recommended RAM</div>
                <div className="text-2xl font-black text-tactical-orange italic">{recRAM}GB</div>
                <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-white uppercase tracking-tighter">
                  <Cpu className="w-2.5 h-2.5 text-tactical-orange" />
                  Empower Tiers: 8, 10, 12, 16, 32
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-5 rounded-sm text-center space-y-2">
                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">NVMe Storage</div>
                <div className="text-2xl font-black text-tactical-orange italic">{recStorage}</div>
                <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-white uppercase tracking-tighter">
                  <HardDrive className="w-2.5 h-2.5 text-tactical-orange" />
                  Mod Asset Buffer
                </div>
              </div>
            </div>
          </div>

          {(modCount > 120 || playerCount > 40) && (
            <div className="flex items-center gap-3 bg-tactical-orange/10 border border-tactical-orange/20 p-3">
              <Activity className="w-4 h-4 text-tactical-orange animate-pulse" />
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
                Expert Analysis: A standard 'Conflict' scenario (40p) requires ~12GB-16GB RAM for stability. For large-scale MILSIM (64p+) with {modCount} mods, 32GB+ is mandated to prevent entity drift on the Enfusion engine.
              </p>
            </div>
          )}
        </Card>
      </section>

      <section className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <table className="w-full border-collapse bg-zinc-950 border border-white/5 min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Monthly Cost</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Pricing Model</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Hardware Node</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">DDoS Security</th>
              <th className="p-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => {
              const { total, details, warning } = calculateTotalPrice(p);
              return (
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
                      <div className="flex flex-col">
                        <div className="text-white font-black uppercase tracking-widest text-sm">{p.name}</div>
                        {p.subName && <div className="text-[8px] text-tactical-orange/60 font-bold uppercase tracking-[0.2em]">{p.subName}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`text-xl font-black italic ${p.isWinner ? 'text-tactical-orange' : 'text-white'}`}>
                      ${total}
                      <span className="text-[10px] not-italic text-gray-500">/mo</span>
                    </div>
                    {details && (
                      <div className="flex flex-col items-center justify-center gap-0.5 mt-1">
                        <div className="flex items-center gap-1 text-[8px] font-bold text-red-500 uppercase tracking-widest">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Included Addons:
                        </div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">
                          {details}
                        </div>
                      </div>
                    )}
                    {warning && (
                      <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1 animate-pulse">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {warning}
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-white font-black uppercase tracking-widest text-[9px] leading-tight">
                      {p.name === "EmpowerServers" ? (
                        <span className="text-emerald-500">Resource Based (No Slot Tax)</span>
                      ) : (
                        `Slot-Locked Pricing`
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic leading-none mt-1">
                      Target: {playerCount} Slots
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-white font-black uppercase tracking-widest text-xs">{p.cpu}</div>
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-1">NVMe Storage</div>
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
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="max-w-4xl mx-auto px-4 pt-10">
        <Card className="bg-zinc-900 border-tactical-orange/20 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-tactical-orange" />
          <CardContent className="p-12 text-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Arma Reforger Verdict</h2>
              <p className="text-tactical-orange text-xs font-black uppercase tracking-widest underline decoration-2 underline-offset-4 decoration-white/20 italic">For Modern Enfusion Communities</p>
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
              Reforger's dynamic entity system requires fast I/O and stable RAM overhead. While others tax your player count and hide their hardware limits, <span className="text-white">EmpowerServers</span> provides elite infrastructure and transparent resource allocation as standard.
            </p>
            <div className="pt-4 flex flex-col items-center gap-4">
              <a 
                href="https://empowerservers.com/games/arma-reforger/?aff=294"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-16 py-6 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)] transform hover:scale-105"
              >
                Launch Your Reforger Server →
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
