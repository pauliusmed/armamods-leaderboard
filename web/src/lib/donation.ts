/**
 * Community fundraising — keep amounts + voice in one place.
 * Update RAISED / DONORS manually when PayPal donations land.
 */

export type CommunityDonor = {
  name: string;
  /** Optional community / clan tag shown publicly */
  tag?: string;
  /** ISO date (UTC) of the gift */
  date: string;
  /** True for the first contribution that opened the pool */
  first?: boolean;
  /** Short public credit — no private notes or transaction IDs */
  note?: string;
};

export const DONATION_GOAL_USD = 25;

/** Running total in USD (EUR gifts converted ≈ at receive time). */
export const DONATION_RAISED_USD = 1.85;

export const DONATION_GOAL_LABEL = `$${DONATION_GOAL_USD}`;

export const DONATION_RAISED_LABEL = `$${DONATION_RAISED_USD.toFixed(2)}`;

/** Public wall of thanks — newest last; never store PayPal txn IDs here. */
export const COMMUNITY_DONORS: readonly CommunityDonor[] = [
  {
    name: 'Erf',
    tag: 'ARCL',
    date: '2026-07-23',
    first: true,
    note: 'First community donor — thank you for opening the pool.',
  },
];
/** Short shared pitch — collective “we”, not a personal ask. */
export const DONATION_GOAL_BLURB =
  'A shared $25 pool covers ~1 year of BattleMetrics Basic so everyone gets live rankings back';

export const DONATION_CTA_LABEL = 'Chip in via PayPal';

export const DONATION_PROGRESS_LABEL = 'Community pool';

export const DONATION_FOOTNOTE =
  'Every contribution goes toward the shared API cost — not a personal tip jar';

export const DONATION_THANKS_HEADING = 'Community thanks';

export const DONATION_COVERS = [
  'BattleMetrics Basic API (~1 year at $1/mo) for the whole site',
  'Live collector sync so mods, servers, and trending stay current',
  'Charts and rankings that update for every visitor again',
] as const;

export function donationProgressPercent(): number {
  if (DONATION_GOAL_USD <= 0) return 0;
  return Math.min(100, Math.round((DONATION_RAISED_USD / DONATION_GOAL_USD) * 100));
}

export function formatDonorDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
