import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatGapSummary, findHistoryGaps, maxGapMsForRange } from '../web/src/lib/chartSyncGap.ts';

describe('formatGapSummary', () => {
  it('formats a single gap as a short date range', () => {
    assert.equal(formatGapSummary([{ x1: '2026-07-20', x2: '2026-07-25' }]), ' · 07/20 → 07/25');
  });

  it('appends a counter when multiple gaps exist', () => {
    const gaps = [
      { x1: '2026-07-20', x2: '2026-07-25' },
      { x1: '2026-08-01', x2: '2026-08-03' },
      { x1: '2026-08-10', x2: '2026-08-11' },
    ];
    assert.equal(formatGapSummary(gaps), ' · 07/20 → 07/25 +2');
  });

  it('returns empty string for no gaps', () => {
    assert.equal(formatGapSummary([]), '');
  });
});

describe('findHistoryGaps', () => {
  it('detects missing sample periods longer than the threshold', () => {
    const points = [
      { date: '2026-07-20', totalPlayers: 100 },
      { date: '2026-07-25', totalPlayers: 120 },
      { date: '2026-07-26', totalPlayers: 130 },
    ];
    const gaps = findHistoryGaps(points, 'date', 36 * 60 * 60 * 1000);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].x1, '2026-07-20');
    assert.equal(gaps[0].x2, '2026-07-25');
  });

  it('ignores consecutive samples within the threshold', () => {
    const points = [
      { date: '2026-07-20', totalPlayers: 100 },
      { date: '2026-07-21', totalPlayers: 120 },
      { date: '2026-07-22', totalPlayers: 130 },
    ];
    assert.equal(findHistoryGaps(points, 'date', 36 * 60 * 60 * 1000).length, 0);
  });
});

describe('maxGapMsForRange', () => {
  it('uses a shorter threshold for hourly views', () => {
    assert.equal(maxGapMsForRange(1), 5 * 60 * 60 * 1000);
  });

  it('uses a daily threshold for longer ranges', () => {
    assert.equal(maxGapMsForRange(30), 36 * 60 * 60 * 1000);
  });
});
