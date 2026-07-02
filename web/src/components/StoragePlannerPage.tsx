import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { serversApi, storageApi, type GameType } from '../api/client';
import type { ModWithSize, Server, StoragePlanAnalysis, StoragePlanResponse } from '../types';
import { SEO } from './ui/SEO';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { formatBytes } from '../lib/formatBytes';
import {
  CONSOLE_PRESETS,
  loadStorageProfile,
  saveStorageProfile,
  type ConsolePresetId,
  type StorageProfile,
} from '../lib/storageProfile';

interface StoragePlannerPageProps {
  game?: GameType;
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

function missingSizeModIds(analysis: StoragePlanAnalysis): string[] {
  const ids = new Set<string>();
  for (const mod of [...analysis.wantedUnion, ...analysis.toDownload, ...analysis.canRemove]) {
    if (!mod.sizeBytes) ids.add(mod.id);
  }
  return [...ids];
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

async function loadPlanWithSizes(
  input: Parameters<typeof storageApi.plan>[0],
  onProgress: (msg: string) => void
): Promise<StoragePlanResponse> {
  let result = await storageApi.plan(input);
  let missing = missingSizeModIds(result.data.analysis);
  let round = 0;
  const maxRounds = 6;

  while (missing.length > 0 && round < maxRounds) {
    const batch = missing.slice(0, 25);
    onProgress(`Loading workshop sizes… ${result.meta.sizesKnown ?? 0}/${result.meta.sizesTotal ?? '?'} (${batch.length} mods)`);
    await storageApi.fetchSizes(batch, input.game);
    result = await storageApi.plan(input);
    missing = missingSizeModIds(result.data.analysis);
    round++;
  }

  return result;
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
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoragePlanResponse | null>(null);

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
        const res = await serversApi.getList(500, 0, game, { full: true });
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
    if (!q) return servers;
    return servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [servers, mainSearch]);

  const filteredWantedServers = useMemo(() => {
    const q = wantedSearch.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [servers, wantedSearch]);

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

  const handlePresetChange = (presetId: ConsolePresetId) => {
    const preset = CONSOLE_PRESETS.find((p) => p.id === presetId);
    updateProfile({
      consolePreset: presetId,
      availableGb: preset?.gb ?? profile.availableGb,
    });
  };

  const toggleWantedServer = (serverId: string) => {
    const exists = profile.wantedServerIds.includes(serverId);
    const wantedServerIds = exists
      ? profile.wantedServerIds.filter((id) => id !== serverId)
      : [...profile.wantedServerIds, serverId];
    updateProfile({ wantedServerIds });
  };

  const runPlan = async () => {
    if (!profile.mainServerId) {
      setError('Select your current server first.');
      return;
    }
    if (!profile.wantedServerIds.length) {
      setError('Select at least one server you want to play.');
      return;
    }
    setError(null);
    setProgress(null);
    setPlanning(true);
    try {
      const input = {
        game,
        mainServerId: profile.mainServerId,
        wantedServerIds: profile.wantedServerIds,
        availableGb: profile.availableGb,
      };
      const data = await loadPlanWithSizes(input, setProgress);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Plan failed');
    } finally {
      setPlanning(false);
      setProgress(null);
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
          Approximate your installed mods from a main server, pick servers you want to play, and see
          combined download size, free-space fit, and safe-to-remove modules.
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
            <h2 className="text-lg font-black text-white uppercase tracking-tight">2 · Current server</h2>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
              We treat this modpack as your installed library (proxy).
            </p>
            <input
              type="text"
              placeholder="Search by server name or ID…"
              value={mainSearch}
              onChange={(e) => setMainSearch(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange"
            />
            {loadingServers && !filteredMainServers.length ? (
              <StatusState type="loading" />
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-white/5">
                {filteredMainServers.length === 0 ? (
                  <p className="p-4 text-[10px] text-gray-600 font-bold uppercase">No servers match</p>
                ) : (
                  filteredMainServers.slice(0, 100).map((server) => (
                    <button
                      key={server.id}
                      type="button"
                      onClick={() => updateProfile({ mainServerId: server.id })}
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
          <h2 className="text-lg font-black text-white uppercase tracking-tight">3 · Servers you want to play</h2>
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
            Multi-select — shared mods (RHS, WCS…) count once in the combined total.
          </p>
          <input
            type="text"
            placeholder="Search servers to add…"
            value={wantedSearch}
            onChange={(e) => setWantedSearch(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange"
          />
          {loadingServers && !filteredWantedServers.length ? (
            <StatusState type="loading" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {filteredWantedServers.length === 0 ? (
                <p className="col-span-full p-4 text-[10px] text-gray-600 font-bold uppercase">No servers match</p>
              ) : (
                filteredWantedServers.slice(0, 150).map((server) => {
                  const checked = profile.wantedServerIds.includes(server.id);
                  return (
                    <label
                      key={server.id}
                      className={`flex items-start gap-3 px-3 py-3 border cursor-pointer transition-colors ${
                        checked ? 'border-tactical-orange/50 bg-tactical-orange/5' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleWantedServer(server.id)}
                        className="mt-1 accent-orange-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black text-white uppercase truncate">{server.name}</span>
                        <span className="text-[8px] text-gray-600 font-mono">{server.mods?.length ?? 0} mods</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}
          {profile.wantedServerIds.length > 0 && (
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
              Selected: {profile.wantedServerIds.length} server(s)
            </p>
          )}
          <button
            type="button"
            onClick={() => void runPlan()}
            disabled={planning}
            className="w-full sm:w-auto px-8 py-4 bg-tactical-orange text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors disabled:opacity-50"
          >
            {planning ? 'Calculating…' : 'Analyze storage'}
          </button>
          {progress && (
            <p className="text-[10px] font-bold text-tactical-orange uppercase tracking-widest">{progress}</p>
          )}
          {error && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>}
        </CardContent>
      </Card>

      {analysis && result && (
        <section className="space-y-8">
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
              Re-run analyze to load more workshop sizes.
            </p>
          )}
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{result.meta.disclaimer}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-black text-white uppercase">Safe to remove</h3>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                  On your main server but not needed for selected targets — frees disk space
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
                  Required for selected servers — uses additional disk space
                </p>
                <ModSizeList
                  mods={analysis.toDownload}
                  emptyLabel="Already have all mods"
                  title="Uses on disk"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-black text-white uppercase">
                  {analysis.fits ? 'Optional cleanup' : 'Suggested removals'}
                </h3>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                  Largest removable mods first
                </p>
                <ModSizeList
                  mods={analysis.suggestedRemovals}
                  emptyLabel="No suggestions"
                  title="Suggested free"
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
