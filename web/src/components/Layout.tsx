import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Satellite } from 'lucide-react';
import { DATA_SOURCE_ATTRIBUTION, DATA_STALE_FOOTER, DATA_SYNC_NOTE } from '../lib/siteCopy';
import { DONATION_GOAL_LABEL, DONATION_GOAL_MET } from '../lib/donation';
import { DataStaleBanner } from './DataStaleBanner';
import { OfflineBanner } from './OfflineBanner';
import { BottomNav } from './ui/BottomNav';
import { BrandLogo } from './ui/BrandLogo';
import { DiscordButton } from './ui/DiscordButton';
import { useDataFreshness, formatSyncAge } from '../hooks/useDataFreshness';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isArma3 = location.pathname.startsWith('/arma3');
  const gp = isArma3 ? '/arma3' : '';
  const freshness = useDataFreshness(isArma3 ? 'arma3' : 'reforger');

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

  const toolsActive =
    (!isArma3 &&
      (isActive('/audit') ||
        isActive('/dependency-blockers') ||
        isActive('/storage-planner') ||
        isActive('/arma-reforger-console-mod-storage'))) ||
    isActive(`${gp}/hosting`);
  const toolsNavClass = `
    px-4 py-4 font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-300 relative group/tools
    ${toolsActive
      ? 'text-tactical-orange bg-white/5 border-l-2 border-r-2 border-tactical-orange'
      : 'text-gray-500 hover:text-white hover:bg-white/5'
    }
  `;



  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#101923] flex flex-col selection:bg-tactical-orange selection:text-black pb-14 lg:pb-0">
      {/* Top Bar - Tactical Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#101923]/80">
        <div className="max-w-screen-2xl mx-auto w-full flex items-stretch justify-between">
          <div className="flex items-center flex-1 min-w-0 px-4 sm:px-8 py-4 sm:py-6 lg:border-r lg:border-white/5 group">
            <Link to={gp || '/'} className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BrandLogo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center shrink-0">
            <Link to={gp || '/'} className={navItemClass(gp || '/')}>
              Mods Database
            </Link>
            <Link to={`${gp}/servers`} className={navItemClass(`${gp}/servers`)}>
              Active Servers
            </Link>
            <Link to={`${gp}/trending`} className={navItemClass(`${gp}/trending`)}>
              Trending Intel
            </Link>
            <Link to={`${gp}/scenarios`} className={navItemClass(`${gp}/scenarios`)}>
              Scenarios
            </Link>
            <div className="relative group/tools">
              <button type="button" className={toolsNavClass}>
                Tools
                <svg className="inline-block ml-1 w-2 h-2 text-tactical-orange group-hover/tools:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 w-56 bg-[#1C2E3F] border border-white/10 opacity-0 invisible group-hover/tools:opacity-100 group-hover/tools:visible transition-all duration-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-white/5 mb-2">
                  <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">Utilities</span>
                </div>
                {!isArma3 && (
                  <Link
                    to="/audit"
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${isActive('/audit') ? 'text-tactical-orange' : 'text-gray-400'}`}
                  >
                    <div className={`w-1 h-4 ${isActive('/audit') ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Config Audit</span>
                  </Link>
                )}
                {!isArma3 && (
                  <Link
                    to="/dependency-blockers"
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${isActive('/dependency-blockers') ? 'text-tactical-orange' : 'text-gray-400'}`}
                  >
                    <div className={`w-1 h-4 ${isActive('/dependency-blockers') ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dependency Blockers</span>
                  </Link>
                )}
                {!isArma3 && (
                  <Link
                    to="/storage-planner"
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${isActive('/storage-planner') ? 'text-tactical-orange' : 'text-gray-400'}`}
                  >
                    <div className={`w-1 h-4 ${isActive('/storage-planner') ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Storage Planner</span>
                  </Link>
                )}
                <Link
                  to={`${gp}/hosting`}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors ${isActive(`${gp}/hosting`) ? 'text-tactical-orange' : 'text-gray-400'}`}
                >
                  <div className={`w-1 h-4 ${isActive(`${gp}/hosting`) ? 'bg-tactical-orange' : 'bg-transparent'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Get Hosting</span>
                </Link>
              </div>
            </div>
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
              <span className="text-sm" aria-hidden="true">
                <Satellite size={18} strokeWidth={1.5} />
              </span>
            </Link>

            {/* Mobile Theater Switch */}
            <Link
              to={isArma3
                ? location.pathname.replace(/^\/arma3/, '') || '/'
                : `/arma3${location.pathname === '/' ? '' : location.pathname}`
              }
              className="lg:hidden flex items-center justify-center w-14 sm:w-16 border-l border-white/5 text-gray-500 hover:text-tactical-orange hover:bg-white/5 transition-colors"
              aria-label={`Switch to ${isArma3 ? 'Reforger' : 'Arma 3'}`}
            >
              <span className="text-[9px] font-black uppercase tracking-widest">
                {isArma3 ? 'A3' : 'AR'}
              </span>
            </Link>

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
            <div className="absolute top-full right-0 w-64 bg-[#1C2E3F] border border-white/10 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 py-2">
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

      </header>

      {/* Main Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      {/* Content Spacer */}
      <div className="h-[72px] sm:h-[84px]"></div>

      <DataStaleBanner game={isArma3 ? 'arma3' : 'reforger'} />
      <OfflineBanner />

      <main className="flex-1 min-h-[60vh] max-w-screen-2xl mx-auto px-4 sm:px-8 w-full py-8 sm:py-12 relative">
        <div className="animate-in fade-in duration-1000">
          {children}
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="border-t border-white/5 bg-[#0d1520] relative overflow-hidden">
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
                {freshness.isStale
                  ? ` ${DATA_STALE_FOOTER}.`
                  : ' Data synchronized every 2 hours via external collector.'}
              </p>
              <Link
                to="/support"
                className="inline-flex items-center gap-2 px-4 py-2 bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange hover:bg-tactical-orange hover:text-black text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Community Sync Fund ({DONATION_GOAL_MET ? 'goal met' : DONATION_GOAL_LABEL})
              </Link>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Telecommunication</h3>
              <div className="space-y-3 sm:space-y-4">
                <a href="https://github.com/GrybasTV/armamods-leaderboard" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">External GitHub</a>
                <DiscordButton label="Join Discord" className="mt-2 px-4 py-2" />
                <Link to="/admin" className="block text-gray-600 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors">Admin</Link>
                <ul className="space-y-4">
                  <li><Link to={isArma3 ? "/arma3" : "/"} className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Mod Database</Link></li>
                  <li><Link to={isArma3 ? "/arma3/servers" : "/servers"} className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Active Servers</Link></li>
                  <li><Link to={isArma3 ? "/arma3/scenarios" : "/scenarios"} className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Scenario Leaderboard</Link></li>
                  <li><Link to={isArma3 ? "/best-arma-3-hosting" : "/best-arma-reforger-hosting"} className="text-tactical-orange hover:underline transition-colors font-black uppercase tracking-widest text-[10px]">Best Hosting 2026</Link></li>
                  {!isArma3 && (<>
                    <li><Link to="/arma-reforger-console-mod-storage" className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">Console Mod Storage</Link></li>
                    <li><Link to="/how-to-find-popular-arma-reforger-mods" className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">How to Find Mods</Link></li>
                    <li><Link to="/how-to-check-arma-reforger-modpack-size" className="text-gray-500 hover:text-tactical-orange transition-colors font-bold uppercase tracking-widest text-[10px]">How to Check Modpack Size</Link></li>
                  </>)}
                </ul>
                <Link to="/support" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">Community Fund</Link>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Infrastructure</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-loose">
                Registry: <span className="text-gray-300">reforgermods</span><br/>
                Sync:{' '}
                <span className={freshness.isStale ? 'text-amber-400' : 'text-gray-300'}>
                  {freshness.isStale
                    ? `STALE · last ${formatSyncAge(freshness.staleHours)}`
                    : '~2h network scan'}
                </span>
                <br/>
                Compute: <span className="text-gray-300">Edge Workers</span><br/>
                Hosting: <a href={isArma3 ? "/api/click/empower?game=arma3" : "/api/click/empower?game=reforger"} target="_blank" rel="noopener noreferrer" className="text-tactical-orange hover:underline">High-Performance Nodes</a>
              </p>
              <p className="text-gray-600 text-[9px] font-medium normal-case tracking-normal leading-relaxed">
                {freshness.isStale ? DATA_STALE_FOOTER : DATA_SYNC_NOTE}. {DATA_SOURCE_ATTRIBUTION}.
              </p>
            </div>
          </div>

          <div className="mt-12 sm:mt-20 pt-8 sm:pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <p className="text-gray-600 font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.4em] text-center sm:text-left">
              © 2026 COMMUNITY INTELLIGENCE PROJECT. NOT PART OF BOHEMIA INTERACTIVE.
            </p>
            <Link
              to="/privacy"
              className="text-gray-600 hover:text-tactical-orange font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.4em] transition-colors"
            >
              Privacy Policy
            </Link>
            <p className="text-gray-600 font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.4em]">
              EST: ALPHA-0.3
            </p>
          </div>
        </div>
      </footer>
      <BottomNav game={isArma3 ? 'arma3' : 'reforger'} />
    </div>
  );
}
