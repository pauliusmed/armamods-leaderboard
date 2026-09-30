import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSocialCrawler,
  isIndexerCrawler,
  isShareCrawler,
  parseShareRoute,
  pageUrl,
  modPreviewImageUrl,
  renderShareHtml,
  buildShareMeta,
} from '../web/functions/lib/share-meta.ts';
import { buildServerIndex } from '../web/functions/lib/server-lookup.ts';
import { clearModuleCache } from '../web/functions/lib/module-cache.ts';

beforeEach(() => clearModuleCache());

describe('parseShareRoute', () => {
  it('parses reforger mod links', () => {
    const route = parseShareRoute('/mod/629B2BA37EFFD577');
    assert.deepEqual(route, { game: 'reforger', kind: 'mod', id: '629B2BA37EFFD577' });
  });

  it('parses arma3 server links', () => {
    const route = parseShareRoute('/arma3/server/12345');
    assert.deepEqual(route, { game: 'arma3', kind: 'server', id: '12345' });
  });
});

describe('isSocialCrawler / isIndexerCrawler / isShareCrawler', () => {
  it('detects Discord bot as social', () => {
    assert.equal(isSocialCrawler('Mozilla/5.0 Discordbot/2.0'), true);
  });

  it('detects Googlebot as indexer and share crawler', () => {
    assert.equal(isIndexerCrawler('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
    assert.equal(isShareCrawler('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  });

  it('ignores normal browsers', () => {
    assert.equal(isSocialCrawler('Mozilla/5.0 Chrome/120.0'), false);
    assert.equal(isIndexerCrawler('Mozilla/5.0 Chrome/120.0'), false);
    assert.equal(isShareCrawler('Mozilla/5.0 Chrome/120.0'), false);
  });
});

describe('share URLs', () => {
  it('builds canonical mod page URL', () => {
    assert.equal(
      pageUrl({ game: 'reforger', kind: 'mod', id: 'ABC' }),
      'https://reforgermods.com/mod/ABC'
    );
  });

  it('builds mod preview image API URL', () => {
    assert.match(modPreviewImageUrl('ABC', 'reforger'), /\/api\/og\/preview\/mod\/ABC/);
  });
});

describe('renderShareHtml', () => {
  const meta = {
    title: 'Test Mod | Arma Reforger Mod Stats',
    description: 'Rank #1 · 10 players',
    url: 'https://reforgermods.com/mod/ABC',
    image: 'https://reforgermods.com/og-image.png',
    kind: 'mod' as const,
    name: 'Test Mod',
    gameLabel: 'Arma Reforger',
    modId: 'ABC',
  };

  it('includes meta refresh for social mode', () => {
    const html = renderShareHtml(meta, { mode: 'social' });
    assert.match(html, /http-equiv="refresh"/);
    assert.match(html, /application\/ld\+json/);
  });

  it('omits refresh for indexer mode and keeps body content', () => {
    const html = renderShareHtml(meta, { mode: 'indexer' });
    assert.equal(html.includes('http-equiv="refresh"'), false);
    assert.match(html, /<h1>/);
    assert.match(html, /Mod leaderboard/);
  });
});

describe('buildShareMeta — server lookup goes through ServerLookup', () => {
  const SHARDS = 6;

  function makeKv(entries: Record<string, string>) {
    const gets: string[] = [];
    return {
      gets,
      get: async (key: string, type?: string) => {
        gets.push(key);
        const value = entries[key];
        if (value === undefined) return null;
        return type === 'json' ? JSON.parse(value) : value;
      },
    } as unknown as KVNamespace & { gets: string[] };
  }

  const index = buildServerIndex(
    Array.from({ length: SHARDS }, (_, i) => [{ id: `srv-${i}` }])
  );

  function shardEntries(prefix: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < SHARDS; i++) {
      out[`${prefix}${i}`] = JSON.stringify([
        { id: `srv-${i}`, name: `Server ${i}`, players: 30, maxPlayers: 60, mods: [] },
      ]);
    }
    return out;
  }

  it('reads only the index-mapped shard, not all of them', async () => {
    const kv = makeKv({
      ...shardEntries('cache:servers:'),
      'cache:servers-index': JSON.stringify(index),
      'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    const meta = await buildShareMeta(kv, { game: 'reforger', kind: 'server', id: 'srv-4' });
    assert.equal(meta?.kind, 'server');
    assert.equal(meta?.name, 'Server 4');
    assert.match(meta?.description ?? '', /30\/60 players/);
    assert.deepEqual(kv.gets.filter((k) => /^cache:servers:\d+$/.test(k)), ['cache:servers:4']);
  });

  it('uses the :arma3 suffixed keys for arma3 routes', async () => {
    const kv = makeKv({
      ...shardEntries('cache:servers:arma3:'),
      'cache:servers-index:arma3': JSON.stringify(index),
      'cache:servers:meta:arma3': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    const meta = await buildShareMeta(kv, { game: 'arma3', kind: 'server', id: 'srv-2' });
    assert.equal(meta?.name, 'Server 2');
    assert.deepEqual(kv.gets.filter((k) => /^cache:servers:arma3:\d+$/.test(k)), ['cache:servers:arma3:2']);
  });

  it('returns null for an unknown server id', async () => {
    const kv = makeKv({
      ...shardEntries('cache:servers:'),
      'cache:servers-index': JSON.stringify(index),
      'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    assert.equal(await buildShareMeta(kv, { game: 'reforger', kind: 'server', id: 'srv-none' }), null);
  });
});
