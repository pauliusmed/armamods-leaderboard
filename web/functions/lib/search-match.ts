/** All whitespace-separated tokens must appear in text (any order). */
export function matchesAllSearchTokens(text: string, query: string): boolean {
  const haystack = (text || '').toLowerCase();
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((token) => haystack.includes(token));
}

export function matchesServerSearch(
  server: { name?: string; ip?: string | null },
  query: string
): boolean {
  const combined = [server.name, server.ip].filter(Boolean).join(' ');
  return matchesAllSearchTokens(combined, query);
}

export function matchesModSearch(
  mod: { name?: string; id?: string; author?: string | null },
  query: string
): boolean {
  const combined = [mod.name, mod.id, mod.author].filter(Boolean).join(' ');
  return matchesAllSearchTokens(combined, query);
}
