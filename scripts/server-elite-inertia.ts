/**
 * Elite Rank Inertia — ranking-only cushion for the previous leaderboard's top servers.
 *
 * Why: top servers often run at the same player cap (e.g. 128), so raw SQE scores cluster
 * within a few percent. Without a cushion, a single modpack tweak or uniqueness swing flips
 * #1↔#2 every collector run. The cushion adds hysteresis so the champion needs a *meaningful*
 * lead to be displaced, while a true popularity shift still breaks through.
 *
 * Differentiated tiers (#1 > #2 > #3): a flat cushion applied to all of top-3 cancels out when
 * comparing #1 vs #2, so it never protected the champion — only insulated top-3 from #4+.
 * Tiered cushions create real separation *within* the elite, which is where the churn lives.
 */

/** Cushion per elite rank position: index 0 = previous #1, 1 = #2, 2 = #3. */
export const ELITE_INERTIA_TIERS = [0.08, 0.04, 0.02] as const;

/** Min consecutive-online runs (~24h at 2h/run) before a server can hold an elite cushion. */
export const MIN_AGE_ELITE = 12;

export interface EliteLeaderboardEntry {
  id?: string;
}

/**
 * Apply ranking-only cushion to the previous leaderboard's elite servers.
 * Returns a new map; does not mutate input. `ages` maps server id → consecutive-online runs.
 *
 * A server is cushioned only if it exists in `rankingScores`, has a valid id, and its age
 * meets MIN_AGE_ELITE — a brand-new server cannot lock the top spot on a single snapshot.
 */
export function applyEliteInertiaCushion(
  rankingScores: Record<string, number>,
  oldLeaderboard: EliteLeaderboardEntry[] | null | undefined,
  ages: Record<string, number>,
  tiers: readonly number[] = ELITE_INERTIA_TIERS,
  minAge: number = MIN_AGE_ELITE
): Record<string, number> {
  const cushioned = { ...rankingScores };
  if (!Array.isArray(oldLeaderboard)) return cushioned;

  const count = Math.min(tiers.length, oldLeaderboard.length);
  for (let i = 0; i < count; i++) {
    const eliteId = oldLeaderboard[i]?.id;
    if (!eliteId) continue;
    if (cushioned[eliteId] === undefined) continue;
    if ((ages[eliteId] ?? 0) < minAge) continue;
    cushioned[eliteId] = Math.floor(cushioned[eliteId] * (1 + tiers[i]));
  }
  return cushioned;
}
