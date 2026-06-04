import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHistoryQuery, weekStartISO } from '../web/functions/api/history-query.ts';

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
