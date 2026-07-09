import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractModFromChunks, isFullModRecord } from '../web/functions/lib/mod-lookup.ts';

const chunk = JSON.stringify([
  {
    id: 'AAAAAAAAAAAAAAAA',
    name: 'Popular Mod',
    totalPlayers: 50000,
    serverCount: 900,
    overallRank: 1,
    coDeployed: [{ id: '615806DC6C57AF02', name: 'WCS_NATO', count: 100 }],
  },
  {
    id: '615806DC6C57AF02',
    name: 'WCS_NATO',
    totalPlayers: 11119,
    serverCount: 1708,
    overallRank: 24,
    marketShare: 24.3,
  },
]);

describe('extractModFromChunks', () => {
  it('returns full mod record, not co-deploy snippet embedded in another mod', () => {
    const found = extractModFromChunks([chunk], '615806DC6C57AF02');
    assert.equal(found?.name, 'WCS_NATO');
    assert.equal(found?.overallRank, 24);
    assert.equal(found?.totalPlayers, 11119);
  });

  it('matches mod id case-insensitively', () => {
    const found = extractModFromChunks([chunk], '615806dc6c57af02');
    assert.equal(found?.overallRank, 24);
  });

  it('returns null when only a co-deploy reference exists', () => {
    const coOnly = JSON.stringify([
      {
        id: 'OTHER',
        name: 'Host',
        totalPlayers: 1,
        overallRank: 99,
        coDeployed: [{ id: 'MISSINGMOD12345678', name: 'Ghost', count: 1 }],
      },
    ]);
    assert.equal(extractModFromChunks([coOnly], 'MISSINGMOD12345678'), null);
  });
});

describe('isFullModRecord', () => {
  it('rejects co-deploy snippet shape', () => {
    assert.equal(
      isFullModRecord({ id: 'ABC', name: 'X', count: 5 }, 'ABC'),
      false
    );
  });
});
