import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from './ui/SEO';
import type { GameType } from '../api/client';
import { parseServerConfig } from '../lib/parseServerConfig';
import { isAuditRemoveCandidate, sortAuditRowsWorstFirst } from '@audit-config';
import { parseApiJson, runClientSideAudit } from '../lib/clientAudit';
import { formatAuditReportJson, formatAuditReportText } from '../lib/auditReport';
import { PAYPAL_DONATE_URL } from '../lib/siteLinks';
import {
  AUDIT_BUCKET_HINT,
  AUDIT_BUCKET_SHORT,
  AUDIT_STATUS_HINT,
  AUDIT_STATUS_SHORT,
} from '../lib/auditLabels';

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
  earlyAfterAvg: number | null;
  afterAvg: number | null;
  dropPct: number | null;
  currentPlayers: number;
  serverCount: number;
  trendPhase: TrendPhase;
  trendLabel: string;
  trendDetail: string;
  recentAvg: number | null;
  rankBefore: number | null;
  rankRecent: number | null;
  classificationHint: string | null;
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
      gems?: ModAuditRow[];
      trash?: ModAuditRow[];
      risingPopular?: ModAuditRow[];
    };
    durationMs: number;
    disclaimer: string;
    privacy?: string;
    mode?: 'client-fallback';
  };
}

type InputMode = 'paste' | 'file';
type AuditFilter = 'remove' | 'review' | 'keep' | 'other' | 'all';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const BUCKET_STYLE: Record<Exclude<AuditFilter, 'all'>, string> = {
  remove: 'border-red-500/60 bg-red-950/30 text-red-300',
  review: 'border-orange-500/50 bg-orange-950/20 text-orange-200',
  keep: 'border-emerald-600/40 bg-emerald-950/15 text-emerald-200',
  other: 'border-gray-700/40 bg-black/40 text-gray-500',
};

const BUCKET_ORDER: Exclude<AuditFilter, 'all'>[] = ['remove', 'review', 'keep', 'other'];

const STATUS_STYLE: Record<AuditStatus, string> = {
  dead: 'border-red-500/60 bg-red-950/30 text-red-300',
  risky: 'border-orange-500/50 bg-orange-950/20 text-orange-200',
  warning: 'border-yellow-600/40 bg-yellow-950/15 text-yellow-100',
  ok: 'border-emerald-600/40 bg-emerald-950/15 text-emerald-200',
  niche: 'border-gray-600/40 bg-gray-900/40 text-gray-400',
  unknown: 'border-gray-700/40 bg-black/40 text-gray-500',
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

function isZeroOnBm(players: number): boolean {
  return players === 0;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function AuditDonateBanner() {
  return (
    <div className="border border-tactical-orange/35 bg-tactical-orange/5 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-gray-300 leading-relaxed">
        <strong className="text-white">Found this useful?</strong> Daily BattleMetrics scans and hosting
        cost real money – help keep reforgermods.com free for all server owners.
      </p>
      <a
        href={PAYPAL_DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-5 py-2.5 bg-tactical-orange text-black text-center font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors"
      >
        Donate via PayPal
      </a>
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
  const [filter, setFilter] = useState<AuditFilter>('remove');
  const [progress, setProgress] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showCopyHint = useCallback((msg: string) => {
    setCopyHint(msg);
    window.setTimeout(() => setCopyHint(null), 2500);
  }, []);

  const copyReport = useCallback(
    async (kind: 'text' | 'json') => {
      if (!result) return;
      const payload = {
        patchDate: result.meta.patchDate,
        summary: result.meta.summary,
        rows: result.data,
      };
      const text = kind === 'text' ? formatAuditReportText(payload) : formatAuditReportJson(payload);
      const ok = await copyToClipboard(text);
      showCopyHint(ok ? `Copied ${kind} report to clipboard` : 'Copy failed – allow clipboard access');
    },
    [result, showCopyHint]
  );

  const copyModId = useCallback(
    async (modId: string) => {
      const ok = await copyToClipboard(modId);
      showCopyHint(ok ? `Copied ${modId}` : 'Copy failed');
    },
    [showCopyHint]
  );

  const buckets = useMemo(() => {
    if (!result) return null;
    const remove = sortAuditRowsWorstFirst(result.data.filter(isAuditRemoveCandidate));
    const removeIds = new Set(remove.map((r) => r.modId));
    const review = sortAuditRowsWorstFirst(
      result.data.filter((r) => r.status === 'risky' && !removeIds.has(r.modId))
    );
    const keep = sortAuditRowsWorstFirst(result.data.filter((r) => r.status === 'ok'));
    const other = sortAuditRowsWorstFirst(
      result.data.filter((r) => r.status === 'niche' || r.status === 'unknown')
    );
    return { remove, review, keep, other };
  }, [result]);

  const visibleRows = useMemo(() => {
    if (!result || !buckets) return [];
    if (filter === 'all') return sortAuditRowsWorstFirst(result.data);
    return buckets[filter];
  }, [result, filter, buckets]);

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
        setError('Only .json files are allowed');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('File too large (max 2 MB)');
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
      reader.onerror = () => setError('Failed to read file');
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
          body: JSON.stringify({ mods: mods.map((m) => ({ modId: m.modId })) }),
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

        setProgress('Batch audit unavailable – scanning per mod (slower)…');
        auditResult = (await runClientSideAudit(mods, game, (done, total) => {
          setProgress(`Scanning ${done}/${total} mods…`);
        })) as AuditResponse;
      }

      setResult(auditResult);
      setFilter('remove');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
      <SEO
        title="Server config audit | Arma Mods"
        description="Paste your Reforger config.json for post-1.7 mod risk, trends, and alternatives from similar servers."
      />

      <header className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-tactical-orange text-[10px] font-bold tracking-[0.35em] uppercase">
          // Config intelligence
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Server mod audit
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Find <strong className="text-white">broken or dead mods</strong> after Reforger 1.7 Partisan – paste or
          upload <code className="text-tactical-orange">config.json</code>. Your file is{' '}
          <strong className="text-white">not stored</strong>; only mod IDs are sent.
        </p>
      </header>

      <div
        className="border border-emerald-800/40 bg-emerald-950/20 rounded-lg px-4 py-3 text-[11px] text-emerald-200/90 leading-relaxed"
        role="note"
      >
        <strong className="text-emerald-300">Privacy:</strong> config is parsed in your browser. Only{' '}
        <code className="text-emerald-400">modId</code> list is sent – mod names come from our database, not your
        config (names in config.json are often wrong). No passwords, IPs, or full JSON are stored.
      </div>

      <AuditDonateBanner />

      <div className="space-y-4">
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${
              inputMode === 'paste' ? 'text-tactical-orange border-b-2 border-tactical-orange' : 'text-gray-500'
            }`}
          >
            Paste
          </button>
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${
              inputMode === 'file' ? 'text-tactical-orange border-b-2 border-tactical-orange' : 'text-gray-500'
            }`}
          >
            Upload file
          </button>
        </div>

        {inputMode === 'paste' ? (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              config.json content (Ctrl+V)
            </label>
            <textarea
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setFileName(null);
                tryParsePreview(e.target.value);
              }}
              placeholder='config.json, mods[] fragment, or one modId per line (16 hex chars)'
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
              Drop <code className="text-tactical-orange">config.json</code> here or choose a file
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5"
            >
              Choose file
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
                Loaded: {fileName}
                {parsedCount != null && ` · ${parsedCount} mods`}
              </p>
            )}
            {configText && fileName && (
              <p className="mt-2 text-[10px] text-gray-500">
                File content ready (view in Paste tab)
              </p>
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
            {loading ? 'Scanning…' : 'Run audit'}
          </button>
          <button
            type="button"
            onClick={clearInput}
            disabled={loading || (!configText && !fileName)}
            className="px-6 py-3 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30"
          >
            Clear
          </button>
          {parsedCount != null && configText.trim() && (
            <span className="text-[10px] text-gray-500 font-mono">Ready: {parsedCount} mods</span>
          )}
        </div>

        {progress && (
          <p className="text-[11px] text-tactical-orange font-mono animate-pulse">{progress}</p>
        )}

        {error && (
          <p className="text-red-400 text-sm border border-red-900/50 bg-red-950/20 p-4 rounded">{error}</p>
        )}
        {copyHint && (
          <p className="text-emerald-400 text-[11px] font-mono border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 rounded">
            {copyHint}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 border border-white/10 rounded-lg p-3 bg-black/40">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 w-full sm:w-auto">
              Export report
            </span>
            <button
              type="button"
              onClick={() => void copyReport('text')}
              className="px-4 py-2 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5"
            >
              Copy text report (with modId)
            </button>
            <button
              type="button"
              onClick={() => void copyReport('json')}
              className="px-4 py-2 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5"
            >
              Copy JSON report
            </button>
            <span className="text-[10px] text-gray-600 sm:ml-auto">
              Each line: <code className="text-tactical-orange">modId | name | …</code> — not config.json
            </span>
          </div>

          {buckets && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {BUCKET_ORDER.map((bucket) => (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setFilter(bucket)}
                  title={AUDIT_BUCKET_HINT[bucket]}
                  className={`p-3 border text-left rounded ${BUCKET_STYLE[bucket]} ${
                    filter === bucket ? 'ring-1 ring-white' : ''
                  }`}
                >
                  <div className="text-[9px] font-bold opacity-70">{AUDIT_BUCKET_SHORT[bucket]}</div>
                  <div className="text-2xl font-black">{buckets[bucket].length}</div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-[10px] uppercase tracking-widest ${filter === 'all' ? 'text-tactical-orange' : 'text-gray-500'}`}
          >
            Show all ({result.meta.modCount}) · {result.meta.durationMs}ms
          </button>
          {filter === 'remove' && buckets && buckets.remove.length > 0 && (
            <p className="text-[11px] text-red-300/90">
              Showing mods likely broken or safe to remove after 1.7 – worst first.
            </p>
          )}

          <div className="text-[11px] text-gray-500 border border-white/5 p-4 rounded bg-white/2 space-y-2">
            {result.meta.mode === 'client-fallback' && (
              <p className="text-yellow-500/90 font-bold uppercase text-[10px] tracking-widest">
                Fallback mode (per mod)
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
                      <span
                        className="text-[9px] font-black tracking-widest"
                        title={AUDIT_STATUS_HINT[row.status]}
                      >
                        {AUDIT_STATUS_SHORT[row.status]}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 border rounded font-bold ${TREND_STYLE[row.trendPhase]}`}
                      >
                        {row.trendLabel}
                      </span>
                      {isZeroOnBm(row.currentPlayers) && (
                        <span className="text-[9px] px-1.5 py-0.5 border border-red-500/60 rounded font-black uppercase tracking-wider text-red-300 bg-red-950/50">
                          Zero today
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white truncate">{row.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <code className="text-[11px] font-mono text-tactical-orange break-all select-all">
                        {row.modId}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyModId(row.modId)}
                        className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:text-white border border-white/10 px-2 py-0.5"
                      >
                        Copy modId
                      </button>
                    </div>
                    <p className="text-xs opacity-90 mt-1 font-semibold">{row.title}</p>
                    <p className="text-xs opacity-75 mt-1">{row.detail}</p>
                    <p className="text-[11px] opacity-60 mt-1 italic">{row.trendDetail}</p>
                    {row.classificationHint && (
                      <p className="text-[11px] text-amber-300/90 mt-2 border-l-2 border-amber-500/40 pl-2">
                        {row.classificationHint}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs font-mono shrink-0 space-y-0.5 max-w-[20rem]">
                    <div className="text-sm">
                      {row.dropPct != null && row.dropPct > 0 && (
                        <span
                          className="text-red-400 font-black text-base mr-2"
                          title="Drop from before 1.7 to first days after update"
                        >
                          −{row.dropPct}%
                        </span>
                      )}
                      Before 1.7: <strong>{row.beforeAvg ?? '—'}</strong>/day
                    </div>
                    <div>
                      After 1.7 update: <strong>{row.earlyAfterAvg ?? '—'}</strong>/day
                      <span className="text-gray-600 ml-1">(first ~4d)</span>
                    </div>
                    <div>
                      Last 7 days: <strong>{row.recentAvg ?? '—'}</strong>/day
                      <span className="text-gray-600 ml-1">· trend</span>
                    </div>
                    {(row.rankBefore != null || row.rankRecent != null) && (
                      <div>
                        BM rank: <strong>#{row.rankBefore ?? '—'}</strong> →{' '}
                        <strong>#{row.rankRecent ?? '—'}</strong>
                        <span className="text-gray-600 ml-1">(lower = more popular)</span>
                      </div>
                    )}
                    <div>
                      Since patch avg: <strong>{row.afterAvg ?? '—'}</strong>/day · Now (BM):{' '}
                      {isZeroOnBm(row.currentPlayers) ? (
                        <strong className="text-red-400">0</strong>
                      ) : (
                        <strong>{row.currentPlayers}</strong>
                      )}
                    </div>
                    {isZeroOnBm(row.currentPlayers) && (row.recentAvg ?? 0) > 10 && (
                      <p className="text-[10px] text-amber-300/90 leading-snug">
                        0 on BM now, but last 7 days ~{row.recentAvg}/day – may be lag or servers offline today;
                        check trend before removing.
                      </p>
                    )}
                    <Link
                      to={`/mod/${row.modId}`}
                      className="inline-block mt-2 text-tactical-orange hover:underline text-[10px] uppercase tracking-widest"
                    >
                      Mod history →
                    </Link>
                  </div>
                </div>

                {row.alternatives.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Used on similar servers (alternatives, not in your config)
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
                                ? 'rising'
                                : alt.trendPhase === 'recovering'
                                  ? 'recovering'
                                  : alt.trendPhase}
                            </span>
                          </div>
                          <div className="text-gray-400 sm:text-right">
                            {alt.currentPlayers} players · co-deploy ×{alt.coDeployCount}
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

          {filter !== 'all' && buckets && buckets[filter].length === 0 && (
            <p className="text-gray-500 text-sm">
              {filter === 'remove'
                ? 'No broken or failing mods detected – your config looks clean after 1.7.'
                : `No mods in “${AUDIT_BUCKET_SHORT[filter]}”.`}
            </p>
          )}

          <AuditDonateBanner />
        </>
      )}
    </div>
  );
}
