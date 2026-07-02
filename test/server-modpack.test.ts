import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesConsoleFilter,
  serverConsoleFit,
  serverModpackBytes,
} from '../web/src/lib/serverModpack.ts';
import type { Server } from '../web/src/types.ts';

const server = (partial: Partial<Server> & Pick<Server, 'id' | 'name'>): Server => ({
  ip: null,
  port: null,
  players: 10,
  maxPlayers: 64,
  mods: [],
  ...partial,
});

describe('serverModpackBytes', () => {
  it('returns 0 for vanilla servers', () => {
    assert.equal(serverModpackBytes(server({ id: '1', name: 'V', mods: [] })), 0);
  });

  it('returns null when mods exist but size is missing', () => {
    const s = server({ id: '2', name: 'X', mods: [{ id: 'A', name: 'A', playerRank: 1, serverRank: 1, overallRank: 1, serverCount: 1, totalPlayers: 1 }] });
    assert.equal(serverModpackBytes(s), null);
  });
});

describe('serverConsoleFit', () => {
  const limit = 25 * 1024 ** 3;

  it('marks small modpack as fits', () => {
    const s = server({
      id: '3',
      name: 'Light',
      mods: [{ id: 'A', name: 'A', playerRank: 1, serverRank: 1, overallRank: 1, serverCount: 1, totalPlayers: 1 }],
      modpackEstimatedBytes: 10 * 1024 ** 3,
    });
    assert.equal(serverConsoleFit(s, limit), 'fits');
  });

  it('marks large modpack as over', () => {
    const s = server({
      id: '4',
      name: 'Heavy',
      mods: [{ id: 'A', name: 'A', playerRank: 1, serverRank: 1, overallRank: 1, serverCount: 1, totalPlayers: 1 }],
      modpackEstimatedBytes: 30 * 1024 ** 3,
    });
    assert.equal(serverConsoleFit(s, limit), 'over');
  });
});

describe('matchesConsoleFilter', () => {
  it('filters ps5-fit servers including vanilla', () => {
    const vanilla = server({ id: 'v', name: 'Vanilla', mods: [] });
    const fits = server({
      id: 'f',
      name: 'Fits',
      mods: [{ id: 'A', name: 'A', playerRank: 1, serverRank: 1, overallRank: 1, serverCount: 1, totalPlayers: 1 }],
      modpackEstimatedBytes: 20 * 1024 ** 3,
    });
    const heavy = server({
      id: 'h',
      name: 'Heavy',
      mods: [{ id: 'B', name: 'B', playerRank: 1, serverRank: 1, overallRank: 1, serverCount: 1, totalPlayers: 1 }],
      modpackEstimatedBytes: 40 * 1024 ** 3,
    });
    assert.equal(matchesConsoleFilter(vanilla, 'ps5'), true);
    assert.equal(matchesConsoleFilter(fits, 'ps5'), true);
    assert.equal(matchesConsoleFilter(heavy, 'ps5'), false);
  });
});
