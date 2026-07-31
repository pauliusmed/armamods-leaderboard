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

export const DONATION_GOAL_USD = 50;

/** Running total in USD (EUR gifts converted ≈ at receive time). */
export const DONATION_RAISED_USD = 26.85;

/** Quick fixed amounts for one-tap PayPal checkout. */
export const DONATION_QUICK_AMOUNTS = [3, 5, 10, 25] as const;

export const DONATION_GOAL_LABEL = `$${DONATION_GOAL_USD}`;

export const DONATION_RAISED_LABEL = `$${DONATION_RAISED_USD.toFixed(2)}`;

export const DONATION_GOAL_MET = DONATION_RAISED_USD >= DONATION_GOAL_USD;

/** Public wall of thanks — newest last; never store PayPal txn IDs here. */
export const COMMUNITY_DONORS: readonly CommunityDonor[] = [
  {
    name: 'Erf',
    tag: 'ARCL',
    date: '2026-07-23',
    first: true,
    note: 'First community donor — thank you for opening the pool.',
  },
  {
    name: 'HavocHound',
    date: '2026-07-25',
    note: 'Thank you — kind words and support for the workshop analytics work.',
  },
  {
    name: 'Anonymous',
    date: '2026-07-25',
    note: 'Thank you for helping push the shared pool over the line.',
  },
];

/** Short shared pitch — collective “we”, not a personal ask. No vendor names or unit prices. */
export const DONATION_GOAL_BLURB = DONATION_GOAL_MET
  ? 'Community pool goal met — live network rankings can stay current for everyone'
  : 'A shared community pool keeps live network rankings and sync running for everyone';

export const DONATION_CTA_LABEL = DONATION_GOAL_MET
  ? 'Add to the buffer via PayPal'
  : 'Chip in via PayPal';

export const DONATION_PROGRESS_LABEL = DONATION_GOAL_MET
  ? 'Community pool — goal met'
  : 'Community pool';

export const DONATION_FOOTNOTE = DONATION_GOAL_MET
  ? 'Goal reached together — extra chips still help keep sync healthy ahead'
  : 'Every contribution goes toward shared infrastructure — not a personal tip jar';

export const DONATION_THANKS_HEADING = 'Community thanks';

export const DONATION_GOAL_MET_BADGE = 'Goal met';

export const DONATION_COVERS_HEADING = 'What the pool unlocks:';

export const DONATION_COVERS = [
  'Live network data access for the whole site',
  'Collector sync so mods, servers, and trending stay current',
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
