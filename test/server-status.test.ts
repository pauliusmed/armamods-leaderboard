import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBmServerStatus,
  matchesBmStatusFilter,
  isBmServerOnline,
  formatBmLastSeenAt,
  describeBmLastSeenOnline,
} from '../web/functions/lib/server-status.ts';

describe('normalizeBmServerStatus', () => {
  it('passes through known BattleMetrics values', () => {
    assert.equal(normalizeBmServerStatus('online'), 'online');
    assert.equal(normalizeBmServerStatus('offline'), 'offline');
    assert.equal(normalizeBmServerStatus('dead'), 'dead');
  });

  it('maps unknown raw values to unknown', () => {
    assert.equal(normalizeBmServerStatus(''), 'unknown');
    assert.equal(normalizeBmServerStatus('foo'), 'unknown');
    assert.equal(normalizeBmServerStatus(null), 'unknown');
  });
});

describe('matchesBmStatusFilter', () => {
  it('online filter keeps only online servers', () => {
    assert.equal(matchesBmStatusFilter('online', 'online'), true);
    assert.equal(matchesBmStatusFilter('offline', 'online'), false);
    assert.equal(matchesBmStatusFilter('unknown', 'online'), false);
    assert.equal(matchesBmStatusFilter(null, 'online'), false);
  });

  it('offline filter includes non-online BM statuses', () => {
    assert.equal(matchesBmStatusFilter('offline', 'offline'), true);
    assert.equal(matchesBmStatusFilter('dead', 'offline'), true);
    assert.equal(matchesBmStatusFilter('online', 'offline'), false);
    assert.equal(matchesBmStatusFilter('unknown', 'offline'), false);
  });

  it('all filter accepts any status', () => {
    assert.equal(matchesBmStatusFilter('invalid', 'all'), true);
    assert.equal(matchesBmStatusFilter(null, 'all'), true);
  });
});

describe('isBmServerOnline', () => {
  it('is true only for online', () => {
    assert.equal(isBmServerOnline('online'), true);
    assert.equal(isBmServerOnline('offline'), false);
    assert.equal(isBmServerOnline(undefined), false);
  });
});

describe('formatBmLastSeenAt', () => {
  it('formats valid ISO timestamps', () => {
    const label = formatBmLastSeenAt('2026-07-09T20:30:00.000Z');
    assert.ok(label);
    assert.match(label!, /2026/);
  });

  it('returns null for missing or invalid values', () => {
    assert.equal(formatBmLastSeenAt(null), null);
    assert.equal(formatBmLastSeenAt('not-a-date'), null);
  });
});

describe('describeBmLastSeenOnline', () => {
  it('is null for online servers', () => {
    assert.equal(describeBmLastSeenOnline('online', '2026-07-09T20:30:00.000Z'), null);
  });

  it('includes formatted time for offline statuses', () => {
    const text = describeBmLastSeenOnline('dead', '2026-07-09T20:30:00.000Z');
    assert.ok(text?.includes('Last seen online'));
    assert.ok(text?.includes('network scan'));
  });

  it('falls back when no timestamp is stored yet', () => {
    const text = describeBmLastSeenOnline('offline', null);
    assert.ok(text?.includes('no online record'));
  });
});
