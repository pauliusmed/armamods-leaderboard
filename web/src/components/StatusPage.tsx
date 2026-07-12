import { useEffect, useState, useCallback } from 'react';
import { diagnosticsApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';

interface StatusPageProps {
  game?: GameType;
}

export function StatusPage({ game = 'reforger' }: StatusPageProps) {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);

  const loadStatus = useCallback(async () => {
    const start = Date.now();
    try {
      setLoading(true);
      const [res, healthRes] = await Promise.all([
        diagnosticsApi.getDiagnostics(game),
        diagnosticsApi.getHealth().catch(() => null),
      ]);
      setData(res);
      setHealth(healthRes);
      setLatency(Date.now() - start);
      setError(null);
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
        const body = axiosErr.response?.data;
        setError(body?.message || body?.error || (err instanceof Error ? err.message : 'Failed to retrieve diagnostics'));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to retrieve diagnostics');
      }
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading) return <StatusState type="loading" />;
  if (error) return (
    <StatusState 
      type="error" 
      message={error} 
      onAction={loadStatus} 
      actionText="Reconnect Diagnostics" 
    />
  );

  const stats = data?.data?.stats || { totalMods: 0, totalPlayers: 0, totalServers: 0 };
  const kv = data?.data?.kv || {};
  const historyRange = data?.data?.historyRange || {};
  const lastUpdate = data?.data?.lastUpdate;
  
  // Format byte size to human readable
  const formatBytes = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Check if lastUpdate is older than 2.5 hours (indicating delayed collector)
  const isCollectorDelayed = () => {
    if (!lastUpdate) return true;
    const updateTime = new Date(lastUpdate).getTime();
    const now = Date.now();
    return now - updateTime > 2.5 * 60 * 60 * 1000; // 2.5 hours
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SEO 
        title={`System Status & Diagnostics - ${game === 'reforger' ? 'Arma Reforger' : 'Arma 3'}`}
        description={`Real-time server telemetry status, Cloudflare KV edge sharding metrics, database range, and global network counts for the Arma Mods Leaderboard.`}
      />

      {/* Header Panel */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
              System Diagnostics
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange text-[9px] font-black tracking-widest uppercase">
              {data?.version || 'v1.4.0'}
            </div>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            Real-time Edge node telemetry and ingestion network intelligence
          </p>
        </div>

        {/* Global Encryption Status */}
        <div className="flex items-center gap-4 bg-[#172635] border border-white/5 p-4 rounded-lg">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-ok opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-signal-ok"></span>
          </div>
          <div className="space-y-0.5">
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Main Engine</p>
            <p className="text-[11px] text-white font-black uppercase tracking-wider">
              {data?.status === 'HEALTHY' ? 'SYSTEM_STABLE_100' : 'SYSTEM_WARNING'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Ingestion Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Global Registries</p>
            <p className="text-4xl font-black text-white tracking-tight font-mono">{stats.totalMods.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Tracked Modifications</p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Active Deployments</p>
            <p className="text-4xl font-black text-white tracking-tight font-mono">{stats.totalServers.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Monitored Game Servers</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Combat Personnel</p>
            <p className="text-4xl font-black text-white tracking-tight font-mono">{stats.totalPlayers.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Active Players Telemetry</p>
          </CardContent>
        </Card>
      </div>

      {/* Database & Edge Ingestion Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Database Health Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.25em] border-b border-white/5 pb-2">
            // Telemetry Ingestion Pipeline
          </h3>
          
          <div className="bg-[#172635] border border-white/5 p-6 rounded-lg space-y-6">
            
            {/* Collector Status Row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="space-y-1">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Collector Status</p>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {isCollectorDelayed() ? '⚠️ Refresh Delayed' : '⚡ Synchronized'}
                </p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                isCollectorDelayed() 
                  ? 'text-signal-warning' 
                  : 'text-signal-ok'
              }`}>
                {isCollectorDelayed() ? 'STALE' : 'OK'}
              </span>
            </div>

            {/* Time Stamp Row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="space-y-1">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Last Database Sync</p>
                <p className="text-xs font-bold text-white uppercase font-mono">
                  {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never'}
                </p>
              </div>
              <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Every 2 Hours</p>
            </div>

            {/* History Range Row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="space-y-1">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">History Span</p>
                <p className="text-xs font-bold text-white uppercase font-mono">
                  {historyRange.start && historyRange.end 
                    ? `${new Date(historyRange.start).toLocaleDateString()} - ${new Date(historyRange.end).toLocaleDateString()}`
                    : 'N/A'
                  }
                </p>
              </div>
              <p className="text-xs font-black text-tactical-orange font-mono">
                {historyRange.count || 0} Snapshots
              </p>
            </div>

            {/* Latency Performance Meter */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-gray-500 font-black uppercase tracking-widest">Client-to-Edge Latency</span>
                <span className="text-tactical-orange font-black uppercase tracking-widest font-mono">{latency}ms (RTT)</span>
              </div>
              
              {/* Latency progress bar */}
              <div className="h-1.5 bg-[#101923] border border-white/5 w-full relative overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    latency < 50 ? 'bg-signal-ok' : latency < 150 ? 'bg-tactical-orange' : 'bg-signal-critical'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, 100 - (latency / 3)))}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.15em]">
                {latency < 60 
                  ? 'Edge node responded instantaneously. Cache HIT active.' 
                  : 'Slight network routing overhead. Edge cache miss.'
                }
              </p>
            </div>

          </div>
        </div>

        {/* KV Storage Sharding Engine Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.25em] border-b border-white/5 pb-2">
            // Cloudflare KV Sharding Status
          </h3>
          
          <div className="bg-[#172635] border border-white/5 p-6 rounded-lg space-y-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
              Cloudflare KV restricts values to 25MB. In order to scale, the system splits large datasets into size-optimized 5MB memory chunks.
            </p>

            {/* KV Tables */}
            <div className="space-y-3 pt-2">
              {/* Table header */}
              <div className="grid grid-cols-4 text-[8px] text-gray-600 font-black uppercase tracking-widest border-b border-white/10 pb-2">
                <span>Namespace Key</span>
                <span className="text-center">Shards</span>
                <span className="text-center">Total Entries</span>
                <span className="text-right">Payload Size</span>
              </div>

              {/* Shard Row 1 */}
              {kv.mods && (
                <div className="grid grid-cols-4 text-[11px] text-white font-mono items-center py-2 border-b border-white/5">
                  <span className="text-gray-400 font-sans font-bold">cache:mods</span>
                  <span className="text-center font-black text-tactical-orange">{kv.mods.chunks || 0}</span>
                  <span className="text-center">{kv.mods.total || 0}</span>
                  <span className="text-right font-black text-signal-ok">{formatBytes(kv.mods.size)}</span>
                </div>
              )}

              {/* Shard Row 2 */}
              {kv.servers && (
                <div className="grid grid-cols-4 text-[11px] text-white font-mono items-center py-2 border-b border-white/5">
                  <span className="text-gray-400 font-sans font-bold">cache:servers</span>
                  <span className="text-center font-black text-tactical-orange">{kv.servers.chunks || 0}</span>
                  <span className="text-center">{kv.servers.total || 0}</span>
                  <span className="text-right font-black text-signal-ok">{formatBytes(kv.servers.size)}</span>
                </div>
              )}

              {/* Shard Row 3 */}
              {kv.history && (
                <div className="grid grid-cols-4 text-[11px] text-white font-mono items-center py-2 border-b border-white/5">
                  <span className="text-gray-400 font-sans font-bold">history:daily</span>
                  <span className="text-center font-black text-tactical-orange">{kv.history.chunks || 0}</span>
                  <span className="text-center">{kv.history.total || 0}</span>
                  <span className="text-right font-black text-signal-ok">{formatBytes(kv.history.size)}</span>
                </div>
              )}
            </div>

            {/* Sharding visualization bars */}
            <div className="space-y-3 pt-4">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Visual Chunk Grid Mapping</p>
              <div className="flex gap-2">
                {Array.from({ length: kv.mods?.chunks || 1 }).map((_, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 h-8 bg-[#172635] border border-white/5 flex items-center justify-center relative group"
                  >
                    <span className="text-[8px] font-black text-tactical-orange font-mono">C{idx}</span>
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white/10 text-[7px] text-white font-black uppercase tracking-widest whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      Mod Shard {idx} Active
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Health Check Panel */}
      {health && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.25em] border-b border-white/5 pb-2">
              // KV Health Probe ({health.durationMs}ms)
            </h3>
            <span className={`text-[9px] font-black uppercase tracking-widest ${
              health.healthy
                ? 'text-signal-ok'
                : 'text-signal-critical'
            }`}>
              {health.healthy ? 'ALL OK' : `${health.errorCount} ISSUES`}
            </span>
          </div>

          {health.errors?.length > 0 && (
            <div className="bg-[#172635] border border-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-signal-critical mb-2">Errors:</p>
              <ul className="space-y-1">
                {health.errors.map((err: string, i: number) => (
                  <li key={i} className="text-[10px] font-mono text-signal-critical/80">⚠ {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-[#172635] border border-white/5 p-6 space-y-4">
            {(['reforger', 'arma3'] as const).map((g) => {
              const chk = health.checks?.[g] as Record<string, unknown> | undefined;
              if (!chk) return null;
              const kvStatus = chk.kv as string;
              const mods = chk.mods as Record<string, unknown> | undefined;
              const servers = chk.servers as Record<string, unknown> | undefined;
              const lastUpdate = chk.lastUpdate as string | undefined;
              return (
                <div key={g} className="border-b border-white/5 pb-4 last:border-0 last:pb-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${kvStatus === 'ok' ? 'bg-signal-ok' : 'bg-signal-critical'}`}></span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">{g}</span>
                    {chk.isStale as boolean && <span className="text-[8px] text-signal-warning font-bold">STALE</span>}
                    <span className="text-[8px] text-gray-600 font-mono ml-auto">{chk.timingMs as number}ms</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px]">
                    <div>
                      <span className="text-gray-600">Mods: </span>
                      <span className="text-white font-bold">{(mods?.total as number) ?? '?'}</span>
                      <span className="text-gray-600"> ({(mods?.chunks as number) ?? 0} chunks)</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Servers: </span>
                      <span className="text-white font-bold">{(servers?.total as number) ?? '?'}</span>
                      <span className="text-gray-600"> ({(servers?.chunks as number) ?? 0} chunks)</span>
                    </div>
                    {lastUpdate && (
                      <p className="text-gray-500 font-mono truncate col-span-2" title={lastUpdate}>
                        Last: {new Date(lastUpdate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
