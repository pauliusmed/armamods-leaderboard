import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServerIndex } from '../web/functions/lib/server-index.ts';
import { loadScenarioServers } from '../web/functions/lib/scenario-servers.ts';
import { clearModuleCache } from '../web/functions/lib/module-cache.ts';
import { scenarioKey } from '../web/functions/lib/scenario-ranking.ts';
import worker from '../web/worker.ts';

beforeEach(() => clearModuleCache());
const chunks = Array.from({ length: 6 }, (_, shard) => [{
  id: String(shard), name: `Server ${shard}`, players: shard, maxPlayers: 64,
  scenarioName: shard === 1 || shard === 4 ? ' Target ' : 'Other',
  mods: [{ id: 'nested', name: 'Preserved mod' }], sqeRank: 6 - shard,
}]);

function fixture(game = 'reforger', legacy = false) {
  const suffix = game === 'arma3' ? ':arma3' : '';
  const base = `cache:servers${suffix}`;
  const index = buildServerIndex(chunks);
  if (legacy) delete index.scenarios;
  const entries: Record<string, unknown> = {
    [`cache:servers-index${suffix}`]: index, [`${base}:meta`]: { chunks: chunks.length },
  };
  chunks.forEach((chunk, i) => { entries[`${base}:${i}`] = chunk; });
  const gets: string[] = [];
  const kv = { async get(key: string) { gets.push(key); return entries[key] ?? null; } };
  return { kv: kv as unknown as KVNamespace, entries, gets, base };
}

test('scenario references preserve shard order, deduplicate shards and count servers', () => {
  const index = buildServerIndex([[...chunks[1], ...chunks[4]], chunks[0]]);
  assert.deepEqual(index.scenarios?.Target, { shards: [0], count: 2 });
  assert.deepEqual(index.scenarios?.Other, { shards: [1], count: 1 });
  const special = buildServerIndex([[{ id: 'x', scenarioName: '__proto__' }]]);
  assert.deepEqual(special.scenarios?.['__proto__'], { shards: [0], count: 1 });
});

for (const game of ['reforger', 'arma3'] as const) {
  test(`${game}: loads only 2 of 6 shards with full payload parity`, async () => {
    const f = fixture(game);
    const result = await loadScenarioServers(f.kv, game, 'Target');
    assert.deepEqual(result, chunks.flat().filter((s) => scenarioKey(s.scenarioName) === 'Target'));
    assert.deepEqual(f.gets, [`cache:servers-index${game === 'arma3' ? ':arma3' : ''}`,
      `${f.base}:1`, `${f.base}:4`]);
  });
}

test('unknown scenario reads no shards, including inherited object property names', async () => {
  const f = fixture();
  assert.deepEqual(await loadScenarioServers(f.kv, 'reforger', 'constructor'), []);
  assert.equal(f.gets.length, 1);
});

test('legacy snapshots preserve results through a bounded, logged scan', async () => {
  const f = fixture('reforger', true);
  assert.deepEqual(await loadScenarioServers(f.kv, 'reforger', 'Target'), [chunks[1][0], chunks[4][0]]);
  assert.equal(f.gets.filter((k) => /^cache:servers:\d+$/.test(k)).length, 6);
});

test('index/shard count skew retries with the current bounded scan', async () => {
  const f = fixture();
  f.entries[`${f.base}:4`] = [];
  f.entries[`${f.base}:5`] = [chunks[4][0]];
  const result = await loadScenarioServers(f.kv, 'reforger', 'Target');
  assert.deepEqual(result, [chunks[1][0], chunks[4][0]]);
  assert.ok(f.gets.includes(`${f.base}:5`));
});

test('transient index I/O failures propagate instead of amplifying into a full scan', async () => {
  const kv = { async get() { throw new Error('KV unavailable'); } };
  await assert.rejects(loadScenarioServers(kv as unknown as KVNamespace, 'reforger', 'Target'), /KV unavailable/);
});

test('Worker endpoint preserves sorting/payload and reuses cache across equivalent queries', async () => {
  const runtime = globalThis as typeof globalThis & { caches?: CacheStorage };
  const original = runtime.caches;
  const store = new Map<string, Response>();
  runtime.caches = { async open() { return {
    async match(request: Request) { return store.get(request.url)?.clone(); },
    async put(request: Request, response: Response) { store.set(request.url, response); },
  }; } } as unknown as CacheStorage;
  try {
    const f = fixture();
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil(promise: Promise<unknown>) { pending.push(promise); } };
    const fetchScenario = (query: string) => worker.fetch(new Request(
      `https://reforgermods.com/api/scenarios/servers?${query}`
    ), { TRENDING_KV: f.kv } as never, ctx as never);
    const response = await fetchScenario('name=Target&game=reforger');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [chunks[4][0], chunks[1][0]], meta: { total: 2, scenario: 'Target' },
    });
    await Promise.all(pending);
    const reads = f.gets.length;
    const hit = await fetchScenario('game=reforger&name=%20Target%20&utm_source=test');
    assert.equal(hit.status, 200);
    assert.equal(f.gets.length, reads);
    assert.equal(hit.headers.get('Cache-Control'), 'public, max-age=300, stale-while-revalidate=3600');
    assert.equal(hit.headers.get('X-Armamods-Public-Cache-Control'), null);
    assert.equal(store.size, 1);
  } finally {
    if (original) runtime.caches = original;
    else delete runtime.caches;
  }
});
