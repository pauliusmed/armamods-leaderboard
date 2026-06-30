import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildScenarioRanking,
  scenarioKey,
  UNKNOWN_SCENARIO,
} from '../web/functions/lib/scenario-ranking.ts';

test('scenarioKey — trims and falls back to unknown', () => {
  assert.strictEqual(scenarioKey('  Conflict  '), 'Conflict');
  assert.strictEqual(scenarioKey(null), UNKNOWN_SCENARIO);
  assert.strictEqual(scenarioKey('   '), UNKNOWN_SCENARIO);
});

test('buildScenarioRanking — ranks by total players and picks top server by SQE', () => {
  const ranking = buildScenarioRanking([
    { id: '1', name: 'Alpha', players: 40, maxPlayers: 64, scenarioName: 'Conflict', sqeRank: 5 },
    { id: '2', name: 'Beta', players: 20, maxPlayers: 64, scenarioName: 'Conflict', sqeRank: 2 },
    { id: '3', name: 'Gamma', players: 30, maxPlayers: 32, scenarioName: 'Escalation', sqeRank: 1 },
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
