/** User-facing copy — owned voice; third-party names only in footer attribution. */

export const NETWORK_LABEL = 'live network data';
export const NETWORK_SHORT = 'network';

export const DATA_SYNC_NOTE =
  'Server and player stats aggregated from public network sources · synced every ~2 hours';

/** Shown when /api/health reports isStale (collector snapshot older than ~3h). */
export const DATA_STALE_BANNER = (ageLabel: string) =>
  `Leaderboard snapshot is outdated (${ageLabel}). Live network sync is paused — BattleMetrics API now requires a paid key. Numbers below are the last successful collect.`;

export const DATA_STALE_BANNER_SHORT = (ageLabel: string) =>
  `Snapshot outdated (${ageLabel}) · live sync paused`;

export const DATA_STALE_FOOTER =
  'Live network sync paused · showing last successful collector snapshot (BattleMetrics API now requires a paid subscription)';

export const DATA_STALE_HERO_NOTE = (ageLabel: string) =>
  `Snapshot as of ${ageLabel} · not live`;

export const CHART_NO_DATA_TITLE = 'No chart data';

export const CHART_NO_DATA_SYNC_PAUSED =
  'Live sync paused — amber band = no new samples since last collect';

export const CHART_SYNC_GAP_LEGEND = 'No data (sync paused)';

export const CHART_NO_DATA_INACTIVE =
  'Data may be archived or this module is currently inactive';

export const CHART_NO_DATA_SERVER =
  'Server may be offline or monitoring was suspended';

export const DATA_SOURCE_ATTRIBUTION =
  'Telemetry includes BattleMetrics server listings · workshop metadata from Bohemia';

export const MOD_DETAIL_LIVE_FALLBACK =
  'Live network player counts · workshop shows subscribe totals, we show who is playing now';

export const MOD_DETAIL_SEO_PLAYERS = (players: number, servers: number, rank: string | number) =>
  `${players.toLocaleString()} players on ${servers} active servers. Rank #${rank}.`;

export const CO_DEPLOY_SUBTITLE =
  'Mods on the same servers as this one — shared server count, not global popularity or workshop dependencies';

export const SERVER_STATUS_FILTER_ARIA = 'Filter servers by online status';

export const SERVER_STATUS_TITLE = (label: string) => `Server status: ${label}`;

export const SCENARIO_EMPTY = 'No active scenarios in our registry yet.';

export const SCENARIO_SUBTITLE = 'Aggregated by active mission from live network telemetry';

export const STORAGE_LANDING_SOURCES =
  'Live server mod lists from our registry · workshop download sizes · no account required';

export const WORKSHOP_NOT_NETWORK_STATS = (workshopName: string) =>
  `Summary & description from ${workshopName} — not live network stats`;

export const OFFICIAL_SCENARIOS_BM_NOTE =
  'built-in missions from Bohemia. The network registry labels many of these with a';
