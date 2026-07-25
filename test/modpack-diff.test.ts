import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendModpackDiffDay,
  buildModpackDiffDay,
  diffModIds,
  extractServerModChanges,
  isSuspiciousModlistDrop,
  normalizeModIds,
  type ModpackDiffDay,
  type ModsetFingerprint,
} from '../web/functions/lib/modpack-diff.ts';

describe('normalizeModIds', () => {
  it('dedupes, drops zero, sorts', () => {
    assert.deepEqual(
      normalizeModIds([{ id: 'B' }, { id: 'A' }, { id: 'B' }, { id: '0' }, { id: '' }]),
      ['A', 'B']
    );
  });
});

describe('isSuspiciousModlistDrop', () => {
  it('flags empty current after non-empty previous', () => {
    assert.equal(isSuspiciousModlistDrop(['a', 'b'], []), true);
  });

  it('flags large incomplete drop', () => {
    const prev = Array.from({ length: 20 }, (_, i) => `m${i}`);
    assert.equal(isSuspiciousModlistDrop(prev, prev.slice(0, 4)), true);
  });

  it('allows normal churn', () => {
    assert.equal(isSuspiciousModlistDrop(['a', 'b', 'c'], ['a', 'b', 'd']), false);
  });
});

describe('diffModIds', () => {
  it('returns added and removed with names', () => {
    const names = new Map([
      ['a', 'Alpha'],
      ['b', 'Beta'],
      ['c', 'Charlie'],
    ]);
    const d = diffModIds(['a', 'b'], ['b', 'c'], names);
    assert.deepEqual(d, {
      a: [{ id: 'c', name: 'Charlie' }],
      r: [{ id: 'a', name: 'Alpha' }],
    });
  });

  it('returns null on suspicious drop', () => {
    const prev = Array.from({ length: 12 }, (_, i) => `m${i}`);
    assert.equal(diffModIds(prev, [], new Map()), null);
  });
});

describe('buildModpackDiffDay', () => {
  it('skips same-day and bootstrap', () => {
    assert.equal(buildModpackDiffDay('2026-07-25', null, {}, new Map()), null);
    const fp: ModsetFingerprint = { date: '2026-07-25', servers: { s1: ['a'] } };
    assert.equal(buildModpackDiffDay('2026-07-25', fp, { s1: ['a', 'b'] }, new Map()), null);
  });

  it('emits only changed servers', () => {
    const fp: ModsetFingerprint = {
      date: '2026-07-24',
      servers: { s1: ['a', 'b'], s2: ['x'] },
    };
    const names = new Map([
      ['a', 'A'],
      ['b', 'B'],
      ['c', 'C'],
      ['x', 'X'],
    ]);
    const built = buildModpackDiffDay(
      '2026-07-25',
      fp,
      { s1: ['b', 'c'], s2: ['x'] },
      names
    );
    assert.ok(built);
    assert.equal(built!.changedServers, 1);
    assert.deepEqual(built!.day.servers.s1, {
      a: [{ id: 'c', name: 'C' }],
      r: [{ id: 'a', name: 'A' }],
    });
    assert.equal(built!.day.servers.s2, undefined);
  });
});

describe('appendModpackDiffDay + extractServerModChanges', () => {
  it('retains ring and filters by server/calendar window', () => {
    let history: ModpackDiffDay[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    history = appendModpackDiffDay(history, {
      time: old,
      servers: { s1: { a: [{ id: 'old', name: 'Old' }], r: [] } },
    });
    history = appendModpackDiffDay(history, {
      time: yesterday,
      servers: {
        s1: { a: [], r: [{ id: '2', name: 'Two' }] },
        s2: { a: [{ id: '9', name: 'Nine' }], r: [] },
      },
    });
    history = appendModpackDiffDay(history, {
      time: yesterday,
      servers: { s1: { a: [{ id: '3', name: 'Three' }], r: [] } },
    });
    history = appendModpackDiffDay(history, {
      time: today,
      servers: { s1: { a: [{ id: '1', name: 'One' }], r: [] } },
    });

    assert.equal(history.length, 3);
    assert.equal(history[1].servers.s1.a[0].id, '3');

    const changes7 = extractServerModChanges(history, 's1', 7);
    assert.equal(changes7.length, 2);
    assert.equal(changes7[0].date, today);
    assert.equal(changes7[1].date, yesterday);
    assert.equal(changes7[1].added[0].id, '3');

    const changes30 = extractServerModChanges(history, 's1', 30);
    assert.equal(changes30.length, 3);
    assert.equal(changes30[2].added[0].id, 'old');
  });
});
