import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildScenarioRanking,
  classifyScenarioGroup,
  resolveScenarioMod,
  scenarioKey,
  UNKNOWN_SCENARIO,
} from '../web/functions/lib/scenario-ranking.ts';
import { matchOfficialScenario } from '../web/functions/lib/official-scenarios.ts';

test('scenarioKey — trims and falls back to unknown', () => {
  assert.strictEqual(scenarioKey('  Conflict  '), 'Conflict');
  assert.strictEqual(scenarioKey(null), UNKNOWN_SCENARIO);
  assert.strictEqual(scenarioKey('   '), UNKNOWN_SCENARIO);
});

test('buildScenarioRanking — ranks by total players and picks top server by SQE', () => {
  const ranking = buildScenarioRanking([
    { id: '1', name: 'Alpha', players: 40, maxPlayers: 64, scenarioName: 'Conflict', sqeRank: 5, mods: [] },
    { id: '2', name: 'Beta', players: 20, maxPlayers: 64, scenarioName: 'Conflict', sqeRank: 2, mods: [] },
    { id: '3', name: 'Gamma', players: 30, maxPlayers: 32, scenarioName: 'Escalation', sqeRank: 1, mods: [] },
  ]);

  assert.strictEqual(ranking.length, 2);
  assert.strictEqual(ranking[0].name, 'Conflict');
  assert.strictEqual(ranking[0].rank, 1);
  assert.strictEqual(ranking[0].totalPlayers, 60);
  assert.strictEqual(ranking[0].serverCount, 2);
  assert.strictEqual(ranking[0].topServer?.id, '2');
  assert.strictEqual(ranking[1].name, 'Escalation');
  assert.strictEqual(ranking[1].rank, 2);
});

test('matchOfficialScenario — #AR- Everon Conflict', () => {
  const match = matchOfficialScenario('#AR-Campaign_ScenarioName_Everon');
  assert.ok(match);
  assert.strictEqual(match?.slug, 'conflict-everon');
});

test('resolveScenarioMod — workshop scenario mod on all group servers', () => {
  const modId = '61557578724DBE60';
  const servers = [
    {
      id: '1',
      name: 'A',
      players: 10,
      maxPlayers: 64,
      scenarioName: 'WCS_Serhiivka',
      mods: [
        { id: modId, name: 'WCS_Serhiivka' },
        { id: 'AAA', name: 'RHS' },
      ],
    },
    {
      id: '2',
      name: 'B',
      players: 20,
      maxPlayers: 64,
      scenarioName: 'WCS_Serhiivka',
      mods: [
        { id: modId, name: 'WCS_Serhiivka' },
        { id: 'BBB', name: 'ACE' },
      ],
    },
    {
      id: '3',
      name: 'C',
      players: 5,
      maxPlayers: 64,
      scenarioName: 'Other',
      mods: [{ id: modId, name: 'WCS_Serhiivka' }],
    },
  ];

  const global = new Map<string, number>([
    [modId, 3],
    ['AAA', 1],
    ['BBB', 1],
  ]);

  const resolved = resolveScenarioMod(servers.slice(0, 2), global);
  assert.ok(resolved);
  assert.strictEqual(resolved?.modId, modId);
  assert.strictEqual(resolved?.confidence, 1);
});

test('classifyScenarioGroup — official before workshop', () => {
  const result = classifyScenarioGroup(
    '#AR-Campaign_ScenarioName_Everon',
    [{ id: '1', name: 'S', players: 1, maxPlayers: 32, scenarioName: '#AR-Campaign_ScenarioName_Everon', mods: [{ id: 'X', name: 'RHS' }] }],
    new Map([['X', 100]]),
  );
  assert.strictEqual(result.kind, 'official');
  assert.strictEqual(result.officialSlug, 'conflict-everon');
});

test('buildScenarioRanking — enriches workshop and official kinds', () => {
  const ranking = buildScenarioRanking([
    {
      id: '1',
      name: 'S1',
      players: 50,
      maxPlayers: 64,
      scenarioName: 'WCS_Serhiivka',
      mods: [{ id: '61557578724DBE60', name: 'WCS_Serhiivka' }],
    },
    {
      id: '2',
      name: 'S2',
      players: 30,
      maxPlayers: 64,
      scenarioName: '#AR-Campaign_ScenarioName_Everon',
      mods: [],
    },
  ]);

  const workshop = ranking.find((r) => r.name === 'WCS_Serhiivka');
  const official = ranking.find((r) => r.name === '#AR-Campaign_ScenarioName_Everon');

  assert.strictEqual(workshop?.kind, 'workshop');
  assert.strictEqual(workshop?.modId, '61557578724DBE60');
  assert.strictEqual(official?.kind, 'official');
  assert.strictEqual(official?.officialSlug, 'conflict-everon');
});
