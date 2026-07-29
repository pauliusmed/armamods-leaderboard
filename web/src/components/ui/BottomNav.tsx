import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Mods', icon: '📦', matchExact: true },
  { path: '/servers', label: 'Servers', icon: '🖥️', matchExact: false },
  { path: '/trending', label: 'Trending', icon: '📈', matchExact: false },
  { path: '/scenarios', label: 'Scenarios', icon: '🗺️', matchExact: false },
];

const TOOLS = [
  { path: '/audit', label: 'Config Audit' },
  { path: '/dependency-blockers', label: 'Blockers' },
  { path: '/storage-planner', label: 'Planner' },
  { path: '/hosting', label: 'Hosting' },
];

export function BottomNav({ game }: { game?: string }) {
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const gp = game === 'arma3' ? '/arma3' : '';

  const isToolsActive = location.pathname === `${gp}/audit`
    || location.pathname === `${gp}/dependency-blockers`
    || location.pathname === `${gp}/storage-planner`
    || location.pathname === `${gp}/hosting`;

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === (gp + path) || location.pathname === (gp || '/');
    return location.pathname.startsWith(gp + path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#101923]/95 backdrop-blur-xl border-t border-white/10">
      {toolsOpen && (
        <div className="absolute bottom-full left-0 right-0 bg-[#1C2E3F] border border-white/10 border-b-0 p-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.path}
              to={gp + tool.path}
              onClick={() => setToolsOpen(false)}
              className={`block px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                location.pathname === (gp + tool.path)
                  ? 'text-tactical-orange bg-white/5'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tool.label}
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={gp + item.path}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors relative ${
              isActive(item.path, item.matchExact)
                ? 'text-tactical-orange'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.15em] mt-1">{item.label}</span>
            {isActive(item.path, item.matchExact) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-tactical-orange" />
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setToolsOpen(!toolsOpen)}
          className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors relative ${
            isToolsActive || toolsOpen ? 'text-tactical-orange' : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          <span className="text-lg leading-none">🛠</span>
          <span className="text-[8px] font-black uppercase tracking-[0.15em] mt-1">Tools</span>
          {(isToolsActive || toolsOpen) && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-tactical-orange" />
          )}
        </button>
      </div>
    </nav>
  );
}
