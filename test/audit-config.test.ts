import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseServerConfig,
  classifyModAudit,
  avgPlayersInRange,
  buildModAuditRow,
  analyzeTrend,
  pickAlternatives,
  sortAuditRowsWorstFirst,
  buildClassificationHint,
  resolveModDisplayName,
} from '../web/functions/api/audit-config.ts';

describe('parseServerConfig', () => {
  it('parses game.mods array', () => {
    const mods = parseServerConfig({
      game: { mods: [{ modId: '612f512cd4cb21d5', name: 'Earplugs' }] },
    });
    assert.equal(mods.length, 1);
    assert.equal(mods[0].modId, '612F512CD4CB21D5');
  });

  it('parses modId-only lines without name', () => {
    const mods = parseServerConfig(`
986617DEA6741547
612F512CD4CB21D5
not-a-valid-id
`);
    assert.equal(mods.length, 2);
    assert.equal(mods[0].modId, '986617DEA6741547');
    assert.equal(mods[0].name, '986617DEA6741547');
  });

  it('parses mods[] fragment copied from middle of config', () => {
    const fragment = `
    },
    {
        "modId": "661EEDA988CC4930",
        "name": "WCS Armbands for PvE"
    },
    {
        "modId": "697AEA9D9CC89A0A",
        "name": "MBS Rank save"
    }`;
    const mods = parseServerConfig(fragment);
    assert.equal(mods.length, 2);
    assert.equal(mods[0].modId, '661EEDA988CC4930');
    assert.equal(mods[1].name, 'MBS Rank save');
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
    assert.equal(r.dropPct, 98);
  });

  it('warning when players before 1.7 but empty after update', () => {
    const trend = {
      phase: 'declining' as const,
      label: 'Still declining',
      detail: 'x',
      recentAvg: 4,
      earlyAfterAvg: 3,
    };
    const r = classifyModAudit({ beforeAvg: 80, afterAvg: 4, currentPlayers: 0, trend });
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

  it('treats a handful of players same as zero for warning', () => {
    const trend = {
      phase: 'declining' as const,
      label: 'Still declining',
      detail: 'x',
      recentAvg: 6,
      earlyAfterAvg: 4,
    };
    const r = classifyModAudit({ beforeAvg: 100, afterAvg: 8, currentPlayers: 3, trend });
    assert.equal(r.status, 'warning');
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

describe('resolveModDisplayName', () => {
  it('prefers DB name over config paste name', () => {
    const name = resolveModDisplayName(
      'AAAAAAAAAAAAAAAA',
      { totalPlayers: 1, name: 'Correct From DB' },
      undefined
    );
    assert.equal(name, 'Correct From DB');
  });

  it('falls back to modId when mod not in DB', () => {
    assert.equal(resolveModDisplayName('BBBBBBBBBBBBBBBB', null), 'BBBBBBBBBBBBBBBB');
  });
});

describe('buildModAuditRow', () => {
  it('uses DB name in audit row', () => {
    const row = buildModAuditRow(
      { modId: 'AAAAAAAAAAAAAAAA', name: 'Wrong In Config' },
      [],
      { totalPlayers: 0, serverCount: 0, name: 'Workshop Name' }
    );
    assert.equal(row.name, 'Workshop Name');
  });

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

describe('buildClassificationHint', () => {
  it('explains niche instead of warning', () => {
    const hint = buildClassificationHint({
      status: 'niche',
      beforeAvg: 8,
      earlyAfterAvg: 0,
      recentAvg: 0,
      currentPlayers: 0,
      trendPhase: 'declining',
      trendLabel: 'Still declining',
    });
    assert.match(hint ?? '', /under 15/i);
  });
});

describe('sortAuditRowsWorstFirst', () => {
  it('puts dead before warning and higher drop first', () => {
    const sorted = sortAuditRowsWorstFirst([
      {
        modId: 'AAAAAAAAAAAAAAAA',
        name: 'Ok',
        status: 'ok',
        title: '',
        detail: '',
        beforeAvg: 10,
        earlyAfterAvg: 10,
        afterAvg: 10,
        dropPct: 10,
        currentPlayers: 50,
        serverCount: 0,
        trendPhase: 'stable',
        trendLabel: '',
        trendDetail: '',
        recentAvg: 10,
        alternatives: [],
      },
      {
        modId: 'BBBBBBBBBBBBBBBB',
        name: 'Dead',
        status: 'dead',
        title: '',
        detail: '',
        beforeAvg: 200,
        earlyAfterAvg: 0,
        afterAvg: 0,
        dropPct: 99,
        currentPlayers: 0,
        serverCount: 0,
        trendPhase: 'declining',
        trendLabel: '',
        trendDetail: '',
        recentAvg: 0,
        alternatives: [],
      },
      {
        modId: 'CCCCCCCCCCCCCCCC',
        name: 'Warn',
        status: 'warning',
        title: '',
        detail: '',
        beforeAvg: 100,
        earlyAfterAvg: 5,
        afterAvg: 5,
        dropPct: 80,
        currentPlayers: 2,
        serverCount: 0,
        trendPhase: 'declining',
        trendLabel: '',
        trendDetail: '',
        recentAvg: 4,
        alternatives: [],
      },
    ]);
    assert.equal(sorted[0].status, 'dead');
    assert.equal(sorted[1].status, 'warning');
    assert.equal(sorted[2].status, 'ok');
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
