import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { cached, clearModuleCache } from '../web/functions/lib/module-cache.ts';

describe('module-cache', () => {
  beforeEach(() => clearModuleCache());

  it('grąžina cache-intą reikšmę ir nebekviečia loaderio per TTL', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { n: calls };
    };

    const first = await cached('same-key', 1000, loader);
    const second = await cached('same-key', 1000, loader);

    assert.equal(first, second);
    assert.equal(calls, 1);
  });

  it('po TTL įkelia iš naujo', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return calls;
    };

    await cached('ttl-key', 10, loader);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const refreshed = await cached('ttl-key', 10, loader);

    assert.equal(refreshed, 2);
    assert.equal(calls, 2);
  });

  it('rejected load-as cache-as neišsaugomas', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return 'ok';
    };

    await assert.rejects(() => cached('error-key', 1000, loader));
    assert.equal(await cached('error-key', 1000, loader), 'ok');
    assert.equal(calls, 2);
  });

  it('lygiagretūs kvietimai dalinasi vienu Promise', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return calls;
    };

    const [a, b] = await Promise.all([
      cached('concurrent-key', 1000, loader),
      cached('concurrent-key', 1000, loader),
    ]);

    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(calls, 1);
  });

  it('clearModuleCache(prefix) išvalo tik prefiksą', async () => {
    let aCalls = 0;
    let bCalls = 0;
    const aLoader = async () => {
      aCalls += 1;
      return aCalls;
    };
    const bLoader = async () => {
      bCalls += 1;
      return bCalls;
    };

    await cached('prefix:a', 1000, aLoader);
    await cached('prefix:b', 1000, bLoader);
    clearModuleCache('prefix:a');
    await cached('prefix:a', 1000, aLoader);
    await cached('prefix:b', 1000, bLoader);

    assert.equal(aCalls, 2);
    assert.equal(bCalls, 1);
  });
});
