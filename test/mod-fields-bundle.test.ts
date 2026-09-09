import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  applyModFieldsToRows,
  buildModFieldsBundle,
  clearModFieldsModuleCache,
  loadModFieldsBundle,
  modFieldsBundleCacheKey,
  type ModFieldsBundle,
} from '../web/functions/lib/mod-fields-bundle.ts';

describe('mod fields bundle — raktažodžiai', () => {
  it('raktas atskirame cache:bundle: vardų erdvėje, nesikerta su per-mod raktalais', () => {
    assert.equal(modFieldsBundleCacheKey('reforger'), 'cache:bundle:modfields:reforger');
    assert.ok(!modFieldsBundleCacheKey('reforger').startsWith('cache:mod-author:'));
  });
});

describe('mod fields bundle — buildModFieldsBundle', () => {
  it('iš tuščio: sukuria įrašus tik iš pateiktų šaltinių', () => {
    const bundle = buildModFieldsBundle(
      [
        { id: 'abc', author: 'Maker' },
        { id: 'def', author: null, thumbnail: 'https://cdn/img.webp' },
      ],
      null
    );
    assert.deepEqual(bundle.mods.ABC, { a: 'Maker' });
    assert.deepEqual(bundle.mods.DEF, { a: null, t: 'https://cdn/img.webp' });
  });

  it('merge: undefined laukai neperrašo senų reikšmių, nauji perrašo', () => {
    const existing: ModFieldsBundle = {
      generatedAt: '2026-09-08T00:00:00Z',
      mods: {
        ABC: { a: 'SenasAutorius', t: 'https://cdn/senas.webp', s: 'available', c: '2026-09-01T00:00:00Z' },
      },
    };
    const bundle = buildModFieldsBundle(
      [
        // author atnaujintas, thumb nežinomas (undefined) — senas turi likti.
        { id: 'abc', author: 'NaujasAutorius' },
        // status atnaujintas į unavailable su checkedAt.
        { id: 'abc', workshopStatus: 'unavailable', workshopStatusCheckedAt: '2026-09-09T00:00:00Z' },
      ],
      existing
    );
    assert.equal(bundle.mods.ABC.a, 'NaujasAutorius');
    assert.equal(bundle.mods.ABC.t, 'https://cdn/senas.webp');
    assert.equal(bundle.mods.ABC.s, 'unavailable');
    assert.equal(bundle.mods.ABC.c, '2026-09-09T00:00:00Z');
  });

  it('neatpažintas status verčiamas į unknown, neįrašomas kaip laisvas tekstas', () => {
    const bundle = buildModFieldsBundle(
      [{ id: 'xyz', workshopStatus: 'weird-value' }],
      null
    );
    assert.deepEqual(bundle.mods.XYZ, { s: 'unknown', c: null });
  });
});

describe('mod fields bundle — applyModFieldsToRows', () => {
  const bundle: ModFieldsBundle = {
    generatedAt: '2026-09-09T00:00:00Z',
    mods: {
      ABC: { a: 'Maker', t: 'https://cdn/thumb.webp', s: 'available', c: '2026-09-08T00:00:00Z' },
      DEF: { a: null },
    },
  };

  it('pripildo tik undefined laukus; esamos reikšmės neliečiamos', () => {
    const rows = [
      { id: 'abc', author: undefined, thumbnail: undefined, workshopStatus: undefined, workshopStatusCheckedAt: undefined },
      { id: 'def', author: 'JauYra', thumbnail: undefined, workshopStatus: undefined, workshopStatusCheckedAt: undefined },
    ];
    applyModFieldsToRows(bundle, rows);
    assert.equal(rows[0].author, 'Maker');
    assert.equal(rows[0].thumbnail, 'https://cdn/thumb.webp');
    assert.equal(rows[0].workshopStatus, 'available');
    assert.equal(rows[0].workshopStatusCheckedAt, '2026-09-08T00:00:00Z');
    // author jau buvo — bundle neperrašo; kiti laukai DEF įraše nėra.
    assert.equal(rows[1].author, 'JauYra');
    assert.equal(rows[1].thumbnail, undefined);
    assert.equal(rows[1].workshopStatus, undefined);
  });

  it('modui be bundle įrašo niekas nekeičiama', () => {
    const rows = [{ id: 'nope', author: undefined, workshopStatus: 'available' }];
    applyModFieldsToRows(bundle, rows);
    assert.equal(rows[0].author, undefined);
    assert.equal(rows[0].workshopStatus, 'available');
  });

  it('id normalizuojamas į uppercase (leaderboard GUID raidžių dydis maišomas)', () => {
    const rows = [{ id: 'abc', author: undefined, thumbnail: undefined, workshopStatus: undefined, workshopStatusCheckedAt: undefined }];
    applyModFieldsToRows(bundle, rows);
    assert.equal(rows[0].author, 'Maker');
  });
});

describe('mod fields bundle — loadModFieldsBundle', () => {
  beforeEach(() => clearModFieldsModuleCache());

  it('skaito iš KV ir kešuojama modulio lygyje (antras call be KV)', async () => {
    let reads = 0;
    const kv = {
      get: async (key: string) => {
        reads++;
        assert.equal(key, 'cache:bundle:modfields:reforger');
        return { generatedAt: 'x', mods: { ABC: { a: 'Maker' } } };
      },
    } as unknown as KVNamespace;
    const b1 = await loadModFieldsBundle(kv);
    const b2 = await loadModFieldsBundle(kv);
    assert.equal(b1?.mods.ABC.a, 'Maker');
    assert.equal(b2?.mods.ABC.a, 'Maker');
    assert.equal(reads, 1);
  });

  it('suvargėjęs / sugedęs bundle → null (worker kris į seną per-mod kelią)', async () => {
    const kv = {
      get: async () => null,
    } as unknown as KVNamespace;
    assert.equal(await loadModFieldsBundle(kv), null);
  });
});
