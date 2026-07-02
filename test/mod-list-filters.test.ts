import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterServerMods,
  matchesSizeFilter,
  sortServerMods,
} from '../web/src/lib/modListFilters.ts';

const mod = (partial: {
  id: string;
  name: string;
  totalPlayers?: number;
  playerRank?: number;
  serverCount?: number;
  sizeBytes?: number | null;
}) => ({
  playerRank: 999,
  serverCount: 1,
  totalPlayers: 0,
  sizeBytes: null,
  ...partial,
});

describe('matchesSizeFilter', () => {
  it('treats missing size as unknown', () => {
    assert.equal(matchesSizeFilter(null, 'unknown'), true);
    assert.equal(matchesSizeFilter(null, 'heavy'), false);
  });

  it('classifies heavy mods at 500 MB+', () => {
    const halfGb = 500 * 1024 * 1024;
    assert.equal(matchesSizeFilter(halfGb, 'heavy'), true);
    assert.equal(matchesSizeFilter(halfGb - 1, 'medium'), true);
  });
});

describe('filterServerMods', () => {
  const mods = [
    mod({ id: 'A', name: 'RHS Core', totalPlayers: 600, playerRank: 10, sizeBytes: 600 * 1024 * 1024 }),
    mod({ id: 'B', name: 'Small UI', totalPlayers: 50, playerRank: 800, sizeBytes: 5 * 1024 * 1024 }),
  ];

  it('filters by search and activity', () => {
    const out = filterServerMods(mods, {
      search: 'rhs',
      activity: 'high',
      rank: 'all',
      size: 'all',
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'A');
  });

  it('filters heavy size tier', () => {
    const out = filterServerMods(mods, {
      search: '',
      activity: 'all',
      rank: 'all',
      size: 'heavy',
    });
    assert.deepEqual(out.map((m) => m.id), ['A']);
  });
});

describe('sortServerMods', () => {
  const mods = [
    mod({ id: 'A', name: 'Zulu', totalPlayers: 10, serverCount: 2, sizeBytes: 100 }),
    mod({ id: 'B', name: 'Alpha', totalPlayers: 50, serverCount: 8, sizeBytes: 500 }),
  ];

  it('sorts by deploy count', () => {
    const out = sortServerMods(mods, 'deploy', 100);
    assert.deepEqual(out.map((m) => m.id), ['B', 'A']);
  });

  it('sorts by size ascending', () => {
    const out = sortServerMods(mods, 'size-asc', 100);
    assert.deepEqual(out.map((m) => m.id), ['A', 'B']);
  });
});
