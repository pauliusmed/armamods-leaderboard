import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractIdsFromChunkJson,
  modDetailUrl,
  renderSitemapIndex,
  renderUrlset,
  serverDetailUrl,
  sitemapIndexEntries,
  staticSitemapUrls,
  urlsFromIds,
} from '../web/functions/lib/sitemap.ts';

describe('extractIdsFromChunkJson', () => {
  it('reads ids from a list chunk array', () => {
    const ids = extractIdsFromChunkJson(
      JSON.stringify([{ id: 'AAA' }, { id: 'BBB', name: 'Beta' }, { id: '0' }, { name: 'no-id' }])
    );
    assert.deepEqual(ids, ['AAA', 'BBB']);
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => extractIdsFromChunkJson('{'), /Invalid sitemap chunk JSON/);
  });
});

describe('urlsFromIds', () => {
  it('dedupes and builds locs', () => {
    const urls = urlsFromIds(['a', 'a', 'b'], (id) => modDetailUrl(id, 'reforger'), 'daily', 0.7);
    assert.equal(urls.length, 2);
    assert.equal(urls[0].loc, 'https://reforgermods.com/mod/a');
    assert.equal(urls[1].loc, 'https://reforgermods.com/mod/b');
  });
});

describe('detail urls', () => {
  it('prefixes arma3 theater', () => {
    assert.equal(modDetailUrl('X', 'arma3'), 'https://reforgermods.com/arma3/mod/X');
    assert.equal(serverDetailUrl('9', 'arma3'), 'https://reforgermods.com/arma3/server/9');
  });
});

describe('renderUrlset / index', () => {
  it('escapes XML entities in loc', () => {
    const xml = renderUrlset([{ loc: 'https://reforgermods.com/mod/a&b', priority: 0.5 }]);
    assert.match(xml, /a&amp;b/);
    assert.match(xml, /<urlset /);
  });

  it('renders sitemap index children', () => {
    const xml = renderSitemapIndex(sitemapIndexEntries('https://reforgermods.com', '2026-07-25'));
    assert.match(xml, /sitemap\/pages\.xml/);
    assert.match(xml, /sitemap\/mods\.xml/);
    assert.match(xml, /sitemap\/servers\.xml/);
  });

  it('includes core hub pages', () => {
    const locs = staticSitemapUrls().map((u) => u.loc);
    assert.ok(locs.includes('https://reforgermods.com/'));
    assert.ok(locs.includes('https://reforgermods.com/arma3/servers'));
    assert.ok(locs.includes('https://reforgermods.com/how-to-find-popular-arma-reforger-mods'));
    assert.ok(!locs.some((l) => l.includes('/admin')));
    assert.ok(!locs.some((l) => l.endsWith('/status') || l.includes('/status')));
  });
});
