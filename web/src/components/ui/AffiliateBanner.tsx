import { useState, useEffect } from 'react';

const SLIDES = [
  {
    tag: '// UNLIMITED_STORAGE_NODE',
    title: 'Unmetered NVMe & i9/Ryzen CPU',
    desc: 'Pure tactical speed. No storage limits for your mission assets. Powered by enterprise-grade processors.',
    price: '$9.99/mo',
    cta: 'Initialize CPU Node →'
  },
  {
    tag: '// MEMORY_PRIORITY_DEPLOYMENT',
    title: '8GB+ RAM Baseline Standard',
    desc: 'Optimized for heavy modpacks and complex scripts. High-frequency RAM ensures smooth combat operations.',
    price: 'Start for $9.99',
    cta: 'Deploy RAM Node →'
  },
  {
    tag: '// CORE_PERFORMANCE_METRICS',
    title: 'High-Frequency Core Processing',
    desc: 'Dedicated to Arma performance. Unlimited storage and high-bandwidth network priority.',
    price: '$9.99/mo USD',
    cta: 'Get Core Access →'
  }
];

export function AffiliateBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <a 
      href="https://billing.empowerservers.com/aff.php?aff=294"
      target="_blank"
      rel="noopener noreferrer"
      className="block group relative overflow-hidden bg-zinc-950 border border-tactical-orange/20 p-8 sm:p-10 transition-all hover:border-tactical-orange/50"
    >
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-tactical-orange/5 blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-tactical-orange/10 transition-all duration-700" />
      
      {/* Animated Progress Bar */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-tactical-orange/20 w-full">
        <div 
          key={currentSlide}
          className="h-full bg-tactical-orange animate-[progress_5s_linear]" 
          style={{ width: '100%' }}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-4">
             <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">
               {slide.tag}
             </span>
             <div className="flex gap-1">
               {SLIDES.map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentSlide ? 'bg-tactical-orange' : 'bg-white/10'}`} />
               ))}
             </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-tactical-orange transition-colors">
              {slide.title}
            </h3>
            <p className="text-gray-500 text-sm sm:text-base font-bold uppercase tracking-wide max-w-2xl leading-relaxed">
              {slide.desc}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4 min-w-[240px]">
          <div className="text-center md:text-right">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Infrastructure Cost</p>
            <p className="text-4xl font-black text-white tracking-tighter italic">{slide.price}</p>
          </div>
          <div className="px-10 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-xs transition-all group-hover:bg-white shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            {slide.cta}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />
    </a>
  );
}
