import type { ServerHistoryPoint } from '../../functions/lib/server-uptime-history';
import { buildOfflineBands } from '../../functions/lib/server-uptime-history';

export type { ServerHistoryPoint };
export { buildOfflineBands };

export function formatUptimePercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return '—';
  return `${Math.round(ratio * 100)}%`;
}

export function uptimeTooltipLabel(
  point: ServerHistoryPoint,
  hourlyView: boolean
): string | null {
  if (point.uptimeRatio === null) return null;
  if (hourlyView) {
    return point.online ? 'Online at scan' : 'Offline at scan';
  }
  return `Uptime ~${formatUptimePercent(point.uptimeRatio)} of scans`;
}
