/**
 * Compact description search index for the mods leaderboard (Reforger only).
 *
 * Why: list shards don't carry workshop copy (too big), and per-request scans of
 * per-mod KV keys would cost thousands of reads. Instead the collector merges the
 * summary/description it already fetched during warm passes into one KV blob —
 * `cache:mods_search_index:{game}` — which /api/mods reads as a single key on the
 * last search tier (Steam Workshop searches title AND description; we mirror that
 * as a fallback after name/id/author so existing relevance never degrades).
 */

export interface ModsSearchIndexEntry {
  /** Uppercase mod id (matches leaderboard row ids case-insensitively). */
  id: string;
  /** Lowercase haystack: name | author | summary | description snippet. */
  h: string;
}

/** Cap indexed description text — marketing boilerplate beyond this adds noise, not recall. */
export const MODS_SEARCH_DESCRIPTION_SNIPPET_CHARS = 400;

export function modsSearchIndexCacheKey(game: string): string {
  return `cache:mods_search_index:${game}`;
}

export interface ModsSearchHaystackInput {
  name?: string | null;
  author?: string | null;
  summary?: string | null;
  description?: string | null;
}

export function buildSearchHaystack(fields: ModsSearchHaystackInput): string {
  const desc = (fields.description ?? '').slice(0, MODS_SEARCH_DESCRIPTION_SNIPPET_CHARS);
  return [fields.name, fields.author, fields.summary, desc]
    .map((part) => (part ?? '').toLowerCase())
    .join('\n');
}

export function buildSearchIndexEntry(
  id: string,
  fields: ModsSearchHaystackInput
): ModsSearchIndexEntry {
  return { id: id.toUpperCase(), h: buildSearchHaystack(fields) };
}

/** Overwrite/insert warmed entries and prune ids that left the leaderboard. Stable output order. */
export function mergeSearchIndex(
  prev: ModsSearchIndexEntry[] | null,
  updates: Map<string, ModsSearchHaystackInput>,
  validIds: Iterable<string>
): ModsSearchIndexEntry[] {
  if (updates.size === 0) return prev ?? [];
  const byId = new Map<string, ModsSearchIndexEntry>();
  for (const entry of prev ?? []) byId.set(entry.id.toUpperCase(), entry);
  for (const [id, fields] of updates) byId.set(id.toUpperCase(), buildSearchIndexEntry(id, fields));
  const valid = new Set([...validIds].map((v) => v.toUpperCase()));
  const merged = [...byId.entries()]
    .filter(([id]) => valid.has(id))
    .map(([, entry]) => entry);
  merged.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return merged;
}

export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Every token must appear somewhere in the haystack (AND semantics, like matchesAllSearchTokens). */
export function indexEntryMatches(entry: ModsSearchIndexEntry, tokens: string[]): boolean {
  const haystack = entry.h;
  return tokens.every((token) => haystack.includes(token));
}

/** Uppercase ids of index entries matching all tokens. Empty query → empty set. */
export function searchModsInIndex(
  index: ModsSearchIndexEntry[] | null,
  query: string
): Set<string> {
  const tokens = tokenizeSearchQuery(query);
  const hits = new Set<string>();
  if (!index || tokens.length === 0) return hits;
  for (const entry of index) {
    if (indexEntryMatches(entry, tokens)) hits.add(entry.id.toUpperCase());
  }
  return hits;
}

interface MinimalKV {
  get(key: string, type: 'json' | 'text'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Collector-side persistence: merge this run's warmed workshop copies into the
 * persisted index (pruning mods no longer listed) and write it once. Returns the
 * resulting index size; no-op when game isn't reforger or nothing new was warmed.
 * Entries without stored copy yet simply lack summary/description in their
 * haystack — coverage converges over subsequent runs as warm progresses.
 */
export async function persistModsSearchIndexFromWarm(
  kv: MinimalKV,
  game: string,
  modList: Array<{ id: string }>,
  warmedCopies: Map<string, ModsSearchHaystackInput>
): Promise<number> {
  if (game !== 'reforger' || warmedCopies.size === 0 || modList.length === 0) return 0;

  let prev: ModsSearchIndexEntry[] | null = null;
  try {
    prev = (await kv.get(modsSearchIndexCacheKey(game), 'json')) as ModsSearchIndexEntry[] | null;
  } catch {
    prev = null; // corrupt blob → rebuild from scratch instead of failing the run
  }

  const merged = mergeSearchIndex(prev, warmedCopies, modList.map((m) => m.id));
  if (merged.length === 0) return 0;

  await kv.put(modsSearchIndexCacheKey(game), JSON.stringify(merged));
  return merged.length;
}
