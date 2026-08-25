import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchHaystack,
  buildSearchIndexEntry,
  mergeSearchIndex,
  indexEntryMatches,
  tokenizeSearchQuery,
  searchModsInIndex,
  modsSearchIndexCacheKey,
  MODS_SEARCH_DESCRIPTION_SNIPPET_CHARS,
} from '../web/functions/lib/mods-search-index.ts';

const entry = (id: string, h: string) => ({ id, h });

describe('mods-search-index haystack', () => {
  it('lowercases and joins name, author, summary, description', () => {
    const h = buildSearchHaystack({
      name: 'WCS Armaments',
      author: ' WCS Team',
      summary: 'Weapons Pack',
      description: 'Includes Rifles',
    });
    assert.equal(h, 'wcs armaments\n wcs team\nweapons pack\nincludes rifles');
  });

  it('truncates long descriptions to the snippet budget', () => {
    const h = buildSearchHaystack({ description: 'x'.repeat(1000) });
    // 3 newline separators + capped description text
    assert.equal(h.length, MODS_SEARCH_DESCRIPTION_SNIPPET_CHARS + 3);
  });

  it('tolerates missing fields', () => {
    assert.equal(buildSearchHaystack({}), '\n\n\n');
    assert.equal(buildSearchHaystack({ name: null, author: undefined }), '\n\n\n');
  });
});

describe('mods-search-index merge', () => {
  it('inserts, overwrites by id, and prunes ids no longer listed', () => {
    const prev = [entry('DEADC0DE1', 'old'), entry('DEADC0DE2', 'keep me')];
    const updates = new Map([
      ['deadc0de1', { name: 'Fresh' }],
      ['DEADC0DE3', { name: 'Newcomer' }],
    ]);
    const merged = mergeSearchIndex(prev, updates, ['deadc0de1', 'DEADC0DE2', 'deadc0de3']);
    assert.deepEqual(
      merged.map((e) => e.id),
      ['DEADC0DE1', 'DEADC0DE2', 'DEADC0DE3']
    );
    assert.equal(merged[0].h.includes('fresh'), true);
    assert.equal(merged[1].h, 'keep me');
  });

  it('returns previous untouched when no updates warmed this run', () => {
    const prev = [entry('A', 'alpha')];
    assert.equal(mergeSearchIndex(prev, new Map(), ['a']), prev);
    assert.deepEqual(mergeSearchIndex(null, new Map(), ['a']), []);
  });
});

describe('mods-search-index matching', () => {
  const index = [
    entry('DEADC0DE1', 'wcs armaments\nwcs team\nweapons pack\nvietnam era rifles'),
    entry('DEADC0DE2', 'jungle map\ndev\nlush terrain for ps5'),
  ];

  it('tokenizes query with AND semantics, case-insensitive', () => {
    assert.deepEqual(tokenizeSearchQuery('  Vietnam   RIFLES '), ['vietnam', 'rifles']);
    assert.equal(indexEntryMatches(index[0], ['vietnam', 'rifles']), true);
    assert.equal(indexEntryMatches(index[0], ['vietnam', 'ps5']), false);
  });

  it('finds mods by description phrases not present in the name', () => {
    const hits = searchModsInIndex(index, 'lush terrain');
    assert.deepEqual([...hits], ['DEADC0DE2']);
  });

  it('requires all tokens to match', () => {
    assert.equal(searchModsInIndex(index, 'wcs vietnam').size, 1);
    assert.equal(searchModsInIndex(index, 'wcs ps5').size, 0);
  });

  it('returns empty set for empty query or missing index', () => {
    assert.equal(searchModsInIndex(index, '   ').size, 0);
    assert.equal(searchModsInIndex(null, 'vietnam').size, 0);
  });
});

describe('mods-search-index cache key', () => {
  it('is per-game', () => {
    assert.equal(modsSearchIndexCacheKey('reforger'), 'cache:mods_search_index:reforger');
  });
});
