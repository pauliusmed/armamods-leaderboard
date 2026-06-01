import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseServerConfig,
  classifyModAudit,
  avgPlayersInRange,
  buildModAuditRow,
  analyzeTrend,
  pickAlternatives,
} from '../web/functions/api/audit-config.ts';

describe('parseServerConfig', () => {
  it('parses game.mods array', () => {
    const mods = parseServerConfig({
      game: { mods: [{ modId: '612f512cd4cb21d5', name: 'Earplugs' }] },
    });
    assert.equal(mods.length, 1);
    assert.equal(mods[0].modId, '612F512CD4CB21D5');
  });
});

describe('analyzeTrend', () => {
  it('detects recovering after patch dip', () => {
    const history = [
      { date: '2026-05-20', totalPlayers: 200 },
      { date: '2026-05-27', totalPlayers: 180 },
      { date: '2026-05-29', totalPlayers: 15 },
      { date: '2026-05-30', totalPlayers: 18 },
      { date: '2026-05-31', totalPlayers: 45 },
      { date: '2026-06-01', totalPlayers: 90 },
    ];
    const t = analyzeTrend(history);
    assert.equal(t.phase, 'recovering');
  });
});

describe('classifyModAudit', () => {
  it('marks dead when popular before and zero after', () => {
    const trend = { phase: 'declining' as const, label: '', detail: '', recentAvg: 0, earlyAfterAvg: 0 };
    const r = classifyModAudit({ beforeAvg: 200, afterAvg: 2, currentPlayers: 0, trend });
    assert.equal(r.status, 'dead');
  });

  it('marks recovering ecosystem trend as ok even after a big drop', () => {
    const trend = {
      phase: 'recovering' as const,
      label: 'Recovering',
      detail: 'Usage is coming back.',
      recentAvg: 50,
      earlyAfterAvg: 5,
    };
    const r = classifyModAudit({ beforeAvg: 200, afterAvg: 2, currentPlayers: 12, trend });
    assert.equal(r.status, 'ok');
    assert.match(r.title, /Recovering/i);
  });

  it('high drop with recovering trend is ok not warning', () => {
    const trend = {
      phase: 'recovering' as const,
      label: 'Recovering',
      detail: 'After 1.7 dip, last week improved.',
      recentAvg: 19,
      earlyAfterAvg: 4,
    };
    const r = classifyModAudit({ beforeAvg: 208, afterAvg: 16, currentPlayers: 10, trend });
    assert.equal(r.status, 'ok');
    assert.equal(r.dropPct, 92);
  });

  it('warning when players before 1.7 but empty after update', () => {
    const trend = {
      phase: 'declining' as const,
      label: 'Still declining',
      detail: 'x',
      recentAvg: 2,
      earlyAfterAvg: 3,
    };
    const r = classifyModAudit({ beforeAvg: 120, afterAvg: 4, currentPlayers: 0, trend });
    assert.equal(r.status, 'warning');
    assert.match(r.title, /empty after update/i);
  });

  it('big drop but still players after 1.7 is ok not warning', () => {
    const trend = {
      phase: 'stable' as const,
      label: 'Stable',
      detail: 'x',
      recentAvg: 900,
      earlyAfterAvg: 800,
    };
    const r = classifyModAudit({ beforeAvg: 1500, afterAvg: 800, currentPlayers: 1035, trend });
    assert.equal(r.status, 'ok');
  });

  it('current zero but high recent post-patch usage is ok not warning', () => {
    const trend = {
      phase: 'stable' as const,
      label: 'Stable',
      detail: 'x',
      recentAvg: 6030,
      earlyAfterAvg: 2000,
    };
    const r = classifyModAudit({
      beforeAvg: 11040,
      afterAvg: 6030,
      currentPlayers: 0,
      trend,
    });
    assert.equal(r.status, 'ok');
  });
});

describe('pickAlternatives', () => {
  it('suggests co-deployed mods not in config', () => {
    const modMap = new Map([
      [
        'BBBBBBBBBBBBBBBB',
        { totalPlayers: 500, name: 'Alt Mod', coDeployed: [] },
      ],
    ]);
    const alts = pickAlternatives(
      'AAAAAAAAAAAAAAAA',
      {
        coDeployed: [{ id: 'BBBBBBBBBBBBBBBB', name: 'Alt Mod', count: 40 }],
      },
      modMap,
      new Set(['AAAAAAAAAAAAAAAA']),
      () => [{ date: '2026-06-01', totalPlayers: 400 }]
    );
    assert.equal(alts.length, 1);
    assert.equal(alts[0].modId, 'BBBBBBBBBBBBBBBB');
  });
});

describe('buildModAuditRow', () => {
  it('computes drop from history', () => {
    const history = [
      { date: '2026-05-20', totalPlayers: 100 },
      { date: '2026-05-25', totalPlayers: 95 },
      { date: '2026-05-27', totalPlayers: 90 },
      { date: '2026-05-29', totalPlayers: 2 },
      { date: '2026-05-30', totalPlayers: 1 },
      { date: '2026-06-01', totalPlayers: 1 },
    ];
    const row = buildModAuditRow(
      { modId: 'AAAAAAAAAAAAAAAA', name: 'Test' },
      history,
      { totalPlayers: 0, serverCount: 10 }
    );
    assert.equal(row.status, 'dead');
    assert.ok((row.dropPct ?? 0) >= 90);
  });
});

describe('avgPlayersInRange', () => {
  it('averages points in date range', () => {
    const avg = avgPlayersInRange(
      [
        { date: '2026-05-25', totalPlayers: 10 },
        { date: '2026-05-27', totalPlayers: 30 },
      ],
      '2026-05-20',
      '2026-05-28'
    );
    assert.equal(avg, 20);
  });
});
