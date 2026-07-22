/**
 * Community fundraising — keep amounts + voice in one place.
 * Update RAISED manually when PayPal donations land.
 */
export const DONATION_GOAL_USD = 25;
export const DONATION_RAISED_USD = 0;

export const DONATION_GOAL_LABEL = `$${DONATION_GOAL_USD}`;

/** Short shared pitch — collective “we”, not a personal ask. */
export const DONATION_GOAL_BLURB =
  'A shared $25 pool covers ~1 year of BattleMetrics Basic so everyone gets live rankings back';

export const DONATION_CTA_LABEL = 'Chip in via PayPal';

export const DONATION_PROGRESS_LABEL = 'Community pool';

export const DONATION_FOOTNOTE =
  'Every contribution goes toward the shared API cost — not a personal tip jar';

export const DONATION_COVERS = [
  'BattleMetrics Basic API (~1 year at $1/mo) for the whole site',
  'Live collector sync so mods, servers, and trending stay current',
  'Charts and rankings that update for every visitor again',
] as const;

export function donationProgressPercent(): number {
  if (DONATION_GOAL_USD <= 0) return 0;
  return Math.min(100, Math.round((DONATION_RAISED_USD / DONATION_GOAL_USD) * 100));
}
