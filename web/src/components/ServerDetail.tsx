import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serversApi, modsApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { SITE_ORIGIN, serverPageUrl, serverPreviewImageUrl } from '../lib/site';
import { AffiliateBanner } from './ui/AffiliateBanner';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';
import { TierBadge } from './ui/TierBadge';
import { ServerStatusBadge } from './ui/ServerStatusBadge';
import { BmLastSeenHint } from './ui/BmLastSeenHint';
import { FavoriteServerButton } from './ui/FavoriteServerButton';
import { useServerFavorites } from '../hooks/useServerFavorites';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { Server, ServerMod, ServerStoragePack } from '../types';
import { formatBytes } from '../lib/formatBytes';
import {
  buildOfflineBands,
  uptimeTooltipLabel,
  type ServerHistoryPoint,
} from '../lib/serverUptimeChart';
import {
  type ActivityFilter,
  type RankFilter,
  type SizeFilter,
  type EmbeddedModSort,
  ACTIVITY_FILTER_OPTIONS,
  RANK_FILTER_OPTIONS,
  SIZE_FILTER_OPTIONS,
  EMBEDDED_MOD_SORT_OPTIONS,
  filterServerMods,
  sortServerMods,
} from '../lib/modListFilters';
import { ListFilterBar } from './ui/ListFilterBar';
import { CopyServerModsButton } from './ui/CopyServerModsButton';
import { ModRow } from './ModRow';
import { toModRow } from './ui/ModDataTable';

interface ServerDetailProps {
  game?: GameType;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/[[\]]/g, '\\$&');
}

export function ServerDetail({ game = 'reforger' }: ServerDetailProps) {
  const { serverId } = useParams<{ serverId: string }>();
  const [server, setServer] = useState<Server | null>(null);
  const [history, setHistory] = useState<ServerHistoryPoint[]>([]);
  const [totalServers, setTotalServers] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const [modSearch, setModSearch] = useState('');
  const [modSort, setModSort] = useState<EmbeddedModSort>('players');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [rankFilter, setRankFilter] = useState<RankFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [embedOpen, setEmbedOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const gp = game === 'reforger' ? '' : `/${game}`;
  const { isFavorite, toggle } = useServerFavorites(game);
  const isMobileChart = useMediaQuery('(max-width: 639px)');

  const [allServers, setAllServers] = useState<Server[]>([]);
  const [storagePack, setStoragePack] = useState<ServerStoragePack | null>(null);

  const loadServer = useCallback(async (days: number, signal?: AbortSignal) => {
    if (!serverId) return;
    try {
      setLoading(true);
      const [serverData, historyData, statsData, allServersData, storageData] = await Promise.all([
        serversApi.getById(serverId, game),
        serversApi.getHistory(serverId, days, game),
        modsApi.getGlobalStats(game),
        serversApi.getList(500, 0, game).catch(() => ({ data: [] })),
        game === 'reforger'
          ? serversApi.getStorage(serverId, game).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (signal?.aborted) return;

      setServer(serverData.data);
      setAllServers(allServersData.data || []);
      setStoragePack(storageData?.data ?? null);
      
      // Filter history: if latest data is older than 3 days, it's considered stale for servers
      const rawHistory = historyData.data || [];
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const latestEntry = rawHistory.length > 0 ? new Date(rawHistory[rawHistory.length - 1].time) : null;
      const isStale = latestEntry && latestEntry < threeDaysAgo;

      let filteredHistory = isStale ? [] : rawHistory;

      // Filter leading empty data for servers
      if (filteredHistory.length > 0) {
        const firstActiveIndex = filteredHistory.findIndex(
          h => h.rank !== null || (h.players ?? 0) > 0 || h.uptimeRatio !== null
        );
        if (firstActiveIndex !== -1) {
          filteredHistory = filteredHistory.slice(firstActiveIndex);
        }
      }

      setHistory(filteredHistory as ServerHistoryPoint[]);
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

  const offlineBands = useMemo(() => buildOfflineBands(history), [history]);

  const similarServers = useMemo(() => {
    if (!server || !allServers || allServers.length === 0) return [];

    const currentModIds = new Set(server.mods?.map(m => m.id) || []);

    if (currentModIds.size === 0) {
      return allServers
        .filter(s => s.id !== server.id)
        .map(s => {
          const otherModCount = s.mods?.length || 0;
          const isVanilla = otherModCount === 0;
          const alive = (s.players ?? 0) > 0;
          const playerScore = 1 / (1 + Math.abs(s.players - server.players));
          const rankScore = s.sqeRank ? 1 / (1 + Math.abs(s.sqeRank - (server.sqeRank || 9999)) * 0.1) : 0;
          return {
            server: s,
            overlapPercent: 0,
            score: (isVanilla ? playerScore * 2 + rankScore : playerScore) * (alive ? 1.5 : 1),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    const scored = allServers
      .filter(s => s.id !== server.id)
      .map(other => {
        const otherMods = other.mods || [];
        let common = 0;
        for (const m of otherMods) {
          if (currentModIds.has(m.id)) {
            common++;
          }
        }
        const union = currentModIds.size + otherMods.length - common;
        const modSimilarity = union > 0 ? common / union : 0;
        const fillRatio = other.maxPlayers > 0 ? (other.players ?? 0) / other.maxPlayers : 0;
        return { server: other, modSimilarity, common, union, fillRatio };
      })
      .filter(x => x.modSimilarity > 0);

    if (scored.length === 0) return [];

    const take = (items: typeof scored, sortFn: (a: typeof scored[0]) => number, count: number) =>
      [...items].sort((a, b) => sortFn(b) - sortFn(a)).slice(0, count);

    const bestModMatch = take(scored, (s) => s.modSimilarity, 1);
    const usedIds = new Set(bestModMatch.map((s) => s.server.id));

    const bestFull = take(
      scored.filter((s) => !usedIds.has(s.server.id) && s.fillRatio >= 0.8),
      (s) => s.modSimilarity,
      1,
    );
    bestFull.forEach((s) => usedIds.add(s.server.id));

    const bestActive = take(
      scored.filter((s) => !usedIds.has(s.server.id) && s.fillRatio > 0 && s.fillRatio < 0.8),
      (s) => s.modSimilarity,
      1,
    );
    bestActive.forEach((s) => usedIds.add(s.server.id));

    const rest = take(
      scored.filter((s) => !usedIds.has(s.server.id)),
      (s) => s.modSimilarity * 0.6 + (s.server.players ?? 0) * 0.4,
      2,
    );

    return [...bestModMatch, ...bestFull, ...bestActive, ...rest]
      .slice(0, 5)
      .map((s) => ({
        server: s.server,
        score: s.modSimilarity,
        overlapPercent: s.union > 0 ? Math.round((s.common / s.union) * 100) : 0,
      }));
  }, [server, allServers]);

  const resetModFilters = useCallback(() => {
    setModSearch('');
    setActivityFilter('all');
    setRankFilter('all');
    setSizeFilter('all');
    setModSort('players');
  }, []);

  const sortedAndFilteredMods = useMemo(() => {
    if (!server?.mods || !Array.isArray(server.mods)) return [];

    const sizeById = new Map(storagePack?.mods.map((m) => [m.id, m.sizeBytes]) ?? []);

    const withSize = (server.mods as ServerMod[]).map((mod) => ({
      ...mod,
      sizeBytes: sizeById.get(mod.id) ?? null,
    }));

    const filtered = filterServerMods(withSize, {
      search: modSearch,
      activity: activityFilter,
      rank: rankFilter,
      size: sizeFilter,
    });

    return sortServerMods(filtered, modSort, totalServers);
  }, [server?.mods, modSearch, modSort, activityFilter, rankFilter, sizeFilter, storagePack, totalServers]);

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

  const badgeUrl = `${SITE_ORIGIN}/api/badge/server/${encodeURIComponent(server.id)}?game=${game}`;
  const serverUrl = serverPageUrl(server.id, game);
  const htmlEmbed = `<a href="${serverUrl}"><img src="${badgeUrl}" alt="${escapeHtmlAttr(server.name)} on reforgermods.com" /></a>`;
  const markdownEmbed = `[![${escapeMarkdownAlt(server.name)}](${badgeUrl})](${serverUrl})`;

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SEO 
        title={`${server.name} - Live Status`}
        description={`${server.name}: ${server.players}/${server.maxPlayers} players · Server Rank #${server.sqeRank || 'N/A'}.`}
        keywords={`${server.name}, Arma Reforger Server, Arma 3 Server, Server Stats, Server Ranking, ${server.ip}`}
        url={serverPageUrl(server.id, game)}
        image={serverPreviewImageUrl(server.id, game)}
      />
      <header className="space-y-6">
        <Link to={`${gp}/servers`} className="inline-flex items-center gap-4 text-gray-500 hover:text-tactical-orange font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:-translate-x-2">
          ← [ Back to Network ]
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">// SERVER_NODE: {server.id}</span>
            <div className="flex flex-wrap items-start gap-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none flex-1 min-w-0">
                {server.name}
              </h1>
              <FavoriteServerButton
                active={isFavorite(server.id)}
                serverName={server.name}
                onToggle={() => toggle(server.id)}
                className="shrink-0 mt-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ServerStatusBadge status={server.bmStatus} size="md" />
              <BmLastSeenHint status={server.bmStatus} lastSeenAt={server.bmLastSeenAt} />
            </div>
            <p className="text-xl font-mono text-gray-500 font-bold uppercase tracking-widest">
              {server.ip}:{server.port}
            </p>
            {server.scenarioName && (
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400 max-w-3xl">
                Scenario ·{' '}
                <Link
                  to={`${gp}/scenarios?s=${encodeURIComponent(server.scenarioName)}`}
                  className="text-gray-400 hover:text-tactical-orange transition-colors"
                >
                  {server.scenarioName}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <div className="px-10 py-6 bg-zinc-900 border border-white/10 text-center">
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Overall Rank</p>
                <p className="text-3xl font-black text-tactical-orange tracking-tighter italic">#{server.sqeRank || '-'}</p>
                {server.sqeTier && (
                  <div className="mt-2 flex justify-center">
                    <TierBadge tier={server.sqeTier} size="md" />
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmbedOpen((o) => !o)}
              className="self-end text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-tactical-orange border border-white/5 hover:border-tactical-orange/40 px-4 py-2 bg-zinc-900 transition-colors"
            >
              {embedOpen ? 'Close Embed' : 'Embed Badge'}
            </button>
            {embedOpen && (
              <div className="self-end w-full max-w-md bg-zinc-900 border border-white/5 p-5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Badge Preview</p>
                <div className="bg-black/40 border border-white/5 p-3 flex justify-center">
                  <img src={badgeUrl} alt={`${server.name} rank badge`} className="max-w-full h-auto" />
                </div>
                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                  Updates automatically — shows your live tier and rank.
                </p>
                {import.meta.env.DEV && (
                  <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">
                    Preview loads from production — broken image locally until badge API is deployed; tier may show — until collector runs.
                  </p>
                )}
                {([
                  { key: 'html', label: 'HTML', value: htmlEmbed },
                  { key: 'markdown', label: 'Markdown', value: markdownEmbed },
                  { key: 'url', label: 'Direct URL', value: badgeUrl },
                ] as const).map(({ key, label, value }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">{label}</span>
                      <button
                        type="button"
                        onClick={() => void handleCopy(key, value)}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-tactical-orange transition-colors"
                      >
                        {copiedKey === key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-[9px] font-mono text-gray-400 bg-black/40 border border-white/5 p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {value}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Personnel Present', value: `${server.players || 0} / ${server.maxPlayers || 0}` },
          { label: 'Module Count', value: server.mods?.length || 0 },
          ...(game === 'reforger' && storagePack
            ? [{
                label: 'Modpack Size',
                value: `${formatBytes(storagePack.estimatedBytes)} (${Math.round(storagePack.coverage * 100)}%)`,
              }]
            : []),
          { label: 'Server Rank', value: `#${server.sqeRank || '-'}` },
          { label: 'Capacity Used', value: `${Math.round(fillPercent)}%` }
        ]}
        title="Field Intelligence Report"
        subtitle="Detailed analysis of deployed assets and personnel distribution"
      />

      {game === 'reforger' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4 px-1">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest max-w-2xl">
            Console player? Use Storage Planner to compare this server with others and see what fits your free space.
          </p>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to={`/dependency-blockers?server=${encodeURIComponent(server.id)}`}
              className="px-5 py-3 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:border-tactical-orange hover:text-tactical-orange transition-colors text-center"
            >
              Dependency Blockers →
            </Link>
            <Link
              to={`/storage-planner?main=${encodeURIComponent(server.id)}`}
              className="px-5 py-3 border border-tactical-orange/40 text-tactical-orange text-[10px] font-black uppercase tracking-[0.2em] hover:bg-tactical-orange hover:text-black transition-colors text-center"
            >
              Open Storage Planner →
            </Link>
          </div>
        </div>
      )}

      {/* Affiliate Section */}
      <AffiliateBanner />

      <section className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              Server History
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 p-1 bg-zinc-900 border border-white/10">
                {[
                  { label: '24H', value: 1 },
                  { label: '1M', value: 30 },
                  { label: '1Y', value: 366 }
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedDays(opt.value)}
                    className={`min-h-11 px-4 py-2 sm:py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
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
          </div>
          <Card>
            <CardContent className="p-4 sm:p-6 lg:p-8 h-[340px] sm:h-[400px]">
              {!history || history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest text-[10px] space-y-2">
                  <span>No recent activity detected</span>
                  <span className="text-[8px] opacity-50 font-medium">Server may be offline or monitoring was suspended</span>
                </div>
              ) : (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-[#f97316] rounded" aria-hidden />
                      Server rank
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-[#22c55e] rounded" aria-hidden />
                      Players
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-rose-500/25 border border-rose-500/40" aria-hidden />
                      Mostly offline (&lt;50% scans)
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={history}
                    margin={{
                      top: 8,
                      right: isMobileChart ? 4 : 8,
                      left: isMobileChart ? 4 : 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    {offlineBands.map((band, i) => (
                      <ReferenceArea
                        key={`offline-${i}`}
                        x1={band.x1}
                        x2={band.x2}
                        yAxisId="rank"
                        fill="rgb(244 63 94 / 0.15)"
                        stroke="rgb(244 63 94 / 0.3)"
                        strokeOpacity={0.4}
                        ifOverflow="extendDomain"
                      />
                    ))}
                    <XAxis
                      dataKey="time"
                      stroke="#666"
                      tickFormatter={(tick) => {
                        if (!tick) return '';
                        if (tick.length === 10 && tick.includes('-')) {
                          const parts = tick.split('-');
                          return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                        }
                        const d = new Date(tick);
                        if (selectedDays === 1) {
                          return `${d.getHours().toString().padStart(2, '0')}:00`;
                        }
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                      tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#666', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={isMobileChart ? 24 : 16}
                    />
                    <YAxis
                      yAxisId="rank"
                      stroke="#f97316"
                      tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#f97316', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={isMobileChart ? 32 : 50}
                      reversed={true}
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickFormatter={(val) => `#${val}`}
                    />
                    <YAxis
                      yAxisId="players"
                      orientation="right"
                      hide={isMobileChart}
                      stroke="#22c55e"
                      tick={{ fontSize: 10, fill: '#22c55e', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      width={isMobileChart ? 0 : 50}
                      tickFormatter={(val) =>
                        isMobileChart && Number(val) >= 1000
                          ? `${Math.round(Number(val) / 1000)}k`
                          : Number(val).toLocaleString()
                      }
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0]?.payload as ServerHistoryPoint | undefined;
                        const uptime = point ? uptimeTooltipLabel(point, selectedDays === 1) : null;
                        return (
                          <div className="rounded border border-[#333] bg-[#18181b] px-3 py-2 text-xs">
                            <p className="text-[10px] font-bold text-[#666] uppercase mb-2">
                              {label ? new Date(String(label)).toLocaleString() : ''}
                            </p>
                            {payload.map((entry) => (
                              <p key={String(entry.dataKey)} style={{ color: entry.color, fontWeight: 'bold' }}>
                                {entry.name === 'Server Rank'
                                  ? `Server Rank: #${entry.value}`
                                  : `${entry.name}: ${Number(entry.value ?? 0).toLocaleString()}`}
                              </p>
                            ))}
                            {uptime && (
                              <p className="text-rose-400/90 mt-2 text-[10px] font-bold uppercase">{uptime}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Line
                      yAxisId="rank"
                      type="monotone"
                      dataKey="rank"
                      name="Server Rank"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#f97316', stroke: '#18181b', strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="players"
                      type="monotone"
                      dataKey="players"
                      name="Players"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: '#22c55e', stroke: '#18181b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Glossary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-[#f97316]" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Server Rank</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Network hierarchy. <span className="text-tactical-orange">Lower # is better</span> – determined by SQE points calculated from personnel activity, module uniqueness, and server uptime.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-[#22c55e]" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Active Player Load</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Raw personnel count over time. <span className="text-[#22c55e]">Higher is better</span> – direct indicator of server popularity.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-sm">
              <div className="w-1 h-full bg-rose-500/70" />
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Offline periods</h4>
                <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                  Rose shading when a day or week was <span className="text-rose-400">mostly offline</span> (&lt;50% of network scans saw the server up). Brief restarts do not mark the whole period offline.
                </p>
              </div>
            </div>
          </div>
        </section>

      {/* Similar Servers Section */}
      {similarServers.length > 0 && (
        <section className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
          <div className="border-b border-white/5 pb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              🖥️ Similar Deployed Servers
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              Alternative nodes running similar mod configurations and player activity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {similarServers.map(({ server: other, overlapPercent }) => (
              <Link
                key={other.id}
                to={`${gp}/server/${other.id}`}
                className="group relative block bg-[#172635] border border-white/5 hover:border-tactical-orange/40 p-6 transition-all"
              >
                <div className="space-y-3">
                  <span className="inline-block text-[8px] font-mono text-gray-500 uppercase tracking-widest">// ALIGNMENT: {overlapPercent}% OVERLAP</span>
                  <h3 className="text-sm font-black text-white uppercase truncate group-hover:text-tactical-orange transition-colors">
                    {other.name}
                  </h3>
                  <div className="pt-2 flex items-end justify-between border-t border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-gray-600 font-black uppercase tracking-wider">Active load</span>
                      <p className="text-lg font-black text-white font-mono">{other.players}/{other.maxPlayers}</p>
                    </div>
                    <span className="text-[8px] text-gray-500 font-bold uppercase group-hover:text-white transition-colors">
                      Inspect →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-8">
        <div className="border-b border-white/5 pb-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              Installed Mod Stack
            </h2>
            {game === 'reforger' && (
              <CopyServerModsButton mods={server.mods ?? []} />
            )}
          </div>

          {(server.mods?.length ?? 0) > 0 ? (
            <ListFilterBar
              sticky={false}
              columns={game === 'reforger' ? 6 : 5}
              search={{
                label: '// SEARCH',
                value: modSearch,
                onChange: setModSearch,
                placeholder: 'Search mods…',
                ariaLabel: 'Search mods on this server',
                hint:
                  sortedAndFilteredMods.length !== (server.mods?.length ?? 0) ? (
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                      Showing {sortedAndFilteredMods.length} of {server.mods?.length ?? 0} mods
                    </p>
                  ) : undefined,
              }}
              selects={[
                {
                  id: 'activity',
                  label: '// ACTIVITY',
                  value: activityFilter,
                  onChange: (v) => setActivityFilter(v as ActivityFilter),
                  options: ACTIVITY_FILTER_OPTIONS,
                  ariaLabel: 'Filter mods by player activity',
                },
                {
                  id: 'rank',
                  label: '// RANK',
                  value: rankFilter,
                  onChange: (v) => setRankFilter(v as RankFilter),
                  options: RANK_FILTER_OPTIONS,
                  ariaLabel: 'Filter mods by global player rank',
                },
                ...(game === 'reforger'
                  ? [
                      {
                        id: 'size',
                        label: '// SIZE',
                        value: sizeFilter,
                        onChange: (v: string) => setSizeFilter(v as SizeFilter),
                        options: SIZE_FILTER_OPTIONS,
                        ariaLabel: 'Filter mods by download size',
                      },
                    ]
                  : []),
                {
                  id: 'sort',
                  label: '// SORT',
                  value: modSort,
                  onChange: (v) => setModSort(v as EmbeddedModSort),
                  options: EMBEDDED_MOD_SORT_OPTIONS,
                  ariaLabel: 'Sort mods',
                },
              ]}
              onReset={resetModFilters}
            />
          ) : (
            <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">
              Vanilla server — no mods installed
            </p>
          )}
        </div>

        {(server.mods?.length ?? 0) === 0 ? null : sortedAndFilteredMods.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5 space-y-4">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">No mods match your filters</p>
            <button
              type="button"
              onClick={resetModFilters}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-tactical-orange"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="border border-white/5 bg-black/40">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Rank
                    </th>
                    <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Module
                    </th>
                    <th className="hidden md:table-cell px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Author
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Personnel
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Deploy
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Size
                    </th>
                    <th className="hidden md:table-cell pl-4 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Share
                    </th>
                    <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredMods.map((mod) => {
                    const marketShare =
                      totalServers > 0 ? ((mod.serverCount || 0) / totalServers) * 100 : 0;
                    return (
                      <ModRow
                        key={mod.id}
                        mod={{
                          ...toModRow({
                            id: mod.id,
                            name: mod.name,
                            totalPlayers: mod.totalPlayers,
                            serverCount: mod.serverCount,
                            overallRank: mod.overallRank,
                            marketShare,
                          }),
                          sizeBytes: mod.sizeBytes,
                          playerRank: mod.playerRank,
                          serverRank: mod.serverRank,
                        }}
                        rank={modSort === 'rank' ? mod.playerRank : mod.overallRank}
                        game={game}
                        variant="leaderboard"
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
