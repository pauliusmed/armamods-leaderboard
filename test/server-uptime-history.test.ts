import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeServerHistorySnapshot,
  uptimeRatioFromSnapshot,
  classifyUptime,
  buildOfflineBands,
  UPTIME_OFFLINE_THRESHOLD,
} from '../web/functions/lib/server-uptime-history.ts';

describe('mergeServerHistorySnapshot', () => {
  it('accumulates online samples within a day bucket', () => {
    let row = mergeServerHistorySnapshot(undefined, { rank: 10, players: 5, online: true });
    row = mergeServerHistorySnapshot(row, { rank: 8, players: 20, online: false });
    row = mergeServerHistorySnapshot(row, { rank: 9, players: 15, online: true });

    assert.equal(row.on, 2);
    assert.equal(row.n, 3);
    assert.equal(row.players, 20);
    assert.equal(row.rank, 8);
  });
});

describe('classifyUptime', () => {
  it('marks day offline when fewer than half of samples were online', () => {
    const ratio = 2 / 5;
    assert.ok(ratio < UPTIME_OFFLINE_THRESHOLD);
    assert.equal(classifyUptime({ on: 2, n: 5 }), 'offline');
  });

  it('treats brief restart as still online day when majority scans are up', () => {
    assert.equal(classifyUptime({ on: 11, n: 12 }), 'online');
  });

  it('uses hourly boolean when no aggregate counts', () => {
    assert.equal(classifyUptime({ online: false }), 'offline');
    assert.equal(classifyUptime({ online: true }), 'online');
  });
});

describe('buildOfflineBands', () => {
  it('groups contiguous mostly-offline days', () => {
    const bands = buildOfflineBands([
      { time: '2026-07-01', mostlyOffline: true },
      { time: '2026-07-02', mostlyOffline: true },
      { time: '2026-07-03', mostlyOffline: false },
      { time: '2026-07-04', mostlyOffline: true },
    ]);
    assert.equal(bands.length, 2);
    assert.deepEqual(bands[0], { x1: '2026-07-01', x2: '2026-07-03' });
    assert.deepEqual(bands[1], { x1: '2026-07-04', x2: '2026-07-04' });
  });
});

describe('uptimeRatioFromSnapshot', () => {
  it('returns null for legacy rank-only rows', () => {
    assert.equal(uptimeRatioFromSnapshot({ rank: 1 } as any), null);
  });
});
