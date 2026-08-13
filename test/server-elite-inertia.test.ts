import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEliteInertiaCushion,
  ELITE_INERTIA_TIERS,
  MIN_AGE_ELITE,
} from '../scripts/server-elite-inertia.js';

describe('applyEliteInertiaCushion', () => {
  it('applies differentiated tiers: #1 > #2 > #3', () => {
    const scores = { A: 500, B: 500, C: 500 };
    const oldLb = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    const ages = { A: 100, B: 100, C: 100 };
    const out = applyEliteInertiaCushion(scores, oldLb, ages);
    // #1 gets the largest tier, #2 less, #3 least — all cushioned above the unranked baseline.
    assert.equal(out.A, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[0])));
    assert.equal(out.B, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[1])));
    assert.equal(out.C, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[2])));
    assert.ok(out.A > out.B && out.B > out.C, 'tier cushions must be strictly ordered');
  });

  it('insulates the champion from a near-tied challenger', () => {
    // #1 and #2 both raw 500. After cushion, #1 stays ahead — previously a flat cushion
    // cancelled out and let the next run's micro-swap flip them.
    const scores = { A: 500, B: 500 };
    const oldLb = [{ id: 'A' }, { id: 'B' }];
    const ages = { A: 100, B: 100 };
    const out = applyEliteInertiaCushion(scores, oldLb, ages);
    assert.ok(out.A > out.B, 'champion #1 must rank above #2 after cushion');
  });

  it('skips servers below the elite age threshold', () => {
    const scores = { A: 500, B: 500 };
    const oldLb = [{ id: 'A' }, { id: 'B' }];
    const ages = { A: MIN_AGE_ELITE, B: MIN_AGE_ELITE - 1 };
    const out = applyEliteInertiaCushion(scores, oldLb, ages);
    assert.equal(out.A, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[0])));
    assert.equal(out.B, 500, 'under-age server keeps raw score');
  });

  it('a genuine challenger still breaks through the cushion', () => {
    // Raw #2 lead exceeds the #1 cushion margin — must overtake.
    const scores = { A: 500, B: 700 };
    const oldLb = [{ id: 'A' }, { id: 'B' }];
    const ages = { A: 100, B: 100 };
    const out = applyEliteInertiaCushion(scores, oldLb, ages);
    assert.ok(out.B > out.A, 'large genuine lead overrides champion cushion');
  });

  it('does not mutate the input scores map', () => {
    const scores = { A: 500 };
    const oldLb = [{ id: 'A' }];
    const ages = { A: 100 };
    applyEliteInertiaCushion(scores, oldLb, ages);
    assert.equal(scores.A, 500, 'input map unchanged');
  });

  it('handles null/missing leaderboard and short leaderboards gracefully', () => {
    const scores = { A: 500 };
    assert.equal(applyEliteInertiaCushion(scores, null, { A: 100 }).A, 500);
    assert.equal(applyEliteInertiaCushion(scores, undefined, { A: 100 }).A, 500);
    // Fewer entries than tiers — only existing positions cushioned.
    const out = applyEliteInertiaCushion({ A: 500 }, [{ id: 'A' }], { A: 100 });
    assert.equal(out.A, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[0])));
  });

  it('ignores leaderboard entries without a valid id or unknown servers', () => {
    const scores = { A: 500 };
    const oldLb = [{}, { id: 'B' }, { id: 'A' }];
    const out = applyEliteInertiaCushion(scores, oldLb, { A: 100 });
    // Position 0 (no id) skipped, position 1 (B not in scores) skipped, A lands at tier index 2.
    assert.equal(out.A, Math.floor(500 * (1 + ELITE_INERTIA_TIERS[2])));
  });
});
