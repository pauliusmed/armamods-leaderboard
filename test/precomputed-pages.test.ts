import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRECOMPUTED_MODS_PAGE_SIZE,
  precomputedModsCacheKey,
  precomputedModsSliceParams,
  precomputedServersCacheKey,
  precomputedServersParams,
  precomputedStatsCacheKey,
} from '../web/functions/lib/precomputed-pages.ts';

describe('collector precomputed keys', () => {
  it('raktai nesikerta su esamais cache:mods:*, cache:servers:* shards', () => {
    assert.equal(precomputedModsCacheKey('reforger'), 'cache:page:mods:reforger:default');
    assert.ok(!precomputedModsCacheKey('reforger').startsWith('cache:mods:'));
    assert.equal(precomputedServersCacheKey('reforger'), 'cache:page:servers:reforger:default');
    assert.ok(!precomputedServersCacheKey('reforger').startsWith('cache:servers:'));
    assert.equal(precomputedStatsCacheKey('reforger'), 'cache:page:stats:reforger');
  });

  it('mods default plokštė = tik 24-aligned overall asc (fallback kitu atveju)', () => {
    const hit = precomputedModsSliceParams({
      game: 'reforger',
      sortBy: 'overall',
      sortDir: 'asc',
      search: '',
      playerFilter: 'all',
      limit: PRECOMPUTED_MODS_PAGE_SIZE,
      offset: 0,
    });
    assert.ok(hit && hit.pageIndex === 0);

    assert.equal(
      precomputedModsSliceParams({
        game: 'arma3',
        sortBy: 'overall',
        sortDir: 'asc',
        search: '',
        playerFilter: 'all',
        limit: 24,
        offset: 0,
      } as any),
      null
    );
  });

  it('servers default plokštė – tik 200/0 be paieškos', () => {
    assert.equal(precomputedServersParams({ game: 'reforger', search: '', limit: 200, offset: 0 }), true);
    assert.equal(precomputedServersParams({ game: 'reforger', search: 'EU', limit: 200, offset: 0 }), false);
  });
});
