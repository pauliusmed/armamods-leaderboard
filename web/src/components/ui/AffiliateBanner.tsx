import { useLocation } from 'react-router-dom';
import { empowerGameUrl } from '../../lib/siteLinks';

export function AffiliateBanner() {
  const location = useLocation();
  const isArma3 = location.pathname.startsWith('/arma3');
  const affiliateUrl = empowerGameUrl(isArma3 ? 'arma3' : 'reforger');

  return (
    <a 
      href={affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block group relative overflow-hidden bg-[#172635] border border-tactical-orange/40 p-6 sm:p-10 transition-all hover:border-tactical-orange"
    >
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-tactical-orange/5 blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-tactical-orange/15 transition-all duration-700" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Value Proposition */}
        <div className="space-y-4 flex-1 w-full text-center md:text-left">
          <span className="inline-block px-3 py-1 bg-tactical-orange/10 border border-tactical-orange/30 text-tactical-orange font-black text-[10px] uppercase tracking-[0.3em]">
            // ARMA SERVER HOSTING
          </span>
          
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-tactical-orange transition-colors">
              Premium Server<br className="hidden md:block" /> Hosting.
            </h3>
            <p className="text-gray-400 text-sm sm:text-base font-bold uppercase tracking-wide mt-2">
              Host your own Arma server today. Easy setup, honest pricing.
            </p>
          </div>

          {/* Hard Facts / Specs */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
             <div className="flex items-center gap-2 bg-black/50 border border-tactical-orange/50 px-3 py-1.5 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
               <div className="w-2 h-2 rounded-full bg-tactical-orange animate-pulse" />
               <span className="text-xs font-black text-tactical-orange uppercase tracking-widest">8GB+ RAM Baseline</span>
             </div>
             <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
               <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Unlimited NVMe</span>
             </div>
             <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
               <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Ryzen/i9 CPU</span>
             </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="flex flex-col items-center md:items-end gap-3 min-w-[240px] w-full md:w-auto p-6 md:p-0 bg-black/60 md:bg-transparent border md:border-none border-white/5">
          <div className="text-center md:text-right">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter italic shadow-black drop-shadow-md">
              $9.99<span className="text-base sm:text-xl text-gray-500 not-italic">/mo</span>
            </p>
          </div>
          <div className="w-full md:w-auto px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm transition-all group-hover:bg-white shadow-[0_0_25px_rgba(249,115,22,0.3)] group-hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] text-center transform group-hover:-translate-y-1">
            Rent Your Server →
          </div>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center">
            Instant Setup • 48H Refund • No Slot Limits
          </p>
          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest text-center">
            Affiliate link — supports this project at no extra cost to you
          </p>
        </div>
        
      </div>
    </a>
  );
}
