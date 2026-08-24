import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SEO } from './ui/SEO';

const TAB_LABELS = {
  dashboards: 'Links',
  health: 'System Health',
  analytics: 'Analytics',
  affiliate: 'Affiliate',
} as const;

type Tab = keyof typeof TAB_LABELS;

/** Ops shortcuts + live health/analytics. No client-side password gate — not a security boundary. */
export function AdminPage() {
  const [health, setHealth] = useState<any>(null);
  const [clicks, setClicks] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [seedValue, setSeedValue] = useState('');
  const [tab, setTab] = useState<Tab>('dashboards');

  useEffect(() => {
    api.get('/health').then((r) => setHealth(r.data)).catch(() => {});
    api.get('/admin/clicks').then((r) => setClicks(r.data)).catch(() => {});
    api.get('/admin/analytics').then((r) => setAnalytics(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      <SEO title="Admin" description="Internal operations dashboard." url="/admin" noindex />

      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Admin</h1>
        <p className="text-[9px] text-gray-600 font-mono mt-2">
          Internal ops links and live counters — not a secured control plane.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-11 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              tab === t
                ? 'bg-tactical-orange text-black border-tactical-orange'
                : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'health' && health && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(health.checks || {}).map(([game, data]: [string, any]) => (
              <div key={game} className="border border-white/5 bg-[#172635] p-5 space-y-3">
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{game}</h3>
                <div className="space-y-1 text-[9px] font-mono text-gray-400">
                  <p>KV: <span className={data.kv === 'ok' ? 'text-signal-ok' : 'text-signal-critical'}>{data.kv}</span></p>
                  <p>Mods: {data.mods?.total?.toLocaleString() ?? '—'}</p>
                  <p>Servers: {data.servers?.total?.toLocaleString() ?? '—'}</p>
                  <p>Last update: {data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : '—'}</p>
                  <p>Stale: {data.isStale ? 'YES' : 'No'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-white/5 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">API</p>
            <div className="text-[9px] font-mono text-gray-400 space-y-1">
              <p>Status: <span className="text-signal-ok">{health.status}</span></p>
              <p>Response time: {health.durationMs}ms</p>
              <p>Timestamp: {new Date(health.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'health' && !health && (
        <p className="text-gray-600 text-[10px] font-mono">Loading health data...</p>
      )}

      {tab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{analytics.summary?.totalRequests?.toLocaleString() ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Requests (since deploy)</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{analytics.summary?.totalErrors?.toLocaleString() ?? '—'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Errors (4xx/5xx)</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{analytics.summary?.overallErrorRate ?? '—'}%</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Error rate</p>
            </div>
          </div>

          <div className="border border-white/5 bg-[#172635] overflow-hidden">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest">
                  <th className="text-left px-4 py-3 font-black">Route</th>
                  <th className="text-right px-4 py-3 font-black">Total</th>
                  <th className="text-right px-4 py-3 font-black">Errors</th>
                  <th className="text-right px-4 py-3 font-black">Error %</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(analytics.counters || {}) as [string, { total: number; errors: number; errorRate: number }][]).sort(([, a], [, b]) => b.total - a.total).map(([route, counts]) => (
                  <tr key={route} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/80">/{route}</td>
                    <td className="px-4 py-3 text-right text-white/80">{counts.total.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${counts.errors > 0 ? 'text-signal-critical' : 'text-white/80'}`}>
                      {counts.errors.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right ${counts.errorRate > 5 ? 'text-signal-critical' : counts.errorRate > 1 ? 'text-yellow-400' : 'text-white/80'}`}>
                      {counts.errorRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[9px] text-gray-600 font-mono">{analytics.note}</p>
        </div>
      )}

      {tab === 'analytics' && !analytics && (
        <p className="text-gray-600 text-[10px] font-mono">Loading analytics...</p>
      )}

      {tab === 'dashboards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="https://dash.cloudflare.com/945c61dd7d467620343f43685dce370c/web-analytics/armamods-leaderboard.pages.dev" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">Cloudflare Analytics</h3>
            <p className="text-[9px] text-gray-500 font-mono">Visits, page views, Core Web Vitals, top pages</p>
          </a>
          <a href="https://billing.empowerservers.com/affiliates" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">Empower Affiliates</h3>
            <p className="text-[9px] text-gray-500 font-mono">External partner dashboard</p>
          </a>
          <a href="https://github.com/pauliusmed/armamods-leaderboard" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">GitHub Repo</h3>
            <p className="text-[9px] text-gray-500 font-mono">Commits, deployments, CI status</p>
          </a>
        </div>
      )}

      {tab === 'affiliate' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Empower Servers</h3>
              <p className="text-3xl font-black text-white font-mono">{clicks?.empower?.total ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">total clicks</p>
              <div className="text-[8px] font-mono text-gray-500 space-y-0.5">
                <p>Ref: {clicks?.empower?.reforger ?? '…'} | A3: {clicks?.empower?.arma3 ?? '…'}</p>
                <p className="text-white/60">{/* /api/click/empower?game=reforger|arma3 */}</p>
              </div>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">GTXGaming</h3>
              <p className="text-3xl font-black text-white font-mono">{clicks?.gtxgaming ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">clicks</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">PingPerfect</h3>
              <p className="text-3xl font-black text-white font-mono">{clicks?.pingperfect ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">clicks</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Nitrado</h3>
              <p className="text-3xl font-black text-white font-mono">{clicks?.nitrado ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">clicks</p>
            </div>
          </div>

          <div className="flex gap-2 border-t border-white/5 pt-3">
            <input
              type="number"
              value={seedValue}
              onChange={(e) => setSeedValue(e.target.value)}
              placeholder="Seed count"
              className="w-24 bg-black/40 border border-white/10 px-3 py-2 text-white text-[10px] font-mono outline-none focus:border-tactical-orange"
            />
            {(['empower', 'gtxgaming', 'pingperfect', 'nitrado'] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={async () => {
                  const v = parseInt(seedValue, 10);
                  if (isNaN(v) || v < 0) return;
                  const body: Record<string, number> = {};
                  if (provider === 'empower') {
                    body.reforger = v;
                    body.arma3 = 0;
                  } else {
                    body[provider] = v;
                  }
                  await api.post('/admin/clicks/seed', body);
                  setSeedValue('');
                  api.get('/admin/clicks').then((r) => setClicks(r.data)).catch(() => {});
                }}
                className="min-h-11 px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
              >
                Seed {provider === 'empower' ? 'Empower' : provider.charAt(0).toUpperCase() + provider.slice(1)}
              </button>
            ))}
          </div>

          <div className="border border-white/5 p-5 space-y-3">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Where affiliate links appear</h3>
            <ul className="space-y-1 text-[9px] font-mono text-gray-400">
              <li>• Affiliate banner on server detail pages</li>
              <li>• Hosting comparison tables (Reforger + Arma 3)</li>
              <li>• Header navigation (Best Hosting 2026)</li>
              <li>• Footer link</li>
            </ul>
          </div>
        </div>
      )}

      <div className="border-t border-white/5 pt-6 text-[9px] text-gray-600 font-mono">
        <Link to="/" className="text-tactical-orange hover:underline">← Back to site</Link>
      </div>
    </div>
  );
}
