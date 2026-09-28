import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveHistoryQuery,
  weekStartISO,
  historyCutoffPrefix,
  firstPointTime,
} from '../web/functions/api/history-query.ts';

describe('weekStartISO', () => {
  it('returns Monday UTC for mid-week dates', () => {
    assert.equal(weekStartISO('2026-05-28'), '2026-05-25');
    assert.equal(weekStartISO('2026-05-25'), '2026-05-25');
  });

  it('rolls Sunday back to Monday of same ISO week', () => {
    assert.equal(weekStartISO('2026-05-31'), '2026-05-25');
  });
});

describe('resolveHistoryQuery', () => {
  it('uses hourly for 1 day', () => {
    const q = resolveHistoryQuery(1, 'reforger');
    assert.equal(q.baseKey, 'history:hourly:reforger');
    assert.equal(q.sliceCount, -24);
  });

  it('uses daily up to 31 days', () => {
    const q = resolveHistoryQuery(30, 'reforger');
    assert.equal(q.baseKey, 'history:daily:reforger');
    assert.equal(q.sliceCount, -30);
  });

  it('uses weekly for 1Y with monthly fallback', () => {
    const q = resolveHistoryQuery(366, 'reforger');
    assert.equal(q.baseKey, 'history:weekly:reforger');
    assert.equal(q.sliceCount, -52);
    assert.equal(q.fallbackKey, 'history:monthly:reforger');
    assert.equal(q.fallbackSlice, -12);
  });

  it('uses yearly beyond 365 days', () => {
    const q = resolveHistoryQuery(9999, 'arma3');
    assert.equal(q.baseKey, 'history:yearly:arma3');
    assert.equal(q.sliceCount, -10);
  });
});

describe('historyCutoffPrefix', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it('returns date prefix for multi-day windows', () => {
    assert.equal(historyCutoffPrefix(7, now), '2026-09-21');
    assert.equal(historyCutoffPrefix(30, now), '2026-08-29');
  });

  it('returns hour prefix for 1 day', () => {
    assert.equal(historyCutoffPrefix(1, now), '2026-09-27T12');
  });

  it('returns null for all-time sentinel and invalid values', () => {
    assert.equal(historyCutoffPrefix(9999, now), null);
    assert.equal(historyCutoffPrefix(0, now), null);
    assert.equal(historyCutoffPrefix(Number.NaN, now), null);
  });

  it('prefix sorts after older chunk times (lexicographic early-stop)', () => {
    const cutoff = historyCutoffPrefix(7, now)!;
    assert.ok('2026-09-20' < cutoff);
    assert.ok('2026-09-22' >= cutoff);
  });
});

describe('firstPointTime', () => {
  it('extracts the first time value from shard text', () => {
    assert.equal(firstPointTime('{"time":"2026-09-20","mods":{}}'), '2026-09-20');
  });

  it('returns null when no time marker exists', () => {
    assert.equal(firstPointTime('{"mods":{}}'), null);
  });
});
