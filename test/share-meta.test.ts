import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSocialCrawler,
  parseShareRoute,
  pageUrl,
  modPreviewImageUrl,
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

describe('isSocialCrawler', () => {
  it('detects Discord bot', () => {
    assert.equal(isSocialCrawler('Mozilla/5.0 Discordbot/2.0'), true);
  });

  it('ignores normal browsers', () => {
    assert.equal(isSocialCrawler('Mozilla/5.0 Chrome/120.0'), false);
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
