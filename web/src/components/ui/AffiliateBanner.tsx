import { Link, useLocation } from 'react-router-dom';

export function AffiliateBanner() {
  const location = useLocation();
  const isArma3 = location.pathname.startsWith('/arma3');
  const hostingPath = isArma3 ? '/arma3/hosting' : '/hosting';

  return (
    <Link 
      to={hostingPath}
      className="block group relative overflow-hidden bg-zinc-950 border border-tactical-orange/40 p-6 sm:p-10 transition-all hover:border-tactical-orange hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]"
    >
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-tactical-orange/5 blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-tactical-orange/15 transition-all duration-700" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Value Proposition */}
        <div className="space-y-4 flex-1 w-full text-center md:text-left">
          <span className="inline-block px-3 py-1 bg-tactical-orange/10 border border-tactical-orange/30 text-tactical-orange font-black text-[10px] uppercase tracking-[0.3em]">
            // Unbeatable Hosting Deal
          </span>
          
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-tactical-orange transition-colors">
              Premium Hardware.<br className="hidden md:block" /> Honest Pricing.
            </h3>
            <p className="text-gray-400 text-sm sm:text-base font-bold uppercase tracking-wide mt-2">
              The ultimate infrastructure for your Arma community.
            </p>
          </div>

          {/* Hard Facts / Specs */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
             <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-tactical-orange animate-pulse" />
               <span className="text-xs font-black text-white uppercase tracking-widest">8GB+ RAM</span>
             </div>
             <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-tactical-orange animate-pulse" />
               <span className="text-xs font-black text-white uppercase tracking-widest">Unlimited NVMe</span>
             </div>
             <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-tactical-orange animate-pulse" />
               <span className="text-xs font-black text-white uppercase tracking-widest">Ryzen/i9 CPU</span>
             </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="flex flex-col items-center md:items-end gap-3 min-w-[240px] w-full md:w-auto p-6 md:p-0 bg-black/40 md:bg-transparent border md:border-none border-white/5">
          <div className="text-center md:text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1 line-through opacity-50">Normally $15.00+</p>
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter italic">
              $9.99<span className="text-base sm:text-xl text-gray-500 not-italic">/mo</span>
            </p>
          </div>
          <div className="w-full md:w-auto px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-xs transition-all group-hover:bg-white shadow-[0_0_20px_rgba(249,115,22,0.2)] text-center">
            View Plans →
          </div>
        </div>
        
      </div>
    </Link>
  );
}
