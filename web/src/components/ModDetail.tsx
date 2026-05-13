import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { modsApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Mod, Server, ModHistory } from '../types';

interface ModDetailData extends Mod {
  stats: Mod & { totalMods: number };
  author?: string | null;
  servers: Server[];
}

interface ModDetailProps {
  game?: GameType;
}

export function ModDetail({ game = 'reforger' }: ModDetailProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const { modId } = useParams<{ modId: string }>();
  const [mod, setMod] = useState<ModDetailData | null>(null);
  const [history, setHistory] = useState<ModHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const loadMod = useCallback(async (days: number, signal?: AbortSignal) => {
    if (!modId) return;
    try {
      setLoading(true);
      const [modRes, historyData] = await Promise.all([
        modsApi.getById(modId, game),
        modsApi.getHistory(modId, days, game).catch(() => ({ data: [] }))
      ]);

      if (signal?.aborted) return;

      setMod(modRes.data);
      
      // Filter history: if data is older than 7 days and mod is currently inactive,
      // it's better to show no data than misleading stale data.
      const rawHistory = historyData.data || [];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const latestEntry = rawHistory.length > 0 ? new Date(rawHistory[rawHistory.length - 1].date) : null;
      const isStale = latestEntry && latestEntry < sevenDaysAgo && (modRes.data.totalPlayers === 0);

      let filteredHistory = isStale ? [] : rawHistory;

      // New logic: find the first point with activity to avoid leading zeros
      if (filteredHistory.length > 0) {
        const firstActiveIndex = filteredHistory.findIndex(h => (h.totalPlayers || 0) > 0 || (h.serverCount || 0) > 0);
        if (firstActiveIndex !== -1) {
          filteredHistory = filteredHistory.slice(firstActiveIndex);
        } else {
          // If no activity at all, keep it empty to show "No recent activity"
          filteredHistory = [];
        }
      }

      setHistory(filteredHistory);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load mission data');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [modId, game]);

  useEffect(() => {
    const controller = new AbortController();
    setHistory([]); // Clear history immediately on mod change
    loadMod(selectedDays, controller.signal);
    return () => controller.abort();
  }, [modId, selectedDays, loadMod]);



  if (loading) return <StatusState type="loading" />;
  if (error || !mod) return (
    <div className="space-y-8">
      <StatusState 
        type="error" 
        message={error || 'Module not found in registry'} 
        onAction={() => loadMod(selectedDays)} 
        actionText="Re-scan" 
      />
      <Link to={`${gp}/`} className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Database
      </Link>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-6">
        <Link to={`${gp}/`} className="inline-flex items-center gap-4 text-gray-500 hover:text-tactical-orange font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:-translate-x-2">
          ← [ Back to Registry ]
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">// MODULE_IDENTIFIER: {mod.id}</span>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              {mod.name}
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em]">
              Module ID: <span className="text-gray-300 font-mono">{mod.id}</span>
            </p>
          </div>
          <div className="px-8 py-4 bg-zinc-900 border border-white/10 text-center">
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Overall Rank</p>
            <p className="text-3xl font-black text-white">#{mod.stats?.overallRank || mod.overallRank || '-'}</p>
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Total Personnel', value: mod.stats?.totalPlayers || mod.totalPlayers || 0 },
          { label: 'Deployed Servers', value: mod.stats?.serverCount || mod.serverCount || 0 },
          { label: 'Marketshare', value: `${(mod.stats?.marketShare || 0).toFixed(1)}%` },
          { label: 'Overall Rank', value: `#${mod.stats?.overallRank || '-'}` }
        ]}
        title="Tactical Analytics"
        subtitle="Real-time module performance tracking across global network"
      />

      <section className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              📈 Performance Timeline
            </h2>
            <div className="flex gap-2 p-1 bg-zinc-900 border border-white/10">
              {[
                { label: '24H', value: 1 },
                { label: '30D', value: 30 },
                { label: '1M', value: 32 },
                { label: '1Y', value: 366 }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedDays(opt.value)}
                  className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    selectedDays === opt.value 
                      ? 'bg-tactical-orange text-black' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Card className="border-l-4 border-l-tactical-orange bg-zinc-900/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 lg:p-8 h-[400px]">
              {!history || history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest text-[10px] space-y-2">
                  <span>No recent activity detected</span>
                  <span className="text-[8px] opacity-50 font-medium">Data may be archived or module is currently inactive</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666" 
                      tickFormatter={(tick) => {
                        const d = new Date(tick);
                        if (selectedDays === 1) {
                          return `${d.getHours().toString().padStart(2, '0')}:00`;
                        }
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                      tick={{ fontSize: 10, fill: '#666', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="players"
                      stroke="#f97316" 
                      tick={{ fontSize: 10, fill: '#f97316', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <YAxis 
                      yAxisId="servers"
                      orientation="left"
                      stroke="#db2777" 
                      domain={[(min: number) => Math.max(0, min - 1), (max: number) => max + 1]}
                      tick={{ fontSize: 10, fill: '#db2777', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <YAxis 
                      yAxisId="rank"
                      orientation="right"
                      reversed
                      domain={[
                        (dataMin: number) => Math.max(1, dataMin - 5), 
                        (dataMax: number) => dataMax + 5
                      ]}
                      stroke="#3b82f6" 
                      tickFormatter={(val) => `#${val}`}
                      tick={{ fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
                      formatter={(value, name) => {
                        if (name === "Strategic Rank") return [`#${value}`, name];
                        return [value, name];
                      }}
                    />
                    <Line 
                      yAxisId="players"
                      type="monotone" 
                      dataKey="totalPlayers" 
                      name="Deployed Personnel"
                      stroke="#f97316" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#f97316', stroke: '#18181b', strokeWidth: 2 }}
                    />
                    <Line 
                      yAxisId="servers"
                      type="monotone" 
                      dataKey="serverCount" 
                      name="Active Servers"
                      stroke="#db2777" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#db2777', stroke: '#18181b', strokeWidth: 2 }}
                    />
                    <Line 
                      yAxisId="rank"
                      type="monotone" 
                      dataKey="overallRank" 
                      name="Strategic Rank"
                      stroke="#3b82f6" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6', stroke: '#18181b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Analysis Glossary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-[#f97316]" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Deployed Personnel</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Total player count. <span className="text-tactical-orange">Higher is better</span> – indicates a larger active player base.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-[#db2777]" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Active Servers</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Network presence. <span className="text-pink-500">Higher is better</span> – indicates wider deployment across server nodes.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-[#3b82f6]" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Strategic Rank</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Global standing. <span className="text-blue-500">Higher visual position is better</span> – Rank #1 is at the top of the axis.
                </p>
              </div>
            </div>
          </div>
        </section>

      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
            📡 Active Deployed Servers
          </h2>
          <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Displaying {(mod.servers || []).length} Intel Nodes
          </span>
        </div>

        {!mod.servers || mod.servers.length === 0 ? (
          <div className="p-12 sm:p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-lg sm:text-xl font-black text-gray-700 uppercase tracking-widest">No active deployments detected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {(mod.servers || []).map((server) => (
              <Card key={server.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all">
                <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-base sm:text-lg font-black text-white uppercase truncate">{server.name}</h3>
                    <p className="text-[8px] sm:text-[9px] font-mono text-gray-600 font-bold uppercase tracking-widest">{server.ip}:{server.port}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                    <div className="space-y-1">
                       <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-widest">Loadout Status</p>
                       <p className="text-base sm:text-xl font-black text-white">{server.players} / {server.maxPlayers}</p>
                    </div>
                    <Link
                      to={`${gp}/server/${server.id}`}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all text-center"
                    >
                      Inspect →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
