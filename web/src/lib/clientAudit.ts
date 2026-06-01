import {
  auditHighlights,
  buildModAuditRow,
  REFORGER_PATCH_17,
  sortAuditRowsWorstFirst,
  type CoDeployedRef,
  type HistoryPoint,
  type LiveModSnapshot,
  type ParsedConfigMod,
} from '@audit-config';
import type { GameType } from '../api/client';

const BATCH = 6;

async function fetchJsonSafe(url: string): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const r = await fetch(url, { cache: 'no-store' });
  const text = await r.text();
  const trimmed = text.trimStart();
  if (!r.ok || trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    return { ok: false, status: r.status };
  }
  try {
    return { ok: true, status: r.status, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: r.status };
  }
}

/** Fallback audit via existing GET endpoints when POST /audit/config returns HTML/503 */
export async function runClientSideAudit(
  mods: ParsedConfigMod[],
  game: GameType = 'reforger',
  onProgress?: (done: number, total: number) => void
) {
  const configIds = new Set(mods.map((m) => m.modId));
  const modMap = new Map<string, LiveModSnapshot & { name?: string }>();
  const historyCache = new Map<string, HistoryPoint[]>();

  let historyHits = 0;

  for (let i = 0; i < mods.length; i += BATCH) {
    const chunk = mods.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (m) => {
        const [histRes, modRes] = await Promise.all([
          fetchJsonSafe(`/api/mods/${m.modId}/history?game=${game}&days=31`),
          fetchJsonSafe(`/api/mods/${m.modId}?game=${game}`),
        ]);
        if (histRes.ok && histRes.data) {
          const h = histRes.data as { data?: HistoryPoint[] };
          const pts = h.data || [];
          historyCache.set(m.modId, pts);
          if (pts.length > 0) historyHits += 1;
        } else {
          historyCache.set(m.modId, []);
        }
        if (modRes.ok && modRes.data) {
          const d = modRes.data as {
            data?: LiveModSnapshot & { name?: string; coDeployed?: CoDeployedRef[] };
          };
          if (d.data) modMap.set(m.modId, d.data);
        }
      })
    );
    onProgress?.(Math.min(i + BATCH, mods.length), mods.length);
  }

  const historyFor = (modId: string) => historyCache.get(modId.toUpperCase()) ?? [];
  const buildOpts = { configIds, modMap, historyFor };

  if (historyHits < Math.max(3, Math.floor(mods.length * 0.05))) {
    throw new Error(
      'Data API temporarily unavailable (503). Wait 5–10 minutes and try again – Cloudflare/KV load, not a config error.'
    );
  }

  const rows = sortAuditRowsWorstFirst(
    mods.map((mod) =>
      buildModAuditRow(mod, historyFor(mod.modId), modMap.get(mod.modId) ?? null, REFORGER_PATCH_17, buildOpts)
    )
  );

  const summary: Record<string, number> = {
    dead: 0,
    risky: 0,
    warning: 0,
    ok: 0,
    niche: 0,
    unknown: 0,
  };
  for (const r of rows) summary[r.status] += 1;

  return {
    data: rows,
    meta: {
      patchDate: REFORGER_PATCH_17,
      modCount: rows.length,
      summary,
      highlights: auditHighlights(rows),
      durationMs: 0,
      mode: 'client-fallback' as const,
      privacy:
        'Your config.json is not stored. Only modId was sent; names are loaded from the reforgermods database per mod.',
      disclaimer:
        'Fallback mode: slower but works when batch audit is unavailable. Data from BattleMetrics history API. ' +
        'Now = online on BM today; daily averages include servers seen that day (including ones that later went offline).',
    },
  };
}

export async function parseApiJson(response: Response): Promise<unknown> {
  const text = await response.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    const err = new Error('HTML_RESPONSE');
    (err as Error & { status: number }).status = response.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    const hint =
      trimmed.startsWith('Rising') || trimmed.includes('Recovering (')
        ? ' Received page text instead of API JSON – try again in a minute or refresh.'
        : '';
    const snippet = text.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `Server returned non-JSON (${response.status}): ${e instanceof SyntaxError ? e.message : 'parse error'}.` +
        (snippet ? ` Start: “${snippet}…”` : '') +
        hint
    );
  }
}
