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
  const [tab, setTab] = useState<'health' | 'affiliate'>('health');

  useEffect(() => {
    if (authed) {
      api.get('/health').then((r) => setHealth(r.data)).catch(() => {});
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
        {(['health', 'affiliate'] as const).map((t) => (
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
            {t === 'health' ? 'System Health' : 'Affiliate'}
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

      {tab === 'affiliate' && (
        <div className="space-y-4">
          <div className="border border-white/5 bg-[#172635] p-5 space-y-3">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Affiliate Links</h3>
            <p className="text-[9px] text-gray-500 font-mono">
              Empower Servers affiliate ID: <span className="text-white">294</span>
            </p>
            <div className="space-y-2 text-[9px] font-mono text-gray-400">
              <p>Reforger: <span className="text-white/80">empowerservers.com/games/arma-reforger/?aff=294</span></p>
              <p>Arma 3: <span className="text-white/80">empowerservers.com/games/arma3/?aff=294</span></p>
            </div>
            <p className="text-[9px] text-gray-600 pt-2 border-t border-white/5">
              Clicks are tracked via Empower Servers' own affiliate system — they count unique referrals
              by the <span className="text-white">?aff=294</span> parameter in the URL. No additional tracking needed from our side.
            </p>
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
