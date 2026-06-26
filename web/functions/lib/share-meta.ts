export const SITE_ORIGIN = 'https://reforgermods.com';

export type ShareGame = 'reforger' | 'arma3';
export type ShareKind = 'mod' | 'server';

export interface ShareRoute {
  game: ShareGame;
  kind: ShareKind;
  id: string;
}

export interface ShareMetaPayload {
  title: string;
  description: string;
  url: string;
  image: string;
}

const CRAWLER_UA =
  /bot|crawl|spider|facebookexternalhit|twitterbot|discordbot|slackbot|linkedinbot|whatsapp|telegrambot|embedly|preview|vkshare|redditbot|pinterest/i;

export function isSocialCrawler(userAgent: string): boolean {
  return CRAWLER_UA.test(userAgent);
}

export function parseShareRoute(pathname: string): ShareRoute | null {
  const modMatch = pathname.match(/^\/(?:arma3\/)?mod\/([^/]+)\/?$/i);
  if (modMatch) {
    return {
      game: pathname.startsWith('/arma3/') ? 'arma3' : 'reforger',
      kind: 'mod',
      id: decodeURIComponent(modMatch[1]),
    };
  }

  const serverMatch = pathname.match(/^\/(?:arma3\/)?server\/([^/]+)\/?$/i);
  if (serverMatch) {
    return {
      game: pathname.startsWith('/arma3/') ? 'arma3' : 'reforger',
      kind: 'server',
      id: decodeURIComponent(serverMatch[1]),
    };
  }

  return null;
}

export function defaultOgImage(): string {
  return `${SITE_ORIGIN}/og-image.png`;
}

export function modPreviewImageUrl(modId: string, game: ShareGame): string {
  return `${SITE_ORIGIN}/api/og/preview/mod/${encodeURIComponent(modId)}?game=${game}`;
}

export function serverPreviewImageUrl(serverId: string, game: ShareGame): string {
  return `${SITE_ORIGIN}/api/og/preview/server/${encodeURIComponent(serverId)}?game=${game}`;
}

export function pageUrl(route: ShareRoute): string {
  const gp = route.game === 'arma3' ? '/arma3' : '';
  return `${SITE_ORIGIN}${gp}/${route.kind}/${encodeURIComponent(route.id)}`;
}

function findMatchingBrace(text: string, openPos: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && inStr) {
      i++;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function getKvKeys(game: ShareGame) {
  const suffix = game === 'arma3' ? ':arma3' : '';
  return {
    MODS: `cache:mods${suffix}`,
    SERVERS: `cache:servers${suffix}`,
  };
}

export async function lookupMod(kv: KVNamespace, game: ShareGame, modId: string): Promise<any | null> {
  const keys = getKvKeys(game);
  const meta = (await kv.get(`${keys.MODS}:meta`, 'json')) as { chunks?: number } | null;
  if (!meta?.chunks) return null;

  for (let i = 0; i < meta.chunks; i++) {
    const chunkText = await kv.get(`${keys.MODS}:${i}`, 'text');
    if (!chunkText?.includes(`"id":"${modId}"`)) continue;

    const searchStr = `"id":"${modId}"`;
    const idPos = chunkText.indexOf(searchStr);
    const startPos = chunkText.lastIndexOf('{', idPos);
    const endPos = findMatchingBrace(chunkText, startPos);
    if (startPos === -1 || endPos === -1) continue;

    try {
      return JSON.parse(chunkText.slice(startPos, endPos + 1));
    } catch {
      return null;
    }
  }
  return null;
}

async function lookupServer(kv: KVNamespace, game: ShareGame, serverId: string): Promise<any | null> {
  const keys = getKvKeys(game);
  const meta = (await kv.get(`${keys.SERVERS}:meta`, 'json')) as { chunks?: number } | null;
  if (!meta?.chunks) return null;

  for (let i = 0; i < meta.chunks; i++) {
    const chunkText = await kv.get(`${keys.SERVERS}:${i}`, 'text');
    if (!chunkText?.includes(`"id":"${serverId}"`)) continue;

    const searchStr = `"id":"${serverId}"`;
    const idPos = chunkText.indexOf(searchStr);
    const startPos = chunkText.lastIndexOf('{', idPos);
    const endPos = findMatchingBrace(chunkText, startPos);
    if (startPos === -1 || endPos === -1) continue;

    try {
      return JSON.parse(chunkText.slice(startPos, endPos + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function extractOgImageFromHtml(html: string): string | null {
  const patterns = [
    /property=["']og:image(?::url)?["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image(?::url)?["']/i,
    /name=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/&amp;/g, '&');
  }
  return null;
}

function workshopPageUrl(modId: string, game: ShareGame): string {
  if (game === 'arma3') {
    return `https://steamcommunity.com/sharedfiles/filedetails/?id=${encodeURIComponent(modId)}`;
  }
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(modId)}`;
}

function ogImageCacheKey(game: ShareGame, modId: string): string {
  return `cache:og-image:${game}:${modId.toUpperCase()}`;
}

import { resolveModThumbnailUrl } from './workshop-fetch';

/** Workshop OG thumbnail with KV cache (7d). Discord follows 302 to this URL. */
export async function resolveModPreviewImage(
  kv: KVNamespace,
  game: ShareGame,
  modId: string
): Promise<string> {
  return resolveModThumbnailUrl(kv, game, modId);
}

export async function buildShareMeta(
  kv: KVNamespace,
  route: ShareRoute
): Promise<ShareMetaPayload | null> {
  const url = pageUrl(route);
  const gameLabel = route.game === 'arma3' ? 'Arma 3' : 'Arma Reforger';

  if (route.kind === 'mod') {
    const mod = await lookupMod(kv, route.game, route.id);
    if (!mod) return null;

    const rank = mod.overallRank ?? mod.stats?.overallRank;
    const players = mod.totalPlayers ?? 0;
    const servers = mod.serverCount ?? 0;
    const title = `${mod.name} | ${gameLabel} Mod Stats`;
    const description = [
      rank ? `Rank #${rank}` : null,
      `${players.toLocaleString('en-US')} players`,
      `${servers.toLocaleString('en-US')} servers on BattleMetrics`,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      title,
      description,
      url,
      image: modPreviewImageUrl(route.id, route.game),
    };
  }

  const server = await lookupServer(kv, route.game, route.id);
  if (!server) return null;

  const sqe = server.sqeRank ? `#${server.sqeRank}` : 'N/A';
  const title = `${server.name} | ${gameLabel} Server`;
  const description = `${server.players}/${server.maxPlayers} players · Server Rank ${sqe} · reforgermods.com`;

  return {
    title,
    description,
    url,
    image: serverPreviewImageUrl(route.id, route.game),
  };
}

export function renderShareHtml(meta: ShareMetaPayload): string {
  const esc = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <link rel="canonical" href="${esc(meta.url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="reforgermods.com" />
  <meta property="og:url" content="${esc(meta.url)}" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:image" content="${esc(meta.image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.image)}" />
  <meta http-equiv="refresh" content="0;url=${esc(meta.url)}" />
</head>
<body>
  <p><a href="${esc(meta.url)}">${esc(meta.title)}</a></p>
</body>
</html>`;
}
