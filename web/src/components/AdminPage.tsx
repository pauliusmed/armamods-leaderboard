import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SEO } from './ui/SEO';

const ADMIN_PASSWORD = 'admin';
const AUTH_KEY = 'armamods:admin:authed';

function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'yes';
}

function setAuthed(v: boolean) {
  if (v) localStorage.setItem(AUTH_KEY, 'yes');
  else localStorage.removeItem(AUTH_KEY);
}

export function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthedState] = useState(isAuthed);
  const [health, setHealth] = useState<any>(null);
  const [clicks, setClicks] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [seedValue, setSeedValue] = useState('');
  const [tab, setTab] = useState<'dashboards' | 'health' | 'affiliate' | 'analytics'>('dashboards');

  useEffect(() => {
    if (authed) {
      api.get('/health').then((r) => setHealth(r.data)).catch(() => {});
      api.get('/admin/clicks').then((r) => setClicks(r.data)).catch(() => {});
      api.get('/admin/analytics').then((r) => setAnalytics(r.data)).catch(() => {});
    }
  }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#101923] px-4">
        <div className="max-w-sm w-full space-y-6 border border-white/5 bg-[#172635] p-8">
          <h1 className="text-xl font-black text-white uppercase tracking-tight text-center">
            Admin
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password === ADMIN_PASSWORD) {
                setAuthed(true);
                setAuthedState(true);
              }
            }}
            placeholder="Password"
            className="w-full bg-black/40 border border-white/10 px-4 py-3 text-white text-xs font-mono uppercase outline-none focus:border-tactical-orange"
          />
          <button
            type="button"
            onClick={() => {
              if (password === ADMIN_PASSWORD) {
                setAuthed(true);
                setAuthedState(true);
              }
            }}
            className="w-full py-3 bg-tactical-orange text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      <SEO title="Admin" />

      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Admin</h1>
        <button
          type="button"
          onClick={() => { setAuthed(false); setAuthedState(false); }}
          className="text-[10px] text-gray-500 hover:text-tactical-orange font-black uppercase tracking-widest"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2">
        {(['dashboards', 'health', 'analytics', 'affiliate'] as const).map((t) => (
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
            {t === 'health' ? 'System Health' : t === 'analytics' ? 'Analytics' : 'Affiliate'}
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
                  <p>Stale: {data.isStale ? '⚠ YES' : '✓ No'}</p>
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
            <p className="text-[9px] text-gray-500 font-mono">Visits, page views, LCP, CLS, INP, top pages — full history</p>
            <p className="text-[9px] text-gray-600 font-mono">900 visits · 2.11k page views · 517ms load time</p>
          </a>
          <a href="https://dash.cloudflare.com/945c61dd7d467620343f43685dce370c/workers/services/view/armamods-api/production/observability" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">Worker Logs</h3>
            <p className="text-[9px] text-gray-500 font-mono">API errors, 503s, collector cron failures</p>
          </a>
          <a href="https://billing.empowerservers.com/affiliates" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">Empower Affiliates</h3>
            <p className="text-[9px] text-gray-500 font-mono">34 clicks · 0 signups · 0% conversion</p>
          </a>
          <a href="https://github.com/pauliusmed/armamods-leaderboard" target="_blank" rel="noopener noreferrer" className="group border border-white/5 bg-[#172635] p-5 space-y-2 hover:border-tactical-orange/40 transition-all">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-tactical-orange">GitHub Repo</h3>
            <p className="text-[9px] text-gray-500 font-mono">Commits, deployments, CI status</p>
          </a>
        </div>
      )}

      {tab === 'affiliate' && (
        <div className="space-y-4">
          <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Empower Servers</h3>
            <p className="text-[9px] text-gray-500 font-mono">
              Affiliate ID: <span className="text-white">294</span>
            </p>
            <div className="space-y-2 text-[9px] font-mono text-gray-400">
              <p>Reforger: <span className="text-white/80">/api/click/empower?game=reforger</span></p>
              <p>Arma 3: <span className="text-white/80">/api/click/empower?game=arma3</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{clicks?.empower?.reforger ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Reforger clicks (ours)</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{clicks?.empower?.arma3 ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Arma 3 clicks (ours)</p>
            </div>
            <div className="border border-white/5 bg-[#172635] p-5 text-center space-y-1">
              <p className="text-3xl font-black text-white font-mono">{clicks?.empower?.total ?? '…'}</p>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Total tracked</p>
            </div>
          </div>

          <div className="border border-white/5 bg-[#172635] p-5 space-y-2">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Expected vs actual</h3>
            <div className="text-[9px] font-mono text-gray-400 space-y-1">
              <p>Cloudflare page views: <span className="text-white">2,110</span></p>
              <p>Affiliate banner impressions (est.): <span className="text-white">~400</span> (server detail views)</p>
              <p>Expected clicks at 2% CTR: <span className="text-white">~8</span></p>
              <p>Expected clicks at 5% CTR: <span className="text-white">~20</span></p>
              <p className="text-gray-600 pt-1">Empower reports 34 clicks over the site's lifetime — our tracking started fresh, compare in a few days.</p>
            </div>
          </div>

          <p className="text-[9px] text-gray-600 font-mono border-t border-white/5 pt-4">
            Empower dashboard reports <a href="https://billing.empowerservers.com/affiliates" target="_blank" rel="noopener noreferrer" className="text-tactical-orange hover:underline">34 clicks, 0 signups</a>. Our counter started at 0 — old Empower clicks are not retroactively tracked.
          </p>
          <div className="flex gap-2 border-t border-white/5 pt-3">
            <input
              type="number"
              value={seedValue}
              onChange={(e) => setSeedValue(e.target.value)}
              placeholder="Seed count"
              className="w-24 bg-black/40 border border-white/10 px-3 py-2 text-white text-[10px] font-mono outline-none focus:border-tactical-orange"
            />
            <button
              type="button"
              onClick={async () => {
                const v = parseInt(seedValue, 10);
                if (isNaN(v) || v < 0) return;
                await api.post('/admin/clicks/seed', { reforger: v, arma3: 0 });
                setSeedValue('');
                api.get('/admin/clicks').then((r) => setClicks(r.data)).catch(() => {});
              }}
              className="min-h-11 px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
            >
              Seed
            </button>
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
