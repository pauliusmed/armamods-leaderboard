import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { modsApi, type GameType } from '../api/client';
import { StatusState } from './ui/StatusState';
import { SEO } from './ui/SEO';
import { AffiliateBanner } from './ui/AffiliateBanner';
import { Card, CardContent } from './ui/Card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { buildModAuditRow, REFORGER_PATCH_17, type AuditStatus } from '@audit-config';
import { AUDIT_STATUS_SHORT } from '../lib/auditLabels';
import { modPageUrl, modPreviewImageUrl } from '../lib/site';
import { MOD_DETAIL_LIVE_FALLBACK, MOD_DETAIL_SEO_PLAYERS, CO_DEPLOY_SUBTITLE, CHART_NO_DATA_TITLE, CHART_NO_DATA_SYNC_PAUSED, CHART_NO_DATA_INACTIVE, CHART_SYNC_GAP_LEGEND } from '../lib/siteCopy';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { withSyncGapMarker } from '../lib/chartSyncGap';
import { ModAuthorLink } from './ui/ModAuthorLink';
import { ModThumbnail } from './ui/ModThumbnail';
import { formatBytes } from '../lib/formatBytes';
import { ModWorkshopGallery } from './ui/ModWorkshopGallery';
import { ModWorkshopCopy } from './ui/ModWorkshopCopy';
import { ModConfigPanel } from './ui/ModConfigPanel';
import { FavoriteModButton } from './ui/FavoriteModButton';
import { useModFavorites } from '../hooks/useModFavorites';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ModWorkshopUnavailableBanner } from './ui/ModWorkshopStatus';
import { ModDependencyTable, DependencyRow } from './ui/ModDependencyTable';
import { CoDeployTable } from './ui/CoDeployTable';
import { ServerDataTable } from './ui/ModDataTable';
import { ServerRow } from './ServerRow';
import { Pagination } from './ui/Pagination';
import type { Mod, Server, ModHistory, ModDependency } from '../types';

const DEPLOYED_SERVERS_PER_PAGE = 20;

const PATCH_STATUS_STYLE: Record<AuditStatus, string> = {
  dead: 'border-red-500/60 bg-red-950/40 text-red-300',
  warning: 'border-yellow-600/50 bg-yellow-950/25 text-yellow-100',
  risky: 'border-orange-500/50 bg-orange-950/25 text-orange-200',
  ok: 'border-emerald-600/40 bg-emerald-950/20 text-emerald-200',
  niche: 'border-gray-600/40 bg-gray-900/40 text-gray-400',
  unknown: 'border-gray-700/40 bg-black/40 text-gray-500',
};

interface ModDetailData extends Mod {
  stats: Mod & { totalMods: number };
  author?: string | null;
  workshopCreated?: string | null;
  workshopModified?: string | null;
  workshopSummary?: string | null;
  workshopDescription?: string | null;
  sizeBytes?: number | null;
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
  const [dependencies, setDependencies] = useState<ModDependency[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);
  const [heroGalleryVisible, setHeroGalleryVisible] = useState(false);
  const [serversPage, setServersPage] = useState(1);
  const { isFavorite, toggle } = useModFavorites(game);
  const isMobileChart = useMediaQuery('(max-width: 639px)');
  const freshness = useDataFreshness(game);
  const { data: chartHistory, gapX1, gapX2 } = useMemo(
    () =>
      withSyncGapMarker(history, 'date', freshness.isStale, [
        'totalPlayers',
        'serverCount',
        'overallRank',
      ] as const),
    [history, freshness.isStale]
  );

  useEffect(() => {
    setHeroGalleryVisible(false);
    setServersPage(1);
  }, [modId]);

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
      setDependencies([]);
      setDepsLoading(game === 'reforger');
      if (game === 'reforger') {
        modsApi.getDependencies(modId, game)
          .then((depsRes) => {
            if (!signal?.aborted) setDependencies(depsRes.data || []);
          })
          .catch(() => {
            if (!signal?.aborted) setDependencies([]);
          })
          .finally(() => {
            if (!signal?.aborted) setDepsLoading(false);
          });
      }

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

  const patchInsight = useMemo(() => {
    if (game !== 'reforger' || !modId || !mod || chartHistory.length < 4) return null;
    const row = buildModAuditRow(
      { modId: modId.toUpperCase(), name: mod.name },
      chartHistory,
      { totalPlayers: mod.totalPlayers, serverCount: mod.serverCount, name: mod.name }
    );
    const sorted = [...chartHistory].map((h) => h.date).sort();
    const minDate = sorted[0];
    const maxDate = sorted[sorted.length - 1];
    const showPatchLine =
      minDate <= REFORGER_PATCH_17 && maxDate >= REFORGER_PATCH_17;
    const broken = row.status === 'dead' || row.status === 'warning';
    return { row, showPatchLine, maxDate, broken };
  }, [game, modId, mod, chartHistory]);

  const sortedDeployedServers = useMemo(() => {
    if (!mod?.servers) return [];
    return [...mod.servers].sort((a, b) => (b.players || 0) - (a.players || 0));
  }, [mod?.servers]);

  const deployedServersTotalPages = Math.max(
    1,
    Math.ceil(sortedDeployedServers.length / DEPLOYED_SERVERS_PER_PAGE)
  );

  const deployedServersLabel = useMemo(() => {
    const total = sortedDeployedServers.length;
    if (total === 0) return 'No active nodes';
    if (total <= DEPLOYED_SERVERS_PER_PAGE) {
      return isMobileChart ? `${total} nodes` : `Displaying ${total} Intel Nodes`;
    }
    const from = (serversPage - 1) * DEPLOYED_SERVERS_PER_PAGE + 1;
    const to = Math.min(serversPage * DEPLOYED_SERVERS_PER_PAGE, total);
    return isMobileChart
      ? `${from}–${to} of ${total}`
      : `Displaying ${from}–${to} of ${total} Intel Nodes`;
  }, [sortedDeployedServers.length, serversPage, isMobileChart]);

  const paginatedDeployedServers = useMemo(() => {
    const start = (serversPage - 1) * DEPLOYED_SERVERS_PER_PAGE;
    return sortedDeployedServers.slice(start, start + DEPLOYED_SERVERS_PER_PAGE);
  }, [sortedDeployedServers, serversPage]);

  useEffect(() => {
    if (serversPage > deployedServersTotalPages) {
      setServersPage(deployedServersTotalPages);
    }
  }, [serversPage, deployedServersTotalPages]);

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
    <div className="animate-in fade-in duration-700">
      <SEO
        title={`${mod.name} - Statistics & Trends`}
        description={
          mod.workshopSummary ??
          MOD_DETAIL_SEO_PLAYERS(
            mod.totalPlayers ?? 0,
            mod.serverCount ?? 0,
            mod.stats?.overallRank || mod.overallRank || '—'
          )
        }
        keywords={`${mod.name}, Arma Reforger Mods, Arma 3 Mods, Mod Statistics, ${mod.author || ''}`}
        url={modPageUrl(mod.id, game)}
        image={modPreviewImageUrl(mod.id, game)}
      />
      <Link
        to={`${gp}/`}
        className="block mb-6 text-gray-500 hover:text-tactical-orange hover:bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
      >
        ← [ Back to Registry ]
      </Link>

      <ModWorkshopUnavailableBanner
        game={game}
        status={mod.workshopStatus ?? 'unknown'}
        checkedAt={mod.workshopStatusCheckedAt}
      />

      {/*
        Full-width page body. Config panel sits in the hero header on desktop
        (not a side column) so charts, workshop copy, and tables use 100% width.
      */}
      <div className="w-full min-w-0 space-y-12">
          <header className="border-b border-white/10 pb-10 sm:pb-12 space-y-6">
            <div
              className={`flex flex-col gap-6 lg:gap-8 lg:items-start ${
                heroGalleryVisible
                  ? 'lg:grid lg:grid-cols-3'
                  : 'lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]'
              }`}
            >
              <div className="space-y-4 min-w-0 order-1">
                <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em] block">
                  // MODULE_IDENTIFIER: {mod.id}
                </span>
                <div className="flex items-start gap-4 sm:gap-5">
                  <ModThumbnail
                    modId={mod.id}
                    modName={mod.name}
                    game={game}
                    size="lg"
                    className="shrink-0"
                    thumbnailUrl={mod.thumbnail}
                    priority="eager"
                  />
                  <div className="min-w-0 space-y-3 flex-1">
                    <div className="flex flex-wrap items-start gap-3">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none break-words flex-1 min-w-0">
                        {mod.name}
                      </h1>
                      <FavoriteModButton
                        active={isFavorite(mod.id)}
                        modName={mod.name}
                        onToggle={() => toggle(mod.id)}
                        className="shrink-0 mt-1"
                      />
                    </div>
                    {mod.author && (
                      <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                        Workshop author ·{' '}
                        <ModAuthorLink author={mod.author} game={game} />
                      </p>
                    )}
                    {(mod.workshopCreated || mod.workshopModified) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                        {mod.workshopCreated && (
                          <span>
                            Created · <span className="text-gray-300 font-mono tabular-nums">{mod.workshopCreated}</span>
                          </span>
                        )}
                        {mod.workshopModified && (
                          <span>
                            Last Modified · <span className="text-gray-300 font-mono tabular-nums">{mod.workshopModified}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {mod.workshopSummary ? (
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    {mod.workshopSummary}
                  </p>
                ) : (
                  <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs leading-relaxed">
                    {MOD_DETAIL_LIVE_FALLBACK}
                  </p>
                )}
              </div>

              <div
                className={`order-2 min-w-0 w-full ${
                  heroGalleryVisible ? 'lg:border-x lg:border-white/5 lg:px-6' : 'hidden'
                }`}
              >
                <ModWorkshopGallery
                  modId={mod.id}
                  modName={mod.name}
                  game={game}
                  variant="inline"
                  onVisibilityChange={setHeroGalleryVisible}
                />
              </div>

              <div className="flex flex-col gap-3 min-w-0 w-full order-3">
                <div className="grid grid-cols-2 gap-3 w-full">
                  {game === 'reforger' && (
                    <div className="px-4 py-4 bg-zinc-900 border border-white/10 text-center flex flex-col justify-center min-h-[88px]">
                      <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Download</p>
                      <p className="text-lg sm:text-xl font-black font-mono text-tactical-orange tabular-nums leading-none">
                        {formatBytes(mod.sizeBytes)}
                      </p>
                      <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1.5">Workshop ver.</p>
                    </div>
                  )}
                  <div
                    className={`px-4 py-4 bg-zinc-900 border border-white/10 text-center flex flex-col justify-center min-h-[88px] ${
                      game !== 'reforger' ? 'col-span-2' : ''
                    }`}
                  >
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Overall Rank</p>
                    <p className="text-3xl font-black text-white">#{mod.stats?.overallRank ?? mod.overallRank ?? '—'}</p>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <ModConfigPanel
                    modId={mod.id}
                    modName={mod.name}
                    game={game}
                    workshopStatus={mod.workshopStatus}
                  />
                </div>
              </div>
            </div>

            {game === 'reforger' && mod.workshopDescription && (
              <ModWorkshopCopy
                modId={mod.id}
                game={game}
                description={mod.workshopDescription}
              />
            )}
          </header>

          {/* Mobile: config panel below gallery — desktop panel is in the header column. */}
          <div className="lg:hidden w-full">
            <ModConfigPanel
              modId={mod.id}
              modName={mod.name}
              game={game}
              workshopStatus={mod.workshopStatus}
            />
          </div>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 py-3 border-b border-white/5">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 w-full sm:w-auto">
              Live stats
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-black text-white tabular-nums">
                {(mod.stats?.totalPlayers || mod.totalPlayers || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Personnel</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-black text-white tabular-nums">
                {mod.stats?.serverCount || mod.serverCount || 0}
              </span>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Servers</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-black text-tactical-orange tabular-nums">
                {(mod.stats?.marketShare || 0).toFixed(1)}%
              </span>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Share</span>
            </div>
          </div>

          {/* Affiliate Section */}
          <AffiliateBanner />

          <section className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
                📈 Performance Timeline
              </h2>
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

            {patchInsight && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border rounded-lg ${PATCH_STATUS_STYLE[patchInsight.row.status]}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {AUDIT_STATUS_SHORT[patchInsight.row.status]}
                </span>
                <p className="text-[11px] opacity-90 flex-1">{patchInsight.row.title}</p>
                {patchInsight.row.dropPct != null && patchInsight.row.dropPct > 0 && (
                  <span className="text-sm font-black text-red-400 shrink-0">
                    −{patchInsight.row.dropPct}%
                  </span>
                )}
                {patchInsight.broken && (
                  <Link
                    to="/audit"
                    className="inline-block min-h-11 leading-[44px] text-[9px] font-bold uppercase tracking-widest text-tactical-orange hover:underline shrink-0"
                  >
                    Config audit →
                  </Link>
                )}
              </div>
            )}

            <Card>
              <CardContent className="p-4 sm:p-6 lg:p-8 h-[340px] sm:h-[400px]">
                {!chartHistory || chartHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest text-[10px] space-y-2 px-4 text-center">
                    <span>{CHART_NO_DATA_TITLE}</span>
                    <span className="text-[8px] opacity-70 font-medium normal-case tracking-normal">
                      {freshness.isStale ? CHART_NO_DATA_SYNC_PAUSED : CHART_NO_DATA_INACTIVE}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col h-full gap-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-widest text-gray-500 shrink-0">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-0.5 bg-[#f97316] rounded" aria-hidden />
                        Personnel
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-0.5 bg-[#db2777] rounded" aria-hidden />
                        Servers
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-0.5 border-t-2 border-dashed border-[#3b82f6] rounded" aria-hidden />
                        Rank
                      </span>
                      {gapX1 && gapX2 && (
                        <span className="inline-flex items-center gap-2 text-amber-400">
                          <span className="w-3 h-3 rounded-sm bg-amber-500/25 border border-amber-500/40" aria-hidden />
                          {CHART_SYNC_GAP_LEGEND}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartHistory}
                      margin={{
                        top: 8,
                        right: isMobileChart ? 4 : 8,
                        left: isMobileChart ? 4 : 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      {gapX1 && gapX2 && (
                        <ReferenceArea
                          x1={gapX1}
                          x2={gapX2}
                          yAxisId="players"
                          fill="#f59e0b"
                          fillOpacity={0.12}
                          stroke="#f59e0b"
                          strokeOpacity={0.35}
                          ifOverflow="visible"
                        />
                      )}
                      <XAxis
                        dataKey="date"
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
                        yAxisId="players"
                        stroke="#f97316"
                        tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#f97316', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        width={isMobileChart ? 36 : 48}
                        tickFormatter={(val) =>
                          isMobileChart && Number(val) >= 1000
                            ? `${Math.round(Number(val) / 1000)}k`
                            : String(val)
                        }
                      />
                      <YAxis
                        yAxisId="servers"
                        hide
                        domain={[(min: number) => Math.max(0, min - 1), (max: number) => max + 1]}
                      />
                      <YAxis
                        yAxisId="rank"
                        orientation="right"
                        reversed
                        hide={isMobileChart}
                        domain={[
                          (dataMin: number) => Math.max(1, dataMin - 5),
                          (dataMax: number) => dataMax + 5
                        ]}
                        stroke="#3b82f6"
                        tickFormatter={(val) => `#${val}`}
                        tick={{ fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        width={isMobileChart ? 0 : 40}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
                        formatter={(value, name) => {
                          if (name === "Overall Rank") return [`#${value}`, name];
                          return [value, name];
                        }}
                      />
                      {patchInsight?.showPatchLine && (
                        <>
                          {patchInsight.broken && (
                            <ReferenceArea
                              x1={REFORGER_PATCH_17}
                              x2={patchInsight.maxDate}
                              yAxisId="players"
                              fill="#ef4444"
                              fillOpacity={0.06}
                              strokeOpacity={0}
                            />
                          )}
                          <ReferenceLine
                            x={REFORGER_PATCH_17}
                            yAxisId="players"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            label={
                              isMobileChart
                                ? undefined
                                : {
                                    value: '1.7 Partisan',
                                    position: 'insideTopLeft',
                                    fill: '#fbbf24',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }
                            }
                          />
                        </>
                      )}
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
                        name="Overall Rank"
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6', stroke: '#18181b', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Glossary — compact on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pt-2 sm:pt-4">
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
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Overall Rank</h4>
                  <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">
                    Global standing. <span className="text-blue-500">Higher visual position is better</span> – Rank #1 is at the top of the axis.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Workshop-declared dependencies (Reforger) */}
          {game === 'reforger' && (
            <section className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
              <div className="border-b border-white/5 pb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
                  📦 Required Dependencies
                </h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 max-w-2xl">
                  Author-declared on Reforger Workshop — technical install requirements, not popularity stats
                </p>
              </div>

              {depsLoading ? (
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest animate-pulse">
                  Resolving workshop dependency tree…
                </p>
              ) : dependencies.length === 0 ? (
                <p className="text-sm text-gray-600 font-medium">
                  No declared dependencies for this mod (standalone module).
                </p>
              ) : (
                <ModDependencyTable>
                  {dependencies.map((dep) => (
                    <DependencyRow key={dep.id} dep={dep} game={game} />
                  ))}
                </ModDependencyTable>
              )}
            </section>
          )}

          {/* Frequently Deployed Together Section */}
          {mod.coDeployed && mod.coDeployed.length > 0 && (
            <section className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
              <div className="border-b border-white/5 pb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
                  🤝 Frequently Deployed Together
                </h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 max-w-2xl">
                  {CO_DEPLOY_SUBTITLE}
                </p>
              </div>

              <CoDeployTable
                items={mod.coDeployed}
                parentServerCount={mod.serverCount ?? mod.stats?.serverCount ?? 0}
                game={game}
              />
            </section>
          )}

          <section className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-white/5 pb-6">
              <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                📡 Active Deployed Servers
              </h2>
              <span className="text-[10px] sm:text-[10px] font-black text-gray-500 uppercase tracking-wide sm:tracking-widest shrink-0">
                {deployedServersLabel}
              </span>
            </div>

            {sortedDeployedServers.length === 0 ? (
              <div className="p-12 sm:p-20 text-center border-2 border-dashed border-white/5">
                <p className="text-lg sm:text-xl font-black text-gray-700 uppercase tracking-widest">No active deployments detected</p>
              </div>
            ) : (
              <>
                <ServerDataTable>
                  {paginatedDeployedServers.map((server) => (
                    <ServerRow key={server.id} server={server} game={game} />
                  ))}
                </ServerDataTable>
                <Pagination
                  currentPage={serversPage}
                  totalPages={deployedServersTotalPages}
                  onPageChange={setServersPage}
                  className="pb-0"
                />
              </>
            )}
          </section>
      </div>
    </div>
  );
}
