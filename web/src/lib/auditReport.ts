/**
 * Exportable audit report (text + JSON) – modId first so server owners can paste into config.
 */
import { PAYPAL_DONATE_URL } from './siteLinks';
import { AUDIT_STATUS_SHORT, ZERO_NOW_SHORT } from './auditLabels';

export type AuditStatus = 'dead' | 'risky' | 'warning' | 'ok' | 'niche' | 'unknown';

export interface ReportModRow {
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
  recentAvg: number | null;
  trendPhase: string;
  trendLabel: string;
}

export interface AuditReportInput {
  patchDate: string;
  summary: Record<string, number>;
  rows: ReportModRow[];
}

const STATUS_ORDER: AuditStatus[] = ['dead', 'risky', 'warning', 'ok', 'niche', 'unknown'];

const STATUS_HEADING: Record<AuditStatus, string> = {
  dead: `${AUDIT_STATUS_SHORT.dead} – remove from server first`,
  risky: AUDIT_STATUS_SHORT.risky,
  warning: AUDIT_STATUS_SHORT.warning,
  ok: AUDIT_STATUS_SHORT.ok,
  niche: AUDIT_STATUS_SHORT.niche,
  unknown: AUDIT_STATUS_SHORT.unknown,
};

function lineForMod(r: ReportModRow): string {
  const drop = r.dropPct != null ? ` | drop ${r.dropPct}%` : '';
  const now =
    r.currentPlayers === 0 ? 'now 0 [ZERO ON BM TODAY]' : `now ${r.currentPlayers}`;
  const stats =
    `before ${r.beforeAvg ?? '—'} | after 1.7 update ${r.earlyAfterAvg ?? '—'} | last 7d ${r.recentAvg ?? '—'} | since patch ${r.afterAvg ?? '—'} | ${now}`;
  return `${r.modId} | ${r.name} | ${r.title}${drop}\n  ${stats}\n  ${r.detail}`;
}

/** Plain-text report for clipboard / Discord / server notes */
export function formatAuditReportText(input: AuditReportInput): string {
  const lines: string[] = [
    `Arma Reforger mod audit (patch ${input.patchDate})`,
    `Source: reforgermods.com/audit`,
    '',
    'Summary: ' +
      STATUS_ORDER.map((s) => `${s}=${input.summary[s] ?? 0}`).join(', '),
    '',
    '--- Mod IDs (copy lines into your mod list / Workshop) ---',
    '',
  ];

  const zeroNow = input.rows.filter((r) => r.currentPlayers === 0);
  if (zeroNow.length) {
    lines.push(`=== ${ZERO_NOW_SHORT.toUpperCase()} ON BATTLEMETRICS (${zeroNow.length}) ===`);
    lines.push('Exact zero today – separate from “a few players/day” in averages.');
    for (const r of zeroNow) {
      lines.push(
        `${r.modId} | ${r.name} | ${r.status.toUpperCase()} | last 7d ${r.recentAvg ?? '—'}/day | after 1.7 update ${r.earlyAfterAvg ?? '—'}/day`
      );
    }
    lines.push('');
  }

  for (const status of STATUS_ORDER) {
    const group = input.rows.filter((r) => r.status === status);
    if (!group.length) continue;
    lines.push(`=== ${STATUS_HEADING[status]} (${group.length}) ===`);
    for (const r of group) {
      lines.push(lineForMod(r));
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(`Support: ${PAYPAL_DONATE_URL}`);
  return lines.join('\n').trimEnd();
}

/** Valid JSON export – safe to save as .json (not config.json) */
export function formatAuditReportJson(input: AuditReportInput): string {
  const byStatus: Record<string, { modId: string; name: string; title: string; detail: string }[]> =
    {};
  for (const status of STATUS_ORDER) {
    byStatus[status] = input.rows
      .filter((r) => r.status === status)
      .map((r) => ({
        modId: r.modId,
        name: r.name,
        title: r.title,
        detail: r.detail,
        beforeAvg: r.beforeAvg,
        earlyAfterAvg: r.earlyAfterAvg,
        afterAvg: r.afterAvg,
        dropPct: r.dropPct,
        currentPlayers: r.currentPlayers,
        recentAvg: r.recentAvg,
        trendPhase: r.trendPhase,
      }));
  }
  return JSON.stringify(
    {
      patchDate: input.patchDate,
      generatedAt: new Date().toISOString(),
      summary: input.summary,
      modsByStatus: byStatus,
    },
    null,
    2
  );
}
