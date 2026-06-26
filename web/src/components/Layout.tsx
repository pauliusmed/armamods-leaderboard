import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isArma3 = location.pathname.startsWith('/arma3');
  const gp = isArma3 ? '/arma3' : '';

  const isActive = (path: string) => {
    // Exact match for home, or starts with for subpages
    if (path === '/' || path === '/arma3') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const navItemClass = (path: string) => `
    px-4 py-4 font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-300 relative group
    ${isActive(path)
      ? 'text-tactical-orange bg-white/5 border-l-2 border-r-2 border-tactical-orange'
      : 'text-gray-500 hover:text-white hover:bg-white/5'
    }
  `;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#000000] flex flex-col font-mono selection:bg-tactical-orange selection:text-black">
      {/* Top Bar - Tactical Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#000000]/80">
        <div className="max-w-screen-2xl mx-auto w-full flex items-stretch justify-between">
          <div className="flex items-center flex-1 min-w-0 px-4 sm:px-8 py-4 sm:py-6 lg:border-r lg:border-white/5 group">
            <Link to={gp || '/'} className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-tactical-orange flex items-center justify-center text-black font-black text-lg sm:text-xl tracking-tighter shadow-[0_0_15px_rgba(255,107,0,0.3)] group-hover:scale-110 transition-transform">
                {isArma3 ? 'A3' : 'AR'}
              </div>
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <h1 className="text-base sm:text-xl font-black text-white tracking-[0.1em] uppercase leading-none truncate">
                  Arma <span className="text-tactical-orange">{isArma3 ? '3' : 'Mods'}</span>
                </h1>
                <p className="text-[7px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] hidden sm:block truncate">
                  {isArma3 ? 'Legacy Combat Intel' : 'Mission Intelligence Center'}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center shrink-0">
            <Link to={gp || '/'} className={navItemClass(gp || '/')}>
              [ 📦 Mods Database ]
            </Link>
            <Link to={`${gp}/servers`} className={navItemClass(`${gp}/servers`)}>
              [ 🖥️ Active Servers ]
            </Link>
            <Link to={`${gp}/trending`} className={navItemClass(`${gp}/trending`)}>
              [ 📈 Trending Intel ]
            </Link>
            {!isArma3 && (
              <Link to="/audit" className={navItemClass('/audit')}>
                [ 🔍 Config Audit ]
              </Link>
            )}
            <Link to={`${gp}/hosting`} className={navItemClass(`${gp}/hosting`)}>
              [ 🚀 Get Hosting ]
            </Link>
          </nav>

          <div className="flex items-stretch shrink-0">
            {/* Compact System Status indicator (separated from content nav, but visible) */}
            <Link
              to={`${gp}/status`}
              title="System Status"
              aria-label="System Status"
              className={`flex items-center justify-center w-12 sm:w-14 border-l border-white/5 transition-colors ${
                isActive(`${gp}/status`) ? 'text-tactical-orange bg-white/5' : 'text-gray-500 hover:text-tactical-orange hover:bg-white/5'
              }`}
            >
              <span className="text-sm" aria-hidden="true">🛰</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-14 sm:w-16 border-l border-white/5 text-tactical-orange hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="relative block w-5 h-3.5" aria-hidden="true">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform duration-300 origin-center ${
                    mobileMenuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-[6px] h-0.5 w-5 bg-current transition-opacity duration-300 ${
                    mobileMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 bottom-0 h-0.5 w-5 bg-current transition-transform duration-300 origin-center ${
                    mobileMenuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>

            <div className="hidden lg:flex px-8 border-l border-white/5 items-center relative group/dropdown">
            <button className="flex items-center gap-3 py-6 group">
              <span className="w-2 h-2 bg-tactical-orange animate-pulse"></span>
              <div className="text-left">
                <span className="text-[7px] text-gray-500 font-bold tracking-[0.2em] uppercase block">Current Deployment</span>
                <span className="text-[10px] text-white font-black tracking-[0.2em] uppercase flex items-center gap-2">
                  {isArma3 ? 'Arma 3 Network' : 'Reforger Network'}
                  <svg className="w-2 h-2 text-tactical-orange group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </button>

            {/* Tactical Dropdown Menu */}
            <div className="absolute top-full right-0 w-64 bg-[#0a0a0a] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 py-2">
              <div className="px-4 py-2 border-b border-white/5 mb-2">
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">Switch Theater</span>
              </div>
              <Link 
                to={location.pathname.replace('/arma3', '') || '/'} 
                className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${!isArma3 ? 'text-tactical-orange' : 'text-gray-400'}`}
              >
                <div className={`w-1 h-4 ${!isArma3 ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">Arma Reforger</span>
              </Link>
              <Link 
                to={`/arma3${location.pathname.replace('/arma3', '')}`} 
                className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${isArma3 ? 'text-tactical-orange' : 'text-gray-400'}`}
              >
                <div className={`w-1 h-4 ${isArma3 ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">Arma 3 Legacy</span>
              </Link>
              <div className="mt-2 px-4 py-2 bg-tactical-orange/5 border-t border-white/5">
                <span className="text-[7px] text-tactical-orange/60 font-bold uppercase tracking-[0.2em]">Status: Encryption Active</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden relative z-10 border-t border-white/5 bg-[#000000]/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              <div className="flex gap-2 p-1 bg-white/5 border border-white/10 mb-4">
                <Link 
                  to={location.pathname.replace('/arma3', '') || '/'} 
                  className={`flex-1 py-3 text-center text-[8px] font-black uppercase tracking-widest transition-all ${!isArma3 ? 'bg-tactical-orange text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  Reforger
                </Link>
                <Link 
                  to={`/arma3${location.pathname.replace('/arma3', '')}`} 
                  className={`flex-1 py-3 text-center text-[8px] font-black uppercase tracking-widest transition-all ${isArma3 ? 'bg-tactical-orange text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  Arma 3
                </Link>
              </div>
              <Link
                to={gp || '/'}
                className={`block px-4 py-3 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                  isActive(gp || '/') ? 'text-tactical-orange bg-white/5' : 'text-gray-500'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                [ 📦 Mods Database ]
              </Link>
              <Link
                to={`${gp}/servers`}
                className={`block px-4 py-3 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                  isActive(`${gp}/servers`) ? 'text-tactical-orange bg-white/5' : 'text-gray-500'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                [ 🖥️ Active Servers ]
              </Link>
              <Link
                to={`${gp}/trending`}
                className={`block px-4 py-3 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                  isActive(`${gp}/trending`) ? 'text-tactical-orange bg-white/5' : 'text-gray-500'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                [ 📈 Trending Intel ]
              </Link>
              {!isArma3 && (
                <Link
                  to="/audit"
                  className={`block px-4 py-3 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                    isActive('/audit') ? 'text-tactical-orange bg-white/5' : 'text-gray-500'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  [ 🔍 Config Audit ]
                </Link>
              )}
              <Link
                to={`${gp}/hosting`}
                className={`block px-4 py-3 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${
                  isActive(`${gp}/hosting`) ? 'text-tactical-orange bg-white/5' : 'text-gray-500'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                [ 🚀 Get Hosting ]
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      {/* Content Spacer */}
      <div className="h-[72px] sm:h-[84px]"></div>

      <main className="flex-1 min-h-[60vh] max-w-screen-2xl mx-auto px-4 sm:px-8 w-full py-8 sm:py-12 relative">
        <div className="animate-in fade-in duration-1000">
          {children}
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="border-t border-white/5 bg-[#0a0c08] relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 py-12 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-16">
            <div className="md:col-span-2 space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-1.5 h-8 sm:w-2 sm:h-10 bg-tactical-orange"></div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-widest uppercase">
                  Operation: <span className="text-tactical-orange">Mods Analysis</span>
                </h2>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm font-medium leading-[2] max-w-lg uppercase tracking-wider">
                This platform provides strategic overview of the Arma Reforger ecosystem. We track
                server telemetry and player deployment across various custom modules.
                Data synchronized every 2 hours via external collector.
              </p>
              <Link
                to="/support"
                className="inline-flex items-center gap-2 px-4 py-2 bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange hover:bg-tactical-orange hover:text-black text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Support Development (€500 goal)
              </Link>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Telecommunication</h3>
              <div className="space-y-3 sm:space-y-4">
                <a href="https://github.com/GrybasTV/armamods-leaderboard" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">// External GitHub</a>
                <a href="https://discord.com/channels/105462288051380224/1486438889638854706" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">// Secure Discord</a>
                <ul className="space-y-4">
                  <li><Link to={isArma3 ? "/arma3" : "/"} className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Mod Database</Link></li>
                  <li><Link to={isArma3 ? "/arma3/servers" : "/servers"} className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Active Servers</Link></li>
                  <li><Link to={isArma3 ? "/best-arma-3-hosting" : "/best-arma-reforger-hosting"} className="text-tactical-orange hover:underline transition-colors font-black uppercase tracking-widest text-[10px]">Best Hosting 2026</Link></li>
                </ul>
                <Link to="/support" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">// Support Project</Link>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Infrastructure</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-loose">
                DataSource: <span className="text-gray-300">BattleMetrics</span><br/>
                Compute: <span className="text-gray-300">Edge Workers</span><br/>
                Hosting: <a href={isArma3 ? "https://empowerservers.com/games/arma3/?aff=294" : "https://empowerservers.com/games/arma-reforger/?aff=294"} target="_blank" rel="noopener noreferrer" className="text-tactical-orange hover:underline">High-Performance Nodes</a>
              </p>
            </div>
          </div>

          <div className="mt-12 sm:mt-20 pt-8 sm:pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <p className="text-gray-600 font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.4em] text-center sm:text-left">
              © 2026 COMMUNITY INTELLIGENCE PROJECT. NOT PART OF BOHEMIA INTERACTIVE.
            </p>
            <p className="text-gray-600 font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.4em]">
              EST: ALPHA-0.3
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
