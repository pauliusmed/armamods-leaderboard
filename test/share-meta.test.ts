import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSocialCrawler,
  isIndexerCrawler,
  isShareCrawler,
  parseShareRoute,
  pageUrl,
  modPreviewImageUrl,
  renderShareHtml,
} from '../web/functions/lib/share-meta.ts';

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
