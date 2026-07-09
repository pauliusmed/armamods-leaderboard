import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { serversApi, type GameType } from '../api/client';
import type { ReverseDepsAnalysis, Server } from '../types';
import { SEO } from './ui/SEO';
import { StatsHero } from './ui/StatsHero';
import { StatusState } from './ui/StatusState';
import { workshopPageUrl } from '../lib/workshop';

const pickerInputClass =
  'w-full px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange placeholder:text-gray-700';

const pickerLabelClass =
  'block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 italic';

interface DependencyBlockersPageProps {
  game?: GameType;
}

export function DependencyBlockersPage({ game = 'reforger' }: DependencyBlockersPageProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const [searchParams, setSearchParams] = useSearchParams();

  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [serverSearch, setServerSearch] = useState('');
  const [serverId, setServerId] = useState(searchParams.get('server') ?? '');
  const [targetModId, setTargetModId] = useState(searchParams.get('mod') ?? '');
  const [modSearch, setModSearch] = useState('');

  const [serverDetail, setServerDetail] = useState<Server | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReverseDepsAnalysis | null>(null);
  const [metaDisclaimer, setMetaDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingServers(true);
        const res = await serversApi.getList(5000, 0, game, { full: true });
        if (!cancelled) setServers(res.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load servers');
      } finally {
        if (!cancelled) setLoadingServers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    if (!serverId) {
      setServerDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingServer(true);
    serversApi
      .getById(serverId, game)
      .then((res) => {
        if (!cancelled) setServerDetail(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setServerDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingServer(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId, game]);

  const filteredServers = useMemo(() => {
    const q = serverSearch.trim().toLowerCase();
    const list = q
      ? servers.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q))
      : servers;
    return list.slice(0, 100);
  }, [servers, serverSearch]);

  const filteredMods = useMemo(() => {
    const mods = serverDetail?.mods ?? [];
    const q = modSearch.trim().toLowerCase();
    const list = q
      ? mods.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      : mods;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 200);
  }, [serverDetail?.mods, modSearch]);

  const selectedServer = useMemo(
    () => servers.find((s) => s.id === serverId) ?? serverDetail,
    [servers, serverId, serverDetail]
  );

  const selectedMod = useMemo(
    () => serverDetail?.mods?.find((m) => m.id.toUpperCase() === targetModId.toUpperCase()),
    [serverDetail?.mods, targetModId]
  );

  const runAnalysis = useCallback(async () => {
    if (!serverId || !targetModId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await serversApi.getReverseDeps(serverId, targetModId, game);
      setResult(res.data);
      setMetaDisclaimer(res.meta?.disclaimer ?? null);
      setSearchParams({ server: serverId, mod: targetModId }, { replace: true });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [serverId, targetModId, game, setSearchParams]);

  useEffect(() => {
    if (serverId && targetModId && serverDetail?.mods?.some((m) => m.id.toUpperCase() === targetModId.toUpperCase())) {
      void runAnalysis();
    }
  }, [serverId, targetModId, serverDetail, runAnalysis]);

  if (game === 'arma3') {
    return (
      <StatusState
        type="empty"
        message="Reforger only"
        details="Workshop dependency lookup is not available for Arma 3 yet."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SEO
        title="Dependency Blockers — Mod Removal Tool"
        description="Find which mods on your server declare a workshop dependency on a mod you want to remove. Reforger server admin tool."
        url="/dependency-blockers"
      />

      <StatsHero
        title="Dependency Blockers"
        subtitle="Pick a server and a mod you want to remove — see which other installed mods require it (Workshop-declared dependencies)."
        stats={[
          { label: 'Servers loaded', value: loadingServers ? '…' : servers.length },
          { label: 'Selected mods', value: serverDetail?.mods?.length ?? '—' },
          { label: 'Blockers found', value: result?.dependents.length ?? '—' },
        ]}
      />

      <section className="bg-zinc-900/50 p-4 border border-white/5 space-y-3">
        <label htmlFor="dep-blockers-server-search" className={pickerLabelClass}>
          // SERVER
        </label>
        <input
          id="dep-blockers-server-search"
          type="search"
          placeholder="Search servers by name or ID…"
          value={serverSearch}
          onChange={(e) => setServerSearch(e.target.value)}
          aria-label="Search servers"
          className={pickerInputClass}
        />
        {serverId && (
          <div className="border border-tactical-orange/40 bg-tactical-orange/5 px-3 py-3">
            <p className="text-[9px] font-black text-tactical-orange uppercase tracking-widest mb-1">
              Selected server
            </p>
            <p className="text-[10px] font-black text-white uppercase truncate">
              {selectedServer?.name ?? serverId}
            </p>
            {loadingServer && (
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1 animate-pulse">
                Loading mod list…
              </p>
            )}
          </div>
        )}
        {loadingServers && !filteredServers.length ? (
          <StatusState type="loading" />
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1 border border-white/5">
            {filteredServers.length === 0 ? (
              <p className="p-4 text-[10px] text-gray-600 font-bold uppercase">No servers match search</p>
            ) : (
              filteredServers.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => {
                    setServerId(server.id);
                    setTargetModId('');
                    setResult(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    serverId === server.id
                      ? 'bg-tactical-orange/20 text-tactical-orange'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {server.name}
                  <span className="block text-[8px] text-gray-600 font-mono">
                    {server.mods?.length ?? 0} mods · {server.id}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      {serverDetail && (
        <section className="bg-zinc-900/50 p-4 border border-white/5 space-y-3">
          <label htmlFor="dep-blockers-mod-search" className={pickerLabelClass}>
            // MOD TO REMOVE
          </label>
          <input
            id="dep-blockers-mod-search"
            type="search"
            placeholder="Search mods installed on this server…"
            value={modSearch}
            onChange={(e) => setModSearch(e.target.value)}
            aria-label="Search mods on server"
            className={pickerInputClass}
          />
          {targetModId && (
            <div className="border border-tactical-orange/40 bg-tactical-orange/5 px-3 py-3">
              <p className="text-[9px] font-black text-tactical-orange uppercase tracking-widest mb-1">
                Target mod
              </p>
              <p className="text-[10px] font-black text-white uppercase truncate">
                {selectedMod?.name ?? targetModId}
              </p>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto space-y-1 border border-white/5">
            {filteredMods.length === 0 ? (
              <p className="p-4 text-[10px] text-gray-600 font-bold uppercase">No mods match search</p>
            ) : (
              filteredMods.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setTargetModId(mod.id)}
                  className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    targetModId.toUpperCase() === mod.id.toUpperCase()
                      ? 'bg-tactical-orange/20 text-tactical-orange'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {mod.name}
                  <span className="block text-[8px] text-gray-600 font-mono">{mod.id}</span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            disabled={!targetModId || analyzing}
            onClick={() => void runAnalysis()}
            className="px-6 py-3 bg-tactical-orange text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-white transition-colors"
          >
            {analyzing ? 'Scanning…' : 'Find blockers'}
          </button>
        </section>
      )}

      {error && <StatusState type="error" message={error} onAction={() => void runAnalysis()} actionText="Retry" />}

      {analyzing && !result && !error && <StatusState type="loading" />}

      {result && !analyzing && (
        <section className="space-y-6 border border-white/5 bg-black/40 p-4 sm:p-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Remove <span className="text-tactical-orange">{result.target.name}</span>
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
              {result.dependents.length === 0
                ? 'No other mods on this server declare a workshop dependency on this mod.'
                : `Remove these ${result.dependents.length} mod(s) first — or keep the target.`}
            </p>
            {result.uncachedModIds.length > 0 && (
              <p className="text-[9px] text-amber-200/80 font-bold uppercase tracking-widest mt-2">
                {result.uncachedModIds.length} mod(s) had no cached dependency data — re-run after visiting mod pages or wait for workshop cache warm.
              </p>
            )}
            {metaDisclaimer && (
              <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2">{metaDisclaimer}</p>
            )}
          </div>

          {result.dependents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600">
                    <th className="py-3 pl-2 text-left">Blocker mod</th>
                    <th className="py-3 pr-2 text-left">Declared dependencies</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dependents.map((hit) => (
                    <tr key={hit.id} className="border-b border-white/5 align-top">
                      <td className="py-3 pl-2 pr-4">
                        <Link
                          to={`${gp}/mod/${hit.id}`}
                          className="font-bold text-white hover:text-tactical-orange"
                        >
                          {hit.name}
                        </Link>
                        <p className="text-[9px] font-mono text-gray-600 mt-1">{hit.id}</p>
                      </td>
                      <td className="py-3 pr-2 text-gray-400 text-xs leading-relaxed">
                        {hit.dependencies.map((d) => (
                          <span key={d.id} className="inline-block mr-2 mb-1">
                            <span
                              className={
                                d.id.toUpperCase() === result.target.id.toUpperCase()
                                  ? 'text-tactical-orange font-bold'
                                  : ''
                              }
                            >
                              {d.name}
                            </span>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              You can remove{' '}
              <Link to={`${gp}/mod/${result.target.id}`} className="text-tactical-orange hover:underline">
                {result.target.name}
              </Link>{' '}
              without breaking workshop-declared dependencies of other mods on this server.
            </p>
          )}

          <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
            <Link
              to={`${gp}/server/${serverId}`}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-tactical-orange"
            >
              ← Server detail
            </Link>
            <a
              href={workshopPageUrl(result.target.id, game)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-tactical-orange"
            >
              Workshop page ↗
            </a>
            <Link
              to={`/storage-planner?main=${encodeURIComponent(serverId)}`}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-tactical-orange"
            >
              Storage Planner →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
