import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serversApi, modsApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Server, ServerMod } from '../types';

interface ServerDetailProps {
  game?: GameType;
}

export function ServerDetail({ game = 'reforger' }: ServerDetailProps) {
  const { serverId } = useParams<{ serverId: string }>();
  const [server, setServer] = useState<Server | null>(null);
  const [history, setHistory] = useState<{ time: string; points: number; rank: number | null }[]>([]);
  const [totalServers, setTotalServers] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const [modSearch, setModSearch] = useState('');
  const [modSort, setModSort] = useState<'rank' | 'name' | 'players'>('players');
  const [personnelFilter, setPersonnelFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [rankFilter, setRankFilter] = useState<'all' | 'top100' | 'top500' | 'top1000'>('all');

  const gp = game === 'reforger' ? '' : `/${game}`;

  const loadServer = useCallback(async (days: number, signal?: AbortSignal) => {
    if (!serverId) return;
    try {
      setLoading(true);
      const [serverData, historyData, statsData] = await Promise.all([
        serversApi.getById(serverId, game),
        serversApi.getHistory(serverId, days, game),
        modsApi.getGlobalStats(game)
      ]);

      if (signal?.aborted) return;

      setServer(serverData.data);
      
      // Filter history: if latest data is older than 3 days, it's considered stale for servers
      const rawHistory = historyData.data || [];
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const latestEntry = rawHistory.length > 0 ? new Date(rawHistory[rawHistory.length - 1].time) : null;
      const isStale = latestEntry && latestEntry < threeDaysAgo;

      let filteredHistory = isStale ? [] : rawHistory;

      // Filter leading empty data for servers
      if (filteredHistory.length > 0) {
        const firstActiveIndex = filteredHistory.findIndex(h => (h.points || 0) > 0 || h.rank !== null);
        if (firstActiveIndex !== -1) {
          filteredHistory = filteredHistory.slice(firstActiveIndex);
        }
      }

      setHistory(filteredHistory);
      setTotalServers(statsData?.totalServers || 1);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load server');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [serverId, game]);

  useEffect(() => {
    const controller = new AbortController();
    setHistory([]);
    loadServer(selectedDays, controller.signal);
    return () => controller.abort();
  }, [serverId, selectedDays, loadServer]);

  const sortedAndFilteredMods = useMemo(() => {
    if (!server?.mods || !Array.isArray(server.mods)) return [];

    const filtered = (server.mods as ServerMod[]).filter(m =>
      (m.name.toLowerCase().includes(modSearch.toLowerCase()) ||
       m.id.toLowerCase().includes(modSearch.toLowerCase()))
      &&
      (
        personnelFilter === 'all' ||
        (personnelFilter === 'high' && m.totalPlayers >= 500) ||
        (personnelFilter === 'medium' && m.totalPlayers >= 100 && m.totalPlayers < 500) ||
        (personnelFilter === 'low' && m.totalPlayers < 100)
      )
      &&
      (
        rankFilter === 'all' ||
        (rankFilter === 'top100' && m.playerRank <= 100) ||
        (rankFilter === 'top500' && m.playerRank <= 500) ||
        (rankFilter === 'top1000' && m.playerRank <= 1000)
      )
    );

    return [...filtered].sort((a, b) => {
      if (modSort === 'name') return a.name.localeCompare(b.name);
      if (modSort === 'rank') return a.playerRank - b.playerRank;
      return (b.totalPlayers || 0) - (a.totalPlayers || 0);
    });
  }, [server?.mods, modSearch, modSort, personnelFilter, rankFilter]);

  if (loading) return <StatusState type="loading" />;
  if (error || !server) return (
    <div className="space-y-8">
      <StatusState
        type="error"
        message={error || 'Server connection lost'}
        onAction={() => loadServer(selectedDays)}
        actionText="Re-establish Connection"
      />
      <Link to={`${gp}/servers`} className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Network Map
      </Link>
    </div>
  );

  const fillPercent = server.maxPlayers > 0 ? (server.players / server.maxPlayers) * 100 : 0;


  
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-6">
        <Link to={`${gp}/servers`} className="inline-flex items-center gap-4 text-gray-500 hover:text-tactical-orange font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:-translate-x-2">
          ← [ Back to Network ]
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">// SERVER_NODE: {server.id}</span>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              {server.name}
            </h1>
            <p className="text-xl font-mono text-gray-500 font-bold uppercase tracking-widest">
              {server.ip}:{server.port}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-10 py-6 bg-zinc-900 border border-white/10 text-center">
              <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Overall Rank</p>
              <p className="text-3xl font-black text-tactical-orange tracking-tighter italic">#{server.sqeRank || '-'}</p>
            </div>
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Personnel Present', value: `${server.players || 0} / ${server.maxPlayers || 0}` },
          { label: 'Module Count', value: server.mods?.length || 0 },
          { label: 'Strategic Rank', value: `#${server.sqeRank || '-'}` },
          { label: 'Capacity Used', value: `${Math.round(fillPercent)}%` }
        ]}
        title="Field Intelligence Report"
        subtitle="Detailed analysis of deployed assets and personnel distribution"
      />

      <section className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              SQE Ranking History
            </h2>
            <div className="flex gap-2 p-1 bg-zinc-900 border border-white/10">
              {[
                { label: '24H', value: 1 },
                { label: '7D', value: 7 },
                { label: '1M', value: 30 },
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
                  <span className="text-[8px] opacity-50 font-medium">Server may be offline or monitoring was suspended</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="time"
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
                      stroke="#f97316"
                      tick={{ fontSize: 10, fill: '#f97316', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      reversed={true}
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickFormatter={(val) => `#${val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
                      formatter={(value: any) => [`#${value}`, 'SQE Rank']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      name="SQE Rank"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#f97316', stroke: '#18181b', strokeWidth: 2 }}
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
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">SQE Ranking Position</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Network hierarchy. <span className="text-tactical-orange">Lower # is better</span> – determined by SQE points calculated from personnel activity, module uniqueness, and server uptime.
                </p>
              </div>
            </div>
          </div>
        </section>

      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter whitespace-nowrap">
            Installed Mod Stack
          </h2>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Filter modules..."
              value={modSearch}
              onChange={(e) => setModSearch(e.target.value)}
              className="px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange transition-all w-full"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={personnelFilter}
                onChange={(e) => setPersonnelFilter(e.target.value as typeof personnelFilter)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white">Personnel: All</option>
                <option value="high" className="bg-zinc-900 text-white">High (500+)</option>
                <option value="medium" className="bg-zinc-900 text-white">Med (100+)</option>
                <option value="low" className="bg-zinc-900 text-white">New/Low</option>
              </select>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value as typeof rankFilter)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white">Rank: All</option>
                <option value="top100" className="bg-zinc-900 text-white">Top 100</option>
                <option value="top500" className="bg-zinc-900 text-white">Top 500</option>
                <option value="top1000" className="bg-zinc-900 text-white">Top 1000</option>
              </select>
              <select
                value={modSort}
                onChange={(e) => setModSort(e.target.value as typeof modSort)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all col-span-2 sm:col-span-1"
              >
                <option value="players" className="bg-zinc-900 text-white">Best Played</option>
                <option value="rank" className="bg-zinc-900 text-white">Global Rank</option>
                <option value="name" className="bg-zinc-900 text-white">Name</option>
              </select>
              <button
                onClick={() => { setModSearch(''); setPersonnelFilter('all'); setRankFilter('all'); setModSort('players'); }}
                className="px-2 py-3 border border-white/10 text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-tactical-orange transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {sortedAndFilteredMods.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">No modules matching scan parameters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sortedAndFilteredMods.map(mod => {
              const marketshare = totalServers > 0 ? ((mod.serverCount || 0) / totalServers) * 100 : 0;
              return (
              <Card key={mod.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all group overflow-hidden">
                <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 relative">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 sm:pb-3">
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Player Rank</p>
                        <p className="text-base sm:text-lg font-black text-white font-mono">#{mod.playerRank}</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 text-right">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Server Rank</p>
                        <p className="text-base sm:text-lg font-black text-white font-mono">#{mod.serverRank}</p>
                      </div>
                    </div>

                    <Link to={`${gp}/mod/${mod.id}`}>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight group-hover:text-tactical-orange transition-colors line-clamp-2">
                        {mod.name}
                      </h3>
                    </Link>
                    <p className="text-[7px] sm:text-[9px] font-mono text-gray-600 uppercase tracking-widest truncate">{mod.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4 border-t border-white/5 pt-3 sm:pt-4">
                     <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Personnel</p>
                        <p className="text-xs sm:text-xs font-black text-white font-mono">{(mod.totalPlayers || 0).toLocaleString()}</p>
                     </div>
                     <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Deployments</p>
                        <p className="text-xs sm:text-xs font-black text-white font-mono">{mod.serverCount || 0}</p>
                     </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 sm:pt-3">
                    <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Marketshare</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                      <div className="flex-1 h-1.5 sm:h-2 bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-tactical-orange transition-all duration-500"
                          style={{ width: `${Math.min(marketshare, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs font-black text-tactical-orange font-mono">{marketshare.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                    <Link
                      to={`${gp}/mod/${mod.id}`}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-gray-400 text-center uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                    >
                      Module Intel
                    </Link>
                    <a
                      href={/^\d+$/.test(mod.id)
                        ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`
                        : `https://reforger.armaplatform.com/workshop/${mod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center"
                    >
                      Workshop ↗
                    </a>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </section>
    </div>
  );
}
