import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import type { GameType } from '../api/client';
import { parseServerConfig } from '../lib/parseServerConfig';
import { parseApiJson, runClientSideAudit } from '../lib/clientAudit';

type AuditStatus = 'dead' | 'risky' | 'warning' | 'ok' | 'niche' | 'unknown';
type TrendPhase = 'rising' | 'recovering' | 'declining' | 'stable' | 'unknown';

interface ModAlternative {
  modId: string;
  name: string;
  currentPlayers: number;
  coDeployCount: number;
  trendPhase: TrendPhase;
  reason: string;
}

interface ModAuditRow {
  modId: string;
  name: string;
  status: AuditStatus;
  title: string;
  detail: string;
  beforeAvg: number | null;
  afterAvg: number | null;
  dropPct: number | null;
  currentPlayers: number;
  serverCount: number;
  trendPhase: TrendPhase;
  trendLabel: string;
  trendDetail: string;
  recentAvg: number | null;
  alternatives: ModAlternative[];
}

interface AuditResponse {
  data: ModAuditRow[];
  meta: {
    patchDate: string;
    modCount: number;
    summary: Record<AuditStatus, number>;
    highlights: {
      rising: ModAuditRow[];
      recovering: ModAuditRow[];
      declining: ModAuditRow[];
    };
    durationMs: number;
    disclaimer: string;
    privacy?: string;
    mode?: 'client-fallback';
  };
}

type InputMode = 'paste' | 'file';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const STATUS_ORDER: AuditStatus[] = ['dead', 'risky', 'warning', 'ok', 'niche', 'unknown'];

const STATUS_STYLE: Record<AuditStatus, string> = {
  dead: 'border-red-500/60 bg-red-950/30 text-red-300',
  risky: 'border-orange-500/50 bg-orange-950/20 text-orange-200',
  warning: 'border-yellow-600/40 bg-yellow-950/15 text-yellow-100',
  ok: 'border-emerald-600/40 bg-emerald-950/15 text-emerald-200',
  niche: 'border-gray-600/40 bg-gray-900/40 text-gray-400',
  unknown: 'border-gray-700/40 bg-black/40 text-gray-500',
};

const STATUS_LABEL: Record<AuditStatus, string> = {
  dead: 'NEVEIKIA PO 1.7',
  risky: 'RIZIKA',
  warning: 'ĮSPĖJIMAS',
  ok: 'OK',
  niche: 'NIŠA',
  unknown: 'NEŽINOMA',
};

const TREND_STYLE: Record<TrendPhase, string> = {
  rising: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/50',
  recovering: 'bg-sky-500/20 text-sky-300 border-sky-600/50',
  declining: 'bg-red-500/15 text-red-300 border-red-700/40',
  stable: 'bg-gray-700/30 text-gray-400 border-gray-600/40',
  unknown: 'bg-gray-800/30 text-gray-500 border-gray-700/40',
};

interface ConfigAuditPageProps {
  game?: GameType;
}

function HighlightStrip({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ModAuditRow[];
  empty: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-[11px] text-gray-600">
        {title}: {empty}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <Link
            key={r.modId}
            to={`/mod/${r.modId}`}
            className={`text-[10px] px-2 py-1 border rounded ${TREND_STYLE[r.trendPhase]}`}
          >
            {r.name} · {r.recentAvg ?? r.currentPlayers} žaid.
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ConfigAuditPage({ game = 'reforger' }: ConfigAuditPageProps) {
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [configText, setConfigText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [filter, setFilter] = useState<AuditStatus | 'all'>('all');
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    if (!result) return new Map<AuditStatus, ModAuditRow[]>();
    const map = new Map<AuditStatus, ModAuditRow[]>();
    for (const row of result.data) {
      if (!map.has(row.status)) map.set(row.status, []);
      map.get(row.status)!.push(row);
    }
    for (const [, rows] of map) {
      rows.sort((a, b) => (b.dropPct ?? 0) - (a.dropPct ?? 0));
    }
    return map;
  }, [result]);

  const visibleRows = useMemo(() => {
    if (!result) return [];
    if (filter === 'all') return result.data;
    return result.data.filter((r) => r.status === filter);
  }, [result, filter]);

  const tryParsePreview = useCallback((text: string) => {
    if (!text.trim()) {
      setParsedCount(null);
      return null;
    }
    try {
      const mods = parseServerConfig(text);
      setParsedCount(mods.length);
      return mods;
    } catch {
      setParsedCount(null);
      return null;
    }
  }, []);

  const loadFile = useCallback(
    (file: File) => {
      setError(null);
      setResult(null);
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        setError('Leidžiamas tik .json failas');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('Failas per didelis (max 2 MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setConfigText(text);
        setFileName(file.name);
        setInputMode('file');
        tryParsePreview(text);
      };
      reader.onerror = () => setError('Nepavyko nuskaityti failo');
      reader.readAsText(file);
    },
    [tryParsePreview]
  );

  function clearInput() {
    setConfigText('');
    setFileName(null);
    setParsedCount(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function runAudit() {
    setError(null);
    setResult(null);
    setProgress(null);
    setLoading(true);
    try {
      const mods = parseServerConfig(configText);
      setParsedCount(mods.length);

      let auditResult: AuditResponse | null = null;

      try {
        const r = await fetch(`/api/audit/config?game=${game}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ mods }),
        });
        const json = (await parseApiJson(r)) as AuditResponse & {
          message?: string;
          error?: string;
        };
        if (!r.ok) {
          const errJson = json as { message?: string; error?: string };
          throw new Error(errJson.message || errJson.error || `HTTP ${r.status}`);
        }
        auditResult = json;
      } catch (batchErr) {
        const useFallback =
          batchErr instanceof Error &&
          (batchErr.message === 'HTML_RESPONSE' ||
            batchErr.message.includes('ne JSON') ||
            batchErr.message.includes('Audit failed') ||
            batchErr.message.includes('503'));
        if (!useFallback) throw batchErr;

        setProgress('Masinis auditas neprieinamas – skenuojama po modą (lėčiau)…');
        auditResult = (await runClientSideAudit(mods, game, (done, total) => {
          setProgress(`Skenuojama ${done}/${total} modų…`);
        })) as AuditResponse;
      }

      setResult(auditResult);
      setFilter('all');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepavyko atlikti audito');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
      <SEO
        title="Serverio config audit | Arma Mods"
        description="Įklijuok Reforger config.json – modų rizika po 1.7, tendencijos ir alternatyvos iš panašių serverių."
      />

      <header className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-tactical-orange text-[10px] font-bold tracking-[0.35em] uppercase">
          // Config intelligence
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Serverio modų auditas
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          <strong className="text-white">Įklijuok</strong> arba <strong className="text-white">įkelk</strong>{' '}
          <code className="text-tactical-orange">config.json</code> – gausi ataskaitą naršyklėje. Failas{' '}
          <strong className="text-white">nesaugomas</strong> serveryje; siunčiami tik modų ID ir pavadinimai.
        </p>
      </header>

      <div
        className="border border-emerald-800/40 bg-emerald-950/20 rounded-lg px-4 py-3 text-[11px] text-emerald-200/90 leading-relaxed"
        role="note"
      >
        <strong className="text-emerald-300">Privatumas:</strong> config apdorojamas tavo naršyklėje. Į serverį
        keliauja tik <code className="text-emerald-400">modId</code> + <code className="text-emerald-400">name</code>{' '}
        sąrašas – jokie slaptažodžiai, IP ar pilnas JSON neįrašomi ir nesaugomi.
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${
              inputMode === 'paste' ? 'text-tactical-orange border-b-2 border-tactical-orange' : 'text-gray-500'
            }`}
          >
            Įklijuoti
          </button>
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${
              inputMode === 'file' ? 'text-tactical-orange border-b-2 border-tactical-orange' : 'text-gray-500'
            }`}
          >
            Įkelti failą
          </button>
        </div>

        {inputMode === 'paste' ? (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              config.json turinys (Ctrl+V)
            </label>
            <textarea
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setFileName(null);
                tryParsePreview(e.target.value);
              }}
              placeholder='{"game":{"mods":[{"modId":"612F512CD4CB21D5","name":"WCS_Earplugs"}]}}'
              className="w-full h-56 bg-black/60 border border-white/10 rounded-lg p-4 text-xs text-gray-200 font-mono focus:border-tactical-orange outline-none resize-y"
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragOver ? 'border-tactical-orange bg-tactical-orange/5' : 'border-white/15 bg-black/40'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) loadFile(f);
            }}
          >
            <p className="text-gray-400 text-sm mb-4">
              Nutempk <code className="text-tactical-orange">config.json</code> čia arba pasirink failą
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5"
            >
              Pasirinkti failą
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
              }}
            />
            {fileName && (
              <p className="mt-4 text-[11px] text-tactical-orange font-mono">
                Įkelta: {fileName}
                {parsedCount != null && ` · ${parsedCount} modų`}
              </p>
            )}
            {configText && fileName && (
              <p className="mt-2 text-[10px] text-gray-500">Failo turinys paruoštas analizei (peržiūrėti – skiltis „Įklijuoti“)</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runAudit}
            disabled={loading || !configText.trim()}
            className="px-8 py-3 bg-tactical-orange text-black font-black text-[10px] uppercase tracking-widest disabled:opacity-40 hover:bg-white transition-colors"
          >
            {loading ? 'Skenuojama…' : 'Gauti ataskaitą'}
          </button>
          <button
            type="button"
            onClick={clearInput}
            disabled={loading || (!configText && !fileName)}
            className="px-6 py-3 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30"
          >
            Išvalyti
          </button>
          {parsedCount != null && configText.trim() && (
            <span className="text-[10px] text-gray-500 font-mono">Paruošta: {parsedCount} modų</span>
          )}
        </div>

        {progress && (
          <p className="text-[11px] text-tactical-orange font-mono animate-pulse">{progress}</p>
        )}

        {error && (
          <p className="text-red-400 text-sm border border-red-900/50 bg-red-950/20 p-4 rounded">{error}</p>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STATUS_ORDER.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`p-3 border text-left rounded ${STATUS_STYLE[st]} ${filter === st ? 'ring-1 ring-white' : ''}`}
              >
                <div className="text-[9px] font-bold opacity-70">{STATUS_LABEL[st]}</div>
                <div className="text-2xl font-black">{result.meta.summary[st] ?? 0}</div>
              </button>
            ))}
          </div>

          <section className="border border-white/10 rounded-lg p-4 space-y-4 bg-white/[0.02]">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-tactical-orange">
              Tavo config tendencijos
            </h2>
            <HighlightStrip
              title="Kyla (po 1.7)"
              rows={result.meta.highlights?.rising ?? []}
              empty="nėra aiškaus augimo"
            />
            <HighlightStrip
              title="Atgyja (krito, bet paskutinė savaitė gerėja)"
              rows={result.meta.highlights?.recovering ?? []}
              empty="nėra atsigavimo signalo"
            />
            <HighlightStrip
              title="Krenta toliau"
              rows={result.meta.highlights?.declining ?? []}
              empty="visi stabilūs arba nežinoma"
            />
          </section>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-[10px] uppercase tracking-widest ${filter === 'all' ? 'text-tactical-orange' : 'text-gray-500'}`}
          >
            Rodyti visus ({result.meta.modCount}) · {result.meta.durationMs}ms
          </button>

          <div className="text-[11px] text-gray-500 border border-white/5 p-4 rounded bg-white/2 space-y-2">
            {result.meta.mode === 'client-fallback' && (
              <p className="text-yellow-500/90 font-bold uppercase text-[10px] tracking-widest">
                Atsarginis režimas (po modą)
              </p>
            )}
            {result.meta.privacy && (
              <p className="text-emerald-600/90">{result.meta.privacy}</p>
            )}
            <p>{result.meta.disclaimer}</p>
          </div>

          <div className="space-y-3">
            {visibleRows.map((row) => (
              <article
                key={row.modId}
                className={`border rounded-lg p-4 ${STATUS_STYLE[row.status]}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[9px] font-black tracking-widest">{STATUS_LABEL[row.status]}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 border rounded font-bold ${TREND_STYLE[row.trendPhase]}`}
                      >
                        {row.trendLabel}
                      </span>
                      <span className="text-[10px] opacity-60">{row.modId}</span>
                    </div>
                    <h3 className="font-bold text-white truncate">{row.name}</h3>
                    <p className="text-xs opacity-90 mt-1 font-semibold">{row.title}</p>
                    <p className="text-xs opacity-75 mt-1">{row.detail}</p>
                    <p className="text-[11px] opacity-60 mt-1 italic">{row.trendDetail}</p>
                  </div>
                  <div className="text-right text-xs font-mono shrink-0 space-y-0.5">
                    <div>
                      Prieš 1.7: <strong>{row.beforeAvg ?? '—'}</strong> → Po: <strong>{row.afterAvg ?? '—'}</strong>
                      {row.dropPct != null && <span className="ml-2 text-red-400">−{row.dropPct}%</span>}
                    </div>
                    <div>
                      Savaitė: <strong>{row.recentAvg ?? '—'}</strong> · Dabar: {row.currentPlayers} žaid.
                    </div>
                    <Link
                      to={`/mod/${row.modId}`}
                      className="inline-block mt-2 text-tactical-orange hover:underline text-[10px] uppercase tracking-widest"
                    >
                      Modo istorija →
                    </Link>
                  </div>
                </div>

                {row.alternatives.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Panašūs serveriai naudoja (alternatyvos, ne tavo config)
                    </p>
                    <ul className="space-y-2">
                      {row.alternatives.map((alt) => (
                        <li
                          key={alt.modId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs bg-black/30 rounded px-3 py-2"
                        >
                          <div>
                            <Link to={`/mod/${alt.modId}`} className="text-white font-bold hover:text-tactical-orange">
                              {alt.name}
                            </Link>
                            <span className="text-gray-500 ml-2">{alt.modId}</span>
                            <span
                              className={`ml-2 text-[9px] px-1 border rounded ${TREND_STYLE[alt.trendPhase]}`}
                            >
                              {alt.trendPhase === 'rising'
                                ? 'kyla'
                                : alt.trendPhase === 'recovering'
                                  ? 'atgyja'
                                  : alt.trendPhase}
                            </span>
                          </div>
                          <div className="text-gray-400 sm:text-right">
                            {alt.currentPlayers} žaid. · co-deploy ×{alt.coDeployCount}
                            <span className="block text-[10px] opacity-80">{alt.reason}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>

          {filter !== 'all' && grouped.get(filter)?.length === 0 && (
            <p className="text-gray-500 text-sm">Šioje kategorijoje modų nėra.</p>
          )}
        </>
      )}
    </div>
  );
}
