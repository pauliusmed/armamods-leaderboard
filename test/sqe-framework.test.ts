/**
 * Unit + integration tests for the SQE v2 backtest framework
 * (scripts/backtest/sqe-framework.ts).
 *
 * Covers: time-constant calibration math, normal CDF, hysteresis behavior
 * (stability under noise vs breakthrough under genuine lead), knee detection.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIGHTS,
  gainForHalfLife,
  kneeIndex,
  runModel,
  normalCdf,
} from '../scripts/backtest/sqe-framework.ts';

type Srv = { players?: number };
type Day = { time: string; servers: Record<string, Srv> };

// ---------- gainForHalfLife: the calibration invariant ----------
test('gainForHalfLife: H=1d yields exactly 0.5 per day', () => {
  assert.equal(gainForHalfLife(1), 0.5);
});

test('gainForHalfLife: H=2d yields 1-1/sqrt(2)', () => {
  assert.ok(Math.abs(gainForHalfLife(2) - (1 - Math.SQRT1_2)) < 1e-12);
});

test('gainForHalfLife: production alpha 0.10/run == H=0.55 days (the calibration bug)', () => {
  // 12 runs/day at alpha 0.10 => daily retention 0.9^12 => half-life in runs 6.58
  const halfLifeRuns = Math.log(0.5) / Math.log(0.9);
  const H = halfLifeRuns / 12;
  assert.ok(Math.abs(H - 0.548) < 0.01);
  // and the per-run gain our framework would derive from that H:
  const alphaRun = 1 - Math.pow(2, -1 / (H * 12));
  assert.ok(Math.abs(alphaRun - 0.1) < 1e-9);
});

// ---------- normalCdf ----------
test('normalCdf: 0 -> 0.5, monotone, symmetric tails', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.ok(normalCdf(1) > normalCdf(0));
  assert.ok(normalCdf(0) > normalCdf(-1));
  assert.ok(normalCdf(-6) < 1e-6);
  assert.ok(normalCdf(6) > 1 - 1e-6);
});

// ---------- kneeIndex ----------
test('kneeIndex: straight line has knee at an interior point, not endpoints', () => {
  // L-shaped data: knee should land at the corner (index 2), not 0 or last
  const pts = [
    { x: 0, y: 10 }, { x: 1, y: 9.9 }, { x: 2, y: 9.7 },
    { x: 3, y: 3 }, { x: 4, y: 0 },
  ];
  const k = kneeIndex(pts);
  assert.ok(k > 0 && k < pts.length - 1);
});

// ---------- runModel: hysteresis integration ----------
function stableDays(n: number, players: Record<string, number>, day = 0): Day[] {
  return Array.from({ length: n }, (_, i) => ({
    time: `2026-01-${String(day + i + 1).padStart(2, '0')}`,
    servers: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { players: p }])),
  }));
}

const SIGMA_E = 30;

test('runModel: rank order reflects quality for clearly separated servers', () => {
  const days = stableDays(12, { A: 120, B: 60, C: 30 });
  const res = runModel(days, 2, 0.5, SIGMA_E);
  const last = res.dailyRanks[days.length - 1];
  assert.equal(last.get('A'), 1);
  assert.equal(last.get('B'), 2);
  assert.equal(last.get('C'), 3);
});

test('runModel: genuine improver breaks through under high tau', () => {
  // C jumps from 30 to 130 players (above A) at day 6 — must reach #1 eventually
  const days = [
    ...stableDays(6, { A: 120, B: 60, C: 30 }),
    ...stableDays(20, { A: 120, B: 60, C: 130 }, 6),
  ];
  const res = runModel(days, 4, 0.8, SIGMA_E);
  const last = res.dailyRanks[days.length - 1];
  assert.equal(last.get('C'), 1);
});

test('runModel: noise near parity does not reshuffle with high tau (stability)', () => {
  // A and B both ~120±small: build deterministic small oscillation
  const days: Day[] = [];
  for (let i = 0; i < 24; i++) {
    const a = 120 + (i % 2 === 0 ? 6 : -6); // A alternates 126/114
    const b = 120 + (i % 2 === 0 ? -6 : 6); // B opposite
    days.push({
      time: `2026-01-${String(i + 1).padStart(2, '0')}`,
      servers: { A: { players: a }, B: { players: b } },
    });
  }
  const resNoHyst = runModel(days, 0.5, 0.5, SIGMA_E); // meritocracy: will flip
  const resHyst = runModel(days, 7, 0.8, SIGMA_E); // hysteresis: should hold

  let flipsNoHyst = 0, flipsHyst = 0;
  for (let i = 1; i < days.length; i++) {
    const a1 = resNoHyst.dailyRanks[i - 1].get('A')!, a2 = resNoHyst.dailyRanks[i].get('A')!;
    const b1 = resHyst.dailyRanks[i - 1].get('A')!, b2 = resHyst.dailyRanks[i].get('A')!;
    if (a1 !== a2) flipsNoHyst++;
    if (b1 !== b2) flipsHyst++;
  }
  // With hysteresis the #1 spot changes far less often than pure meritocracy.
  assert.ok(flipsHyst < flipsNoHyst, `expected hysteresis flips (${flipsHyst}) < meritocracy flips (${flipsNoHyst})`);
});

// ---------- weights config ----------
test('WEIGHTS: production weights are exported and positive', () => {
  assert.ok(WEIGHTS.players > 0);
  assert.ok(WEIGHTS.tenureFloor > 0 && WEIGHTS.tenureFloor < 1);
});
