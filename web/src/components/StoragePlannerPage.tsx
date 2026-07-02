import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { serversApi, storageApi, type GameType } from '../api/client';
import type { ModWithSize, Server, StoragePlanResponse } from '../types';
import { SEO } from './ui/SEO';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { formatBytes } from '../lib/formatBytes';
import {
  CONSOLE_PRESETS,
  loadStorageProfile,
  saveStorageProfile,
  rememberServerNames,
  type ConsolePresetId,
  type StorageProfile,
} from '../lib/storageProfile';
import { findStorageAlternatives } from '../../functions/lib/server-storage-similarity';
import {
  analyzeServerSets,
  type ServerSetFeedback,
  type ServerSetInput,
} from '../../functions/lib/server-set-analysis';

interface StoragePlannerPageProps {
  game?: GameType;
}

function truncateServerName(name: string, max = 52): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

type ServerResolveState = 'loading' | 'failed';

function resolveServerLabel(
  serverId: string,
  server: Server | undefined,
  serverNames: Record<string, string> | undefined,
  resolveState: ServerResolveState | undefined
): { title: string; sub: string } {
  if (server) {
    return {
      title: server.name,
      sub: `${server.mods?.length ?? 0} mods`,
    };
  }
  const cached = serverNames?.[serverId];
  if (cached) {
    return { title: cached, sub: 'resolving mod list…' };
  }
  if (resolveState === 'failed') {
    return {
      title: `Server ${serverId}`,
      sub: 'Not in network — removed or offline',
    };
  }
  return {
    title: `Loading… (${serverId.slice(0, 8)})`,
    sub: 'fetching from KV cache',
  };
}

function toServerSetInput(server: {
  id: string;
  name: string;
  mods?: Array<{ id: string; name: string }>;
  modpackEstimatedBytes?: number | null;
}): ServerSetInput {
  return {
    id: server.id,
    name: server.name,
    mods: server.mods ?? [],
    modpackEstimatedBytes: server.modpackEstimatedBytes,
  };
}

function ServerSetFeedbackPanel({
  feedback,
  onApplySet,
  planning,
}: {
  feedback: ServerSetFeedback;
  onApplySet?: (serverIds: string[]) => void;
  planning?: boolean;
}) {
  const guidance = feedback.guidance.filter((line) => {
    if (feedback.allSelectedFits && line.includes('full selection should fit')) return false;
    if (
      feedback.mainOverlapPercent != null &&
      feedback.mainOverlapPercent < 25 &&
      line.includes('installed-library proxy')
    ) {
      return false;
    }
    return true;
  });

  const showMainOverlapWarning =
    feedback.mainOverlapPercent != null && feedback.mainOverlapPercent < 25;
  const showClusters =
    feedback.clusters.length > 1 ||
    feedback.clusters.some((cluster) => cluster.serverIds.length > 1);
  const showFittingSets = !feedback.allSelectedFits && feedback.fittingSets.length > 0;

  if (!showClusters && !showFittingSets && guidance.length === 0 && !showMainOverlapWarning) {
    return null;
  }

  return (
    <div className="space-y-4 border border-violet-500/30 bg-violet-950/20 px-4 py-4">
      <h3 className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
        Server groups
      </h3>

      {showMainOverlapWarning && (
        <p className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wide leading-relaxed border border-amber-500/30 bg-amber-950/20 px-3 py-2">
          Step 2 server shares only {feedback.mainOverlapPercent}% mods with your selection — pick the
          server you actually have on disk, or &quot;To download&quot; will look far too high.
        </p>
      )}

      {guidance.length > 0 && (
        <ul className="space-y-2">
          {guidance.map((line) => (
            <li key={line} className="text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed">
              → {line}
            </li>
          ))}
        </ul>
      )}

      {showClusters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {feedback.clusters.map((cluster) => (
            <div key={cluster.id} className="border border-white/10 bg-black/30 px-3 py-3 space-y-2">
              <p className="text-[9px] font-black text-white uppercase tracking-widest">{cluster.label}</p>
              <p className="text-[8px] text-gray-500 font-mono uppercase">
                ~{formatBytes(cluster.estimatedUnionBytes)} · {cluster.modCount} mods
                {cluster.serverIds.length > 1 ? ` · ${cluster.internalOverlapPercent}% similar` : ''}
              </p>
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {cluster.serverNames.map((name, i) => (
                  <li key={cluster.serverIds[i]} className="text-[8px] text-gray-600 truncate uppercase">
                    {truncateServerName(name)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {showFittingSets && (
        <div className="space-y-2">
          <p className="text-[8px] font-black text-violet-300/90 uppercase tracking-widest">
            Smaller combinations that fit in {formatBytes(feedback.availableBytes)}
          </p>
          <div className="flex flex-col gap-2">
            {feedback.fittingSets.map((set) => (
              <div
                key={set.serverIds.join(',')}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-white uppercase">
                    {set.serverIds.length === 1 ? '1 server' : `${set.serverIds.length} servers`} · ~
                    {formatBytes(set.estimatedUnionBytes)}
                  </p>
                  <p className="text-[8px] text-gray-600 truncate uppercase">
                    {set.serverNames.map((n) => truncateServerName(n, 36)).join(' + ')}
                  </p>
                </div>
                {onApplySet && (
                  <button
                    type="button"
                    disabled={planning}
                    onClick={() => onApplySet(set.serverIds)}
                    className="shrink-0 px-3 py-2 text-[8px] font-black uppercase tracking-widest border border-violet-500/50 text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                  >
                    Use this set
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sortModsBySize(mods: ModWithSize[]): ModWithSize[] {
  return [...mods].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
}

function sectionTotals(mods: ModWithSize[]) {
  let knownBytes = 0;
  let knownCount = 0;
  for (const mod of mods) {
    if (mod.sizeBytes != null && mod.sizeBytes > 0) {
      knownBytes += mod.sizeBytes;
      knownCount++;
    }
  }
  return { knownBytes, knownCount, modCount: mods.length };
}

function ModSizeList({
  mods,
  emptyLabel,
  title,
}: {
  mods: ModWithSize[];
  emptyLabel: string;
  title: string;
}) {
  const sorted = sortModsBySize(mods);
  const totals = sectionTotals(sorted);

  if (!sorted.length) {
    return <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border border-tactical-orange/30 bg-tactical-orange/5 px-3 py-2">
        <span className="text-[9px] font-black text-tactical-orange uppercase tracking-widest">{title}</span>
        <span className="text-[10px] font-mono font-black text-white">
          {formatBytes(totals.knownBytes)}
          <span className="text-gray-500 font-bold text-[8px] ml-2">
            ({totals.knownCount}/{totals.modCount} sized)
          </span>
        </span>
      </div>
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {sorted.map((mod) => (
          <li
            key={mod.id}
            className="flex items-center justify-between gap-3 border border-white/5 bg-black/30 px-3 py-2"
          >
            <span className="text-[10px] font-bold text-white uppercase truncate min-w-0">{mod.name}</span>
            <span className="text-[10px] font-mono text-tactical-orange shrink-0 tabular-nums">
              {formatBytes(mod.sizeBytes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PLAN_LOADING_STAGES = [
  'Loading server modpacks…',
  'Reading mod sizes from leaderboard cache…',
  'Deduplicating shared mods (RHS, WCS…)…',
  'Calculating download vs free space…',
] as const;

function estimateUnionModCount(
  servers: Server[],
  mainServerId: string | null,
  wantedServerIds: string[]
): number {
  const ids = new Set<string>();
  const addServer = (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    for (const mod of server?.mods ?? []) {
      if (mod?.id) ids.add(mod.id.toUpperCase());
    }
  };
  if (mainServerId) addServer(mainServerId);
  for (const id of wantedServerIds) addServer(id);
  return ids.size;
}

function StoragePlanLoading({
  modEstimate,
  startedAt,
}: {
  modEstimate: number;
  startedAt: number;
}) {
  const [tick, setTick] = useState(0);
  const [barPercent, setBarPercent] = useState(12);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBarPercent((p) => (p >= 90 ? p : p + (p < 50 ? 3 : p < 75 ? 1.5 : 0.4)));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const stage = PLAN_LOADING_STAGES[Math.min(Math.floor(tick / 3), PLAN_LOADING_STAGES.length - 1)];
  const modLabel = modEstimate > 0 ? `~${modEstimate} unique mods` : 'your modpack';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-3 border border-tactical-orange/40 bg-tactical-orange/5 px-4 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-black text-tactical-orange uppercase tracking-widest">{stage}</p>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
            Analyzing {modLabel} — reading cached sizes, not downloading mods
          </p>
        </div>
        <span className="text-[10px] font-mono font-black text-white tabular-nums shrink-0">{elapsed}s</span>
      </div>
      <div className="h-2 w-full overflow-hidden border border-white/10 bg-black/50">
        <div
          className="h-full bg-gradient-to-r from-tactical-orange/80 to-tactical-orange transition-[width] duration-500 ease-out"
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
        Large modpacks can take 15–45s on first load — progress bar moves while the server works
      </p>
    </div>
  );
}

function StoragePlanResultsSkeleton() {
  return (
    <section className="space-y-8 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-white/10 p-5 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-white/10 h-64" />
        ))}
      </div>
    </section>
  );
}

export function StoragePlannerPage({ game = 'reforger' }: StoragePlannerPageProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<StorageProfile>(() => loadStorageProfile(game));
  const [servers, setServers] = useState<Server[]>([]);
  const [mainSearch, setMainSearch] = useState('');
  const [wantedSearch, setWantedSearch] = useState('');
  const [loadingServers, setLoadingServers] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [planStartedAt, setPlanStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoragePlanResponse | null>(null);
  const [serverResolveState, setServerResolveState] = useState<Record<string, ServerResolveState>>({});

  useEffect(() => {
    const mainFromUrl = searchParams.get('main');
    if (mainFromUrl) {
      setProfile((prev) => {
        const next: StorageProfile = {
          ...prev,
          mainServerId: mainFromUrl,
          wantedServerIds: prev.wantedServerIds.includes(mainFromUrl)
            ? prev.wantedServerIds
            : [...prev.wantedServerIds, mainFromUrl],
        };
        saveStorageProfile(game, next);
        return next;
      });
    }
  }, [searchParams, game]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingServers(true);
        const res = await serversApi.getList(5000, 0, game, { full: true });
        if (!cancelled) {
          const list = res.data ?? [];
          setServers(list);
          if (list.length) {
            setProfile((prev) => {
              const next = rememberServerNames(
                prev,
                list.map((s) => ({ id: s.id, name: s.name }))
              );
              saveStorageProfile(game, next);
              return next;
            });
          }
        }
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

  const missingProfileServerIds = useMemo(() => {
    const ids = new Set<string>();
    if (profile.mainServerId) ids.add(profile.mainServerId);
    for (const id of profile.wantedServerIds) ids.add(id);
    return [...ids].filter((id) => !servers.some((s) => s.id === id));
  }, [profile.mainServerId, profile.wantedServerIds, servers]);

  useEffect(() => {
    if (!missingProfileServerIds.length) return;
    let cancelled = false;

    setServerResolveState((prev) => {
      const next = { ...prev };
      for (const id of missingProfileServerIds) {
        if (!next[id]) next[id] = 'loading';
      }
      return next;
    });

    void (async () => {
      const loaded: Server[] = [];
      const failed: string[] = [];
      await Promise.all(
        missingProfileServerIds.map(async (id) => {
          try {
            const res = await serversApi.getById(id, game);
            if (res.data) loaded.push(res.data);
            else failed.push(id);
          } catch {
            failed.push(id);
          }
        })
      );
      if (cancelled) return;

      if (loaded.length) {
        setServers((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          for (const s of loaded) map.set(s.id, s);
          return [...map.values()];
        });
        setProfile((prev) => {
          const next = rememberServerNames(
            prev,
            loaded.map((s) => ({ id: s.id, name: s.name }))
          );
          saveStorageProfile(game, next);
          return next;
        });
      }

      setServerResolveState((prev) => {
        const next = { ...prev };
        for (const s of loaded) delete next[s.id];
        for (const id of failed) next[id] = 'failed';
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [missingProfileServerIds, game]);

  useEffect(() => {
    const q = mainSearch.trim();
    if (q.length < 3) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await serversApi.getList(100, 0, game, { full: true, search: q });
          const found = res.data ?? [];
          if (!found.length) return;
          setServers((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            for (const s of found) map.set(s.id, s);
            return [...map.values()];
          });
        } catch {
          /* keep cached list */
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mainSearch, game]);

  useEffect(() => {
    const q = wantedSearch.trim();
    if (q.length < 3) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await serversApi.getList(100, 0, game, { full: true, search: q });
          const found = res.data ?? [];
          if (!found.length) return;
          setServers((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            for (const s of found) map.set(s.id, s);
            return [...map.values()];
          });
        } catch {
          /* keep cached list */
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [wantedSearch, game]);

  const filteredMainServers = useMemo(() => {
    const q = mainSearch.trim().toLowerCase();
    const base = q
      ? servers.filter(
          (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
        )
      : servers;
    if (!profile.mainServerId) return base;
    const main = servers.find((s) => s.id === profile.mainServerId);
    if (!main) return base;
    const matchesSearch =
      !q ||
      main.name.toLowerCase().includes(q) ||
      main.id.toLowerCase().includes(q);
    if (!matchesSearch) return base;
    return [main, ...base.filter((s) => s.id !== main.id)];
  }, [servers, mainSearch, profile.mainServerId]);

  const selectedWantedServers = useMemo(
    () =>
      profile.wantedServerIds
        .map((id) => servers.find((s) => s.id === id))
        .filter((s): s is Server => s != null),
    [profile.wantedServerIds, servers]
  );

  const browseWantedServers = useMemo(() => {
    const selectedSet = new Set(profile.wantedServerIds);
    const q = wantedSearch.trim().toLowerCase();
    const base = q
      ? servers.filter(
          (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
        )
      : servers;
    return base.filter((s) => !selectedSet.has(s.id));
  }, [servers, wantedSearch, profile.wantedServerIds]);

  const updateProfile = useCallback(
    (patch: Partial<StorageProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        saveStorageProfile(game, next);
        return next;
      });
    },
    [game]
  );

  const selectMainServer = (server: Server) => {
    setProfile((prev) => {
      const next = rememberServerNames(
        { ...prev, mainServerId: server.id },
        [{ id: server.id, name: server.name }]
      );
      saveStorageProfile(game, next);
      return next;
    });
  };

  const toggleWantedServer = (serverId: string, server?: Server) => {
    const exists = profile.wantedServerIds.includes(serverId);
    const wantedServerIds = exists
      ? profile.wantedServerIds.filter((id) => id !== serverId)
      : [...profile.wantedServerIds, serverId];
    setProfile((prev) => {
      const base = { ...prev, wantedServerIds };
      const next = server
        ? rememberServerNames(base, [{ id: server.id, name: server.name }])
        : base;
      saveStorageProfile(game, next);
      return next;
    });
  };

  const handlePresetChange = (presetId: ConsolePresetId) => {
    const preset = CONSOLE_PRESETS.find((p) => p.id === presetId);
    updateProfile({
      consolePreset: presetId,
      availableGb: preset?.gb ?? profile.availableGb,
    });
  };

  const estimatedModCount = useMemo(
    () => estimateUnionModCount(servers, profile.mainServerId, profile.wantedServerIds),
    [servers, profile.mainServerId, profile.wantedServerIds]
  );

  const runPlan = async (profileOverride?: StorageProfile) => {
    const active = profileOverride ?? profile;
    if (!active.mainServerId) {
      setError('Select your current server first.');
      return;
    }
    if (!active.wantedServerIds.length) {
      setError('Select at least one server you want to play.');
      return;
    }
    setError(null);
    setPlanStartedAt(Date.now());
    setPlanning(true);
    try {
      const data = await storageApi.plan({
        game,
        mainServerId: active.mainServerId,
        wantedServerIds: active.wantedServerIds,
        availableGb: active.availableGb,
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Plan failed');
    } finally {
      setPlanning(false);
      setPlanStartedAt(null);
    }
  };

  const swapWantedServer = async (fromId: string, toId: string) => {
    const wantedServerIds = profile.wantedServerIds.filter((id) => id !== fromId);
    if (!wantedServerIds.includes(toId)) wantedServerIds.push(toId);
    const nextProfile = { ...profile, wantedServerIds };
    setProfile(nextProfile);
    saveStorageProfile(game, nextProfile);
    await runPlan(nextProfile);
  };

  const sizeById = useMemo(() => {
    if (!result) return new Map<string, number | null>();
    const map = new Map<string, number | null>();
    const add = (mods: ModWithSize[]) => {
      for (const mod of mods) map.set(mod.id.toUpperCase(), mod.sizeBytes);
    };
    add(result.data.mainServer.mods);
    for (const server of result.data.wantedServers) add(server.mods);
    add(result.data.analysis.wantedUnion);
    return map;
  }, [result]);

  const storageAlternatives = useMemo(() => {
    if (!result || servers.length === 0) return [];
    return findStorageAlternatives({
      mainModIds: result.data.mainServer.mods.map((m) => m.id),
      wantedServers: result.data.wantedServers.map((s) => ({
        id: s.id,
        name: s.name,
        mods: s.mods,
      })),
      candidates: servers
        .filter((s) => (s.mods?.length ?? 0) > 0)
        .map((s) => ({
          id: s.id,
          name: s.name,
          mods: s.mods,
          players: s.players,
          scenarioName: s.scenarioName,
        })),
      sizeById,
    });
  }, [result, servers, sizeById]);

  const setFeedback = useMemo((): ServerSetFeedback | null => {
    if (profile.wantedServerIds.length === 0) return null;

    const selectedServers = profile.wantedServerIds
      .map((id) => {
        const fromList = servers.find((s) => s.id === id);
        if (fromList) return toServerSetInput(fromList);
        const fromPlan = result?.data.wantedServers.find((s) => s.id === id);
        if (fromPlan) {
          return toServerSetInput({
            id: fromPlan.id,
            name: fromPlan.name,
            mods: fromPlan.mods,
            modpackEstimatedBytes: fromPlan.estimatedBytes,
          });
        }
        return null;
      })
      .filter((s): s is ServerSetInput => s != null);

    if (!selectedServers.length) return null;

    const mainFromList = profile.mainServerId
      ? servers.find((s) => s.id === profile.mainServerId)
      : null;
    const mainFromPlan = result?.data.mainServer;
    const mainServer = mainFromList
      ? toServerSetInput(mainFromList)
      : mainFromPlan
        ? toServerSetInput({
            id: mainFromPlan.id,
            name: mainFromPlan.name,
            mods: mainFromPlan.mods,
            modpackEstimatedBytes: mainFromPlan.estimatedBytes,
          })
        : null;

    return analyzeServerSets({
      selectedServers,
      mainServer,
      availableBytes: Math.round(profile.availableGb * 1024 ** 3),
      sizeById,
    });
  }, [profile, servers, result, sizeById]);

  const applyServerSet = async (serverIds: string[]) => {
    const nextProfile = { ...profile, wantedServerIds: serverIds };
    setProfile(nextProfile);
    saveStorageProfile(game, nextProfile);
    if (nextProfile.mainServerId) {
      await runPlan(nextProfile);
    }
  };

  const analysis = result?.data.analysis;

  if (game === 'arma3') {
    return (
      <StatusState
        type="error"
        message="Storage planner is Reforger-only for now (workshop sizes)."
        actionText="Back to servers"
        onAction={() => { window.location.href = '/arma3/servers'; }}
      />
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <SEO
        title="Storage Planner"
        description="Plan console mod storage for Arma Reforger: compare server modpacks, deduplicated download size, safe-to-remove mods. PS5 and Xbox."
        keywords="arma reforger storage planner, console mod space, ps5 reforger mods"
        url="/storage-planner"
      />

      <header className="space-y-4 border-b border-white/10 pb-10">
        <Link
          to="/arma-reforger-console-mod-storage"
          className="inline-flex text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-tactical-orange transition-colors"
        >
          ← About console mod storage
        </Link>
        <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">
          // CONSOLE_STORAGE_INTEL
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
          Storage Planner
        </h1>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest max-w-3xl leading-relaxed">
          See if your servers fit in console mod space, what the game auto-downloads when you join,
          and which mods you can delete manually — plus similar servers that need less downloading.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="border-l-4 border-l-tactical-orange">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">1 · Platform</h2>
            <div className="grid grid-cols-2 gap-2">
              {CONSOLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id)}
                  className={`px-3 py-3 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    profile.consolePreset === preset.id
                      ? 'border-tactical-orange bg-tactical-orange/10 text-tactical-orange'
                      : 'border-white/10 text-gray-500 hover:border-white/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                Available space for mods (GB)
              </span>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={profile.availableGb}
                onChange={(e) => updateProfile({ availableGb: Number(e.target.value), consolePreset: 'custom' })}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white font-mono text-sm outline-none focus:border-tactical-orange"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-zinc-700">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">2 · Installed library (proxy)</h2>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
              Server you are on now — used to estimate auto-downloads when joining others.
            </p>
            <input
              type="text"
              placeholder="Search by server name or ID…"
              value={mainSearch}
              onChange={(e) => setMainSearch(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange"
            />
            {profile.mainServerId && (
              <div className="border border-tactical-orange/40 bg-tactical-orange/5 px-3 py-3">
                <p className="text-[9px] font-black text-tactical-orange uppercase tracking-widest mb-2">
                  Current selection
                </p>
                {(() => {
                  const main = servers.find((s) => s.id === profile.mainServerId);
                  const label = profile.mainServerId
                    ? resolveServerLabel(
                        profile.mainServerId,
                        main,
                        profile.serverNames,
                        serverResolveState[profile.mainServerId]
                      )
                    : null;
                  return (
                    <p className="text-[10px] font-black text-white uppercase truncate">
                      {label?.title ?? '—'}
                    </p>
                  );
                })()}
              </div>
            )}
            {loadingServers && !filteredMainServers.length ? (
              <StatusState type="loading" />
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-white/5">
                {filteredMainServers.length === 0 ? (
                  <p className="p-4 text-[10px] text-gray-600 font-bold uppercase">
                    {servers.length === 0
                      ? 'Server list empty — check API / collector'
                      : 'No servers match search'}
                  </p>
                ) : (
                  filteredMainServers.slice(0, 100).map((server) => (
                    <button
                      key={server.id}
                      type="button"
                      onClick={() => selectMainServer(server)}
                      className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                        profile.mainServerId === server.id
                          ? 'bg-tactical-orange/20 text-tactical-orange'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {server.name}
                      <span className="block text-[8px] text-gray-600 font-mono">{server.mods?.length ?? 0} mods</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-emerald-600">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">3 · My servers</h2>
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
            All servers you want to play — shared mods (RHS, WCS…) count once in the combined total.
          </p>
          <input
            type="text"
            placeholder="Search servers to add…"
            value={wantedSearch}
            onChange={(e) => setWantedSearch(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange"
          />
          {profile.wantedServerIds.length > 0 && (
            <div className="space-y-2 border border-tactical-orange/40 bg-tactical-orange/5 px-3 py-3">
              <p className="text-[9px] font-black text-tactical-orange uppercase tracking-widest">
                Selected · {profile.wantedServerIds.length} server(s)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {profile.wantedServerIds.map((serverId) => {
                  const server = servers.find((s) => s.id === serverId);
                  const label = resolveServerLabel(
                    serverId,
                    server,
                    profile.serverNames,
                    serverResolveState[serverId]
                  );
                  return (
                    <label
                      key={serverId}
                      className="flex items-start gap-3 px-3 py-3 border border-tactical-orange/50 bg-tactical-orange/10 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleWantedServer(serverId, server)}
                        className="mt-1 accent-orange-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black text-white uppercase truncate">
                          {label.title}
                        </span>
                        <span
                          className={`text-[8px] font-mono ${
                            serverResolveState[serverId] === 'failed'
                              ? 'text-red-400'
                              : 'text-gray-600'
                          }`}
                        >
                          {label.sub}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {!analysis && profile.wantedServerIds.length >= 2 && (
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                  Run Analyze for combined size and fit
                </p>
              )}
            </div>
          )}
          {loadingServers && !browseWantedServers.length && !selectedWantedServers.length ? (
            <StatusState type="loading" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {browseWantedServers.length === 0 ? (
                <p className="col-span-full p-4 text-[10px] text-gray-600 font-bold uppercase">
                  {wantedSearch.trim()
                    ? 'No more servers match'
                    : profile.wantedServerIds.length
                      ? 'All loaded servers selected — search to add more'
                      : 'Search or scroll to pick servers'}
                </p>
              ) : (
                browseWantedServers.slice(0, 150).map((server) => (
                  <label
                    key={server.id}
                    className="flex items-start gap-3 px-3 py-3 border border-white/5 hover:border-white/20 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleWantedServer(server.id, server)}
                      className="mt-1 accent-orange-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black text-white uppercase truncate">
                        {server.name}
                      </span>
                      <span className="text-[8px] text-gray-600 font-mono">
                        {server.mods?.length ?? 0} mods
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => void runPlan()}
            disabled={planning}
            className="w-full sm:w-auto px-8 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors disabled:opacity-50"
          >
            {planning ? 'Calculating…' : 'Analyze storage'}
          </button>
          {planning && planStartedAt != null && (
            <StoragePlanLoading modEstimate={estimatedModCount} startedAt={planStartedAt} />
          )}
          {error && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>}
        </CardContent>
      </Card>

          {planning && !analysis && <StoragePlanResultsSkeleton />}

      {analysis && result && (
        <section className={`space-y-8 ${planning ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Combined modpack',
                value: formatBytes(analysis.wanted.estimatedBytes),
                sub: `${analysis.wanted.modCount} mods · ${Math.round(analysis.wanted.coverage * 100)}% sized`,
              },
              {
                label: 'Your free space',
                value: formatBytes(analysis.availableBytes),
                sub: profile.consolePreset.toUpperCase(),
              },
              {
                label: 'To download',
                value: formatBytes(analysis.toDownloadSummary.estimatedBytes),
                sub: `${formatBytes(analysis.toDownloadSummary.knownBytes)} known · ${analysis.toDownload.length} mods`,
              },
              {
                label: 'Status',
                value: analysis.fits ? 'FITS' : 'OVER LIMIT',
                sub: analysis.fits ? 'Combination OK' : `+${formatBytes(analysis.bytesOver)} needed`,
              },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-900 border border-white/10 p-5 space-y-1">
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">{item.label}</p>
                <p className={`text-2xl font-black font-mono ${analysis.fits || item.label !== 'Status' ? 'text-white' : 'text-red-400'}`}>
                  {item.value}
                </p>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{item.sub}</p>
              </div>
            ))}
          </div>

          {analysis.wanted.coverage < 1 && (
            <p className="text-[9px] text-yellow-600/90 font-bold uppercase tracking-widest">
              Partial size data ({Math.round(analysis.wanted.coverage * 100)}%) — estimates use average of known mods.
              Missing sizes appear after the next collector run (leaderboard) or when a mod page was opened (workshop cache).
            </p>
          )}
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{result.meta.disclaimer}</p>

          {setFeedback && profile.wantedServerIds.length >= 2 && (
            <ServerSetFeedbackPanel
              feedback={setFeedback}
              planning={planning}
              onApplySet={(ids) => void applyServerSet(ids)}
            />
          )}

          {storageAlternatives.length > 0 && (
            <Card className="border-l-4 border-l-sky-500/80">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase">Less download / delete hassle</h3>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                    Similar modpacks from the network — auto-downloads when you join; deleting is manual.
                    Check scenario and rules before switching.
                  </p>
                </div>
                <ul className="space-y-3">
                  {storageAlternatives.map((alt) => (
                    <li
                      key={`${alt.referenceServerId}-${alt.alternativeServerId}`}
                      className="border border-white/10 bg-black/30 px-4 py-3 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Instead of{' '}
                            <span className="text-white">{alt.referenceServerName}</span>
                            {' '}(+{formatBytes(alt.referenceExtraBytes)} to stack)
                          </p>
                          <p className="text-[11px] font-black text-white uppercase truncate">
                            → {alt.alternativeServerName}
                          </p>
                          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
                            {alt.overlapPercent}% mod overlap · +{formatBytes(alt.alternativeExtraBytes)} to stack ·{' '}
                            saves ~{formatBytes(alt.bytesSaved)} · {alt.players} players
                            {alt.scenarioName ? ` · ${alt.scenarioName}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Link
                            to={`${gp}/server/${alt.alternativeServerId}`}
                            className="px-3 py-2 text-[8px] font-black uppercase tracking-widest border border-white/20 text-gray-300 hover:border-white/50 hover:text-white"
                          >
                            Inspect
                          </Link>
                          <button
                            type="button"
                            disabled={planning}
                            onClick={() => void swapWantedServer(alt.referenceServerId, alt.alternativeServerId)}
                            className="px-3 py-2 text-[8px] font-black uppercase tracking-widest bg-sky-500/20 border border-sky-500/50 text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
                          >
                            Use instead
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-black text-white uppercase">Safe to remove</h3>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                  {!analysis.fits && analysis.bytesOver > 0
                    ? analysis.suggestedFreeBytes > 0
                      ? `Over limit by ${formatBytes(analysis.bytesOver)} — delete manually (~${formatBytes(analysis.suggestedFreeBytes)} from top items)`
                      : `Over limit by ${formatBytes(analysis.bytesOver)} — delete manually (sizes unknown for removable mods)`
                    : 'Not needed for any selected server — delete manually to free disk space'}
                </p>
                <ModSizeList
                  mods={analysis.canRemove}
                  emptyLabel="Nothing removable"
                  title="Frees on disk"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-black text-white uppercase">Need to download</h3>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                  Auto-downloaded when you join — game fetches these; you do not pick them manually
                </p>
                <ModSizeList
                  mods={analysis.toDownload}
                  emptyLabel="Already have all mods"
                  title="Uses on disk"
                />
              </CardContent>
            </Card>
          </div>

          {profile.mainServerId && (
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Main server proxy:{' '}
              <Link to={`${gp}/server/${profile.mainServerId}`} className="text-tactical-orange hover:underline">
                View server detail
              </Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
