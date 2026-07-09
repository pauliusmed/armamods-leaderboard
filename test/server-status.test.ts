import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBmServerStatus,
  matchesBmStatusFilter,
  isBmServerOnline,
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
