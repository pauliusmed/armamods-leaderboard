import type { AuditStatus } from '@audit-config';

/** Short chip labels – scannable at a glance (internal status codes unchanged). */
export const AUDIT_STATUS_SHORT: Record<AuditStatus, string> = {
  dead: 'Broken',
  warning: 'Monitor',
  risky: 'Monitor',
  ok: 'Keep',
  niche: 'Low traffic',
  unknown: 'No data',
};

/** One-line explanation for tooltips / report sections. */
export const AUDIT_STATUS_HINT: Record<AuditStatus, string> = {
  dead: 'Likely broken after the update – 0–1 players on BM now (remove from config)',
  warning: 'Was popular before the update, empty-ish after – drop not yet severe enough for Broken',
  risky: 'Big drop since the update but still on some BattleMetrics servers',
  ok: 'Still used on BM (or normal post-update network dip)',
  niche: 'Too few players before the update – drop may be noise',
  unknown: 'Not enough history to assess',
};

export const ZERO_NOW_SHORT = 'Zero today';
export const ZERO_NOW_HINT =
  'Exactly 0 players on BattleMetrics right now (different from “a few per day” in averages)';

/** Simplified audit buckets shown on /audit summary (internal status codes unchanged). */
export const AUDIT_BUCKET_SHORT = {
  remove: 'Remove',
  review: 'Review',
  keep: 'Keep',
  other: 'Low / no data',
} as const;

export const AUDIT_BUCKET_HINT = {
  remove: 'Broken, empty after the update, or declining – likely safe to drop from config',
  review: 'Big drop since patch but still on some servers – verify before removing',
  keep: 'Still used on BattleMetrics (or normal post-update network dip)',
  other: 'Too few players to judge, or not enough BM history',
} as const;
