import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findServerInChunks } from '../web/functions/lib/server-lookup.ts';

const chunk = JSON.stringify([
  { id: '111', name: 'Alpha Server', mods: [] },
  { id: '222', name: 'Bravo Server', mods: [{ id: 'M1', name: 'Mod' }] },
]);

describe('findServerInChunks', () => {
  it('finds a server in shard text', () => {
    const found = findServerInChunks([chunk], '222');
    assert.equal(found?.id, '222');
    assert.equal(found?.name, 'Bravo Server');
  });

  it('returns null when id is missing', () => {
    assert.equal(findServerInChunks([chunk], '999'), null);
  });

  it('scans multiple chunks', () => {
    const other = JSON.stringify([{ id: '333', name: 'Charlie', mods: [] }]);
    const found = findServerInChunks([chunk, other], '333');
    assert.equal(found?.name, 'Charlie');
  });
});
