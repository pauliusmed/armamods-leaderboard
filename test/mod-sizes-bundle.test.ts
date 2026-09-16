import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applySizesFromBundle,
  buildModSizesBundle,
  modSizesBundleCacheKey,
  MOD_SIZES_BUNDLE_TTL_SECONDS,
  type ModSizesBundle,
} from '../web/functions/lib/mod-sizes-bundle.ts';

describe('mod sizes bundle — raktažodžiai', () => {
  it('raktas atskirame cache:bundle: vardų erdvėje, per game', () => {
    assert.equal(modSizesBundleCacheKey('reforger'), 'cache:bundle:modsizes:reforger');
    assert.equal(modSizesBundleCacheKey('arma3'), 'cache:bundle:modsizes:arma3');
    assert.ok(!modSizesBundleCacheKey('reforger').startsWith('cache:mod-size:'));
  });

  it('TTL sutampa su modfields bundle (25h — kolektorius bėga dažniau)', () => {
    assert.equal(MOD_SIZES_BUNDLE_TTL_SECONDS, 90000);
  });
});

describe('mod sizes bundle — buildModSizesBundle', () => {
  it('iš tuščio: sukuria įrašus tik iš teigiamų dydžių, id uppercasinamas', () => {
    const bundle = buildModSizesBundle(
      [
        { id: 'abc', sizeBytes: 1234 },
        { id: 'def', sizeBytes: 0 },
        { id: 'ghi', sizeBytes: null },
      ],
      null
    );
    assert.deepEqual(bundle.sizes, { ABC: 1234 });
  });

  it('merge: naujas teigiamas perrašo seną, nežinomas (null) palieka seną', () => {
    const existing: ModSizesBundle = { generatedAt: '2026-09-15T00:00:00Z', sizes: { ABC: 1000, DEF: 2000 } };
    const bundle = buildModSizesBundle(
      [
        { id: 'abc', sizeBytes: 1500 },
        { id: 'def', sizeBytes: null },
      ],
      existing
    );
    assert.equal(bundle.sizes.ABC, 1500);
    assert.equal(bundle.sizes.DEF, 2000);
  });

  it('ilgoji uoda: įrašai, kurių nėra updates, NEIŠMETAMI iš bundle', () => {
    const existing: ModSizesBundle = { generatedAt: 'x', sizes: { ABC: 1000, LONGTAIL: 42 } };
    const bundle = buildModSizesBundle([{ id: 'abc', sizeBytes: 1000 }], existing);
    assert.equal(bundle.sizes.LONGTAIL, 42);
  });

  it('ne-finisinės / neigiamos reikšmės ignoruojamos', () => {
    const existing: ModSizesBundle = { generatedAt: 'x', sizes: { ABC: 1000 } };
    const bundle = buildModSizesBundle(
      [
        { id: 'abc', sizeBytes: Number.NaN },
        { id: 'abc', sizeBytes: -5 },
      ],
      existing
    );
    assert.equal(bundle.sizes.ABC, 1000);
  });
});

describe('mod sizes bundle — applySizesFromBundle', () => {
  const bundle: ModSizesBundle = {
    generatedAt: '2026-09-16T00:00:00Z',
    sizes: { ABC: 1234, DEF: 0, GHI: -5 },
  };

  it('pripildo tik rows be teigiamo dydžio; esamos reikšmės neliečiamos', () => {
    const rows = [
      { id: 'abc', sizeBytes: null },
      { id: 'def', sizeBytes: 999 },
      { id: 'xyz', sizeBytes: undefined },
    ];
    const applied = applySizesFromBundle(bundle, rows);
    assert.equal(applied, 1);
    assert.equal(rows[0].sizeBytes, 1234);
    assert.equal(rows[1].sizeBytes, 999);
    assert.equal(rows[2].sizeBytes, undefined);
  });

  it('bundle įrašai su ≤0 / ne-finisiniais dydžiais taikomi kaip neegzistuojantys', () => {
    const rows = [
      { id: 'def', sizeBytes: null },
      { id: 'ghi', sizeBytes: null },
    ];
    const applied = applySizesFromBundle(bundle, rows);
    assert.equal(applied, 0);
    assert.equal(rows[0].sizeBytes, null);
    assert.equal(rows[1].sizeBytes, null);
  });

  it('id normalizuojamas į uppercase (leaderboard GUID raidžių dydis maišomas)', () => {
    const rows = [{ id: 'abc', sizeBytes: null }];
    applySizesFromBundle(bundle, rows);
    assert.equal(rows[0].sizeBytes, 1234);
  });
});
