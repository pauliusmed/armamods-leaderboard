import type { GameType } from '../api/client';

export type FeaturedServer = {
  id: string;
  game: GameType;
};

/**
 * Paid featured placements — MANUAL config, updated when a PayPal payment lands.
 * Got payment → add server ID + commit; after the month, remove it.
 * Never affects organic rankings — FEATURED is a separate, clearly-marked section.
 * Pricing and terms: see private docs-private/MONETIZATION.md (not in public repo).
 */
export const FEATURED_SERVERS: readonly FeaturedServer[] = [
  // { id: '39080633', game: 'reforger' },
];

export function isFeaturedServer(serverId: string, game: GameType): boolean {
  return FEATURED_SERVERS.some((f) => f.id === serverId && f.game === game);
}
