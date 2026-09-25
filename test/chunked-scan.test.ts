import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCAN_CHUNK_POOL,
  collectChunkedMatches,
  loadChunkedData,
  withFullScanSlot,
} from '../web/functions/lib/chunked-scan.ts';
import { clearModuleCache } from '../web/functions/lib/module-cache.ts';

type FakeKv = {
  get: (key: string, type?: string) => Promise<unknown>;
};

/** Fake KV: meta + chunk'ai; skaičiuoja maksimalų lygiagretų get'ų skaičių. */
function makeKv(chunks: unknown[][], delayMs = 0) {
  let inFlight = 0;
  let maxInFlight = 0;
  const kv: FakeKv = {
    async get(key: string) {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        if (key.endsWith(':meta')) return { chunks: chunks.length };
        const idx = Number(key.slice(key.lastIndexOf(':') + 1));
        return chunks[idx];
      } finally {
        inFlight--;
      }
    },
  };
  return { kv, maxInFlight: () => maxInFlight };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => clearModuleCache());

describe('loadChunkedData', () => {
  it('sulipdo visus chunk’us į vieną masyvą (eilės tvarka)', async () => {
    const { kv } = makeKv([
      [{ id: '1' }, { id: '2' }],
      [{ id: '3' }],
    ]);
    const out = await loadChunkedData(kv as never, 't:all');
    assert.deepEqual(out.map((x) => x.id), ['1', '2', '3']);
  });

  it('maxChunks=1 ima tik pirmą chunk’ą (default kelias nekrauna visko)', async () => {
    const { kv } = makeKv([[{ id: '1' }], [{ id: '2' }], [{ id: '3' }]]);
    const out = await loadChunkedData(kv as never, 't:one', 1);
    assert.deepEqual(out.map((x) => x.id), ['1']);
  });

  it('be meta grąžina tuščią', async () => {
    const kv: FakeKv = { async get() { return null; } };
    const out = await loadChunkedData(kv as never, 't:empty');
    assert.deepEqual(out, []);
  });

  it('lygiagretūs get’ai neviršija SCAN_CHUNK_POOL (peak RAM riba)', async () => {
    const chunks = Array.from({ length: 12 }, (_, i) => [{ id: String(i) }]);
    const { kv, maxInFlight } = makeKv(chunks, 5);
    const out = await loadChunkedData(kv as never, 't:pool');
    assert.equal(out.length, 12);
    assert.ok(maxInFlight() <= SCAN_CHUNK_POOL, `max in flight ${maxInFlight()} > pool`);
    assert.ok(maxInFlight() >= 2, 'tikėtasi lygiagretaus, bet ne visko iš karto');
  });

  it('pilnas scan’as (be maxChunks) praeina per serifikavimo eilę', async () => {
    let active = 0;
    let maxActive = 0;
    const slowKv: FakeKv = {
      async get(key: string) {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(5);
        active--;
        return key.endsWith(':meta') ? { chunks: 1 } : [{ id: 'x' }];
      },
    };
    await Promise.all([
      loadChunkedData(slowKv as never, 't:q1'),
      loadChunkedData(slowKv as never, 't:q2'),
    ]);
    assert.equal(maxActive, 1, 'pilni scan’ai turi vykti po vieną');
  });
});

describe('collectChunkedMatches', () => {
  it('kaupia tik sutapimus per visus chunk’us ir grąžina scanned skaičių', async () => {
    const { kv } = makeKv([
      [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Bravo' }],
      [{ id: '3', name: 'Alpha Two' }],
    ]);
    const res = await collectChunkedMatches(kv as never, 't:m', (s: { name: string }) =>
      s.name.startsWith('Alpha')
    );
    assert.equal(res.scanned, 3);
    assert.deepEqual(res.matches.map((m) => m.id), ['1', '3']);
  });

  it('scanned=0 kai nėra chunk’ų (endpoint’as grąžina tuščią be cache)', async () => {
    const kv: FakeKv = { async get() { return null; } };
    const res = await collectChunkedMatches(kv as never, 't:none', () => true);
    assert.deepEqual(res, { scanned: 0, matches: [] });
  });

  it('randa sutapimus visuose chunk’uose net kai jų daug', async () => {
    const chunks = Array.from({ length: 10 }, (_, i) => [
      { id: `${i}a`, hit: i % 2 === 0 },
      { id: `${i}b`, hit: false },
    ]);
    const { kv } = makeKv(chunks);
    const res = await collectChunkedMatches(kv as never, 't:many', (s: { hit: boolean }) => s.hit);
    assert.equal(res.scanned, 20);
    assert.equal(res.matches.length, 5);
  });
});

describe('withFullScanSlot', () => {
  it('klaidžiantis scan’as neužblokuoja kitų eilėje', async () => {
    await assert.rejects(
      withFullScanSlot(async () => {
        throw new Error('boom');
      }),
      /boom/
    );
    assert.equal(
      await withFullScanSlot(async () => 'ok'),
      'ok'
    );
  });

  it('eilė išlieka FIFO net po klaidos', async () => {
    const order: string[] = [];
    await Promise.all([
      withFullScanSlot(async () => { await sleep(10); order.push('a'); }).catch(() => {}),
      withFullScanSlot(async () => { order.push('b'); }),
      withFullScanSlot(async () => { order.push('c'); }),
    ]);
    assert.deepEqual(order, ['a', 'b', 'c']);
  });
});
