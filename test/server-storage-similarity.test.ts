import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findStorageAlternatives,
  modOverlapPercent,
} from '../web/functions/lib/server-storage-similarity.ts';

describe('modOverlapPercent', () => {
  it('returns Jaccard overlap as percent', () => {
    assert.equal(modOverlapPercent(['A', 'B', 'C'], ['B', 'C', 'D']), 50);
    assert.equal(modOverlapPercent(['A'], ['A']), 100);
    assert.equal(modOverlapPercent([], ['A']), 0);
  });
});

describe('findStorageAlternatives', () => {
  const size = (id: string, bytes: number) => new Map([[id.toUpperCase(), bytes]]);

  it('suggests a similar server that needs fewer extra mods', () => {
    const main = ['M1', 'M2'];
    const wanted = [
      {
        id: 'w1',
        name: 'Heavy Server',
        mods: [
          { id: 'M1', name: 'Core' },
          { id: 'M2', name: 'Framework' },
          { id: 'BIG', name: 'Big Pack' },
        ],
      },
    ];
    const candidates = [
      {
        id: 'alt1',
        name: 'Lite Server',
        mods: [
          { id: 'M1', name: 'Core' },
          { id: 'M2', name: 'Framework' },
          { id: 'SMALL', name: 'Small Pack' },
        ],
        players: 12,
      },
      {
        id: 'alt2',
        name: 'Unrelated',
        mods: [{ id: 'X', name: 'Other' }],
        players: 5,
      },
    ];
    const sizeById = new Map<string, number | null>([
      ['BIG', 2_000_000_000],
      ['SMALL', 100_000_000],
      ['M1', 10_000_000],
      ['M2', 10_000_000],
    ]);

    const alts = findStorageAlternatives({
      mainModIds: main,
      wantedServers: wanted,
      candidates,
      sizeById,
      minBytesSaved: 1,
    });

    assert.equal(alts.length, 1);
    assert.equal(alts[0].alternativeServerId, 'alt1');
    assert.equal(alts[0].overlapPercent, 50);
    assert.ok(alts[0].bytesSaved > 1_000_000_000);
  });

  it('ignores candidates below overlap threshold', () => {
    const alts = findStorageAlternatives({
      mainModIds: ['A'],
      wantedServers: [
        { id: 'w1', name: 'W', mods: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }] },
      ],
      candidates: [
        { id: 'c1', name: 'C', mods: [{ id: 'Z', name: 'Z' }], players: 1 },
      ],
      sizeById: size('B', 500_000_000),
      minBytesSaved: 1,
    });
    assert.equal(alts.length, 0);
  });
});
