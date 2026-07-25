/**
 * Dynamic sitemap builders for Cloudflare Pages Functions.
 * Hub pages + per-mod / per-server URLs from KV shards.
 */

export const SITE_ORIGIN = 'https://reforgermods.com';

export type SitemapGame = 'reforger' | 'arma3';

export type SitemapUrl = {
  loc: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string;
};

/** Static marketing / tool hubs (both theaters where relevant). */
export function staticSitemapUrls(): SitemapUrl[] {
  return [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'hourly', priority: 1.0 },
    { loc: `${SITE_ORIGIN}/servers`, changefreq: 'hourly', priority: 0.9 },
    { loc: `${SITE_ORIGIN}/trending`, changefreq: 'daily', priority: 0.8 },
    { loc: `${SITE_ORIGIN}/scenarios`, changefreq: 'daily', priority: 0.8 },
    { loc: `${SITE_ORIGIN}/scenarios/official`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${SITE_ORIGIN}/arma-reforger-console-mod-storage`, changefreq: 'weekly', priority: 0.9 },
    { loc: `${SITE_ORIGIN}/storage-planner`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${SITE_ORIGIN}/audit`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${SITE_ORIGIN}/dependency-blockers`, changefreq: 'weekly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/arma-server-browser`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${SITE_ORIGIN}/best-arma-reforger-hosting`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${SITE_ORIGIN}/hosting`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/status`, changefreq: 'daily', priority: 0.4 },
    { loc: `${SITE_ORIGIN}/support`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/arma3`, changefreq: 'hourly', priority: 0.8 },
    { loc: `${SITE_ORIGIN}/arma3/servers`, changefreq: 'hourly', priority: 0.7 },
    { loc: `${SITE_ORIGIN}/arma3/trending`, changefreq: 'daily', priority: 0.7 },
    { loc: `${SITE_ORIGIN}/arma3/scenarios`, changefreq: 'daily', priority: 0.7 },
    { loc: `${SITE_ORIGIN}/arma3/scenarios/official`, changefreq: 'weekly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/arma3/hosting`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/best-arma-3-hosting`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE_ORIGIN}/arma3/status`, changefreq: 'daily', priority: 0.3 },
  ];
}

export function modDetailUrl(modId: string, game: SitemapGame): string {
  const gp = game === 'arma3' ? '/arma3' : '';
  return `${SITE_ORIGIN}${gp}/mod/${encodeURIComponent(modId)}`;
}

export function serverDetailUrl(serverId: string, game: SitemapGame): string {
  const gp = game === 'arma3' ? '/arma3' : '';
  return `${SITE_ORIGIN}${gp}/server/${encodeURIComponent(serverId)}`;
}

export function kvListBaseKey(kind: 'mods' | 'servers', game: SitemapGame): string {
  if (game === 'arma3') return `cache:${kind}:arma3`;
  return `cache:${kind}`;
}

/** Extract top-level entity ids from a KV list chunk (JSON array). */
export function extractIdsFromChunkJson(text: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid sitemap chunk JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Sitemap chunk must be a JSON array');
  }
  const ids: string[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    if (id == null) continue;
    const s = String(id).trim();
    if (!s || s === '0') continue;
    ids.push(s);
  }
  return ids;
}

export function urlsFromIds(
  ids: string[],
  toLoc: (id: string) => string,
  changefreq: SitemapUrl['changefreq'],
  priority: number
): SitemapUrl[] {
  const seen = new Set<string>();
  const out: SitemapUrl[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ loc: toLoc(id), changefreq, priority });
  }
  return out;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlset(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority != null) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderSitemapIndex(
  entries: Array<{ loc: string; lastmod?: string }>
): string {
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
      return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function sitemapIndexEntries(origin = SITE_ORIGIN, lastmod?: string): Array<{ loc: string; lastmod?: string }> {
  const day = lastmod ?? new Date().toISOString().slice(0, 10);
  return [
    { loc: `${origin}/sitemap/pages.xml`, lastmod: day },
    { loc: `${origin}/sitemap/mods.xml`, lastmod: day },
    { loc: `${origin}/sitemap/servers.xml`, lastmod: day },
  ];
}

export function xmlResponse(body: string, maxAge = 3600): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });
}
