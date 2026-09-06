import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findServerInChunks,
  buildServerIndex,
  ServerLookup,
} from '../web/functions/lib/server-lookup.ts';

const chunk = JSON.stringify([
  { id: '111', name: 'Alpha Server', mods: [] },
  { id: '222', name: 'Bravo Server', mods: [{ id: 'M1', name: 'Mod' }] },
]);

describe('findServerInChunks', () => {
  it('finds a server in shard text', () => {
    const found = findServerInChunks([chunk], '222');
    assert.equal(found?.id, '222');
    assert.equal(found?.name, 'Bravo Server');
  });

  it('returns null when id is missing', () => {
    assert.equal(findServerInChunks([chunk], '999'), null);
  });

  it('scans multiple chunks', () => {
    const other = JSON.stringify([{ id: '333', name: 'Charlie', mods: [] }]);
    const found = findServerInChunks([chunk, other], '333');
    assert.equal(found?.name, 'Charlie');
  });
});

describe('buildServerIndex', () => {
  it('maps each server id to its shard', () => {
    const index = buildServerIndex([
      [{ id: '111' }, { id: '222' }],
      [{ id: '333' }],
    ]);
    assert.deepEqual(index, {
      total: 3,
      shards: 2,
      map: { '111': 0, '222': 0, '333': 1 },
    });
  });

  it('skips entries without id', () => {
    const index = buildServerIndex([[{ id: '111' }, { id: null }, {} as { id: unknown }]]);
    assert.deepEqual(index.map, { '111': 0 });
    assert.equal(index.total, 1);
  });

  it('handles empty shards', () => {
    const index = buildServerIndex([[], []]);
    assert.deepEqual(index, { total: 0, shards: 2, map: {} });
  });
});

/** Minimal KV fake — tracks every get so tests can assert how many shards were loaded. */
function makeKv(entries: Record<string, string>) {
  const gets: string[] = [];
  return {
    gets,
    get: async (key: string, type?: string) => {
      gets.push(key);
      const value = entries[key];
      if (value === undefined) return null;
      return type === 'json' ? JSON.parse(value) : value;
    },
  } as unknown as KVNamespace & { gets: string[] };
}

const SHARDS = 6;
const shardEntries: Record<string, string> = {};
for (let i = 0; i < SHARDS; i++) {
  shardEntries[`cache:servers:${i}`] = JSON.stringify([
    { id: `srv-${i}`, name: `Server ${i}`, mods: [] },
  ]);
}

/** Shard get'ai be :meta/:index rakto — tikrieji duomenų skaitymai. */
function shardGets(kv: { gets: string[] }): string[] {
  return kv.gets.filter((k) => /^cache:servers:\d+$/.test(k));
}

describe('ServerLookup — index path', () => {
  const index = buildServerIndex(
    Array.from({ length: SHARDS }, (_, i) => [{ id: `srv-${i}` }])
  );

  it('loads only the mapped shard for a lookup', async () => {
    const kv = makeKv({
      ...shardEntries,
      'cache:servers-index': JSON.stringify(index),
      'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);
    assert.equal(lookup.hasIndex, true);

    const found = await lookup.findById('srv-4');
    assert.equal(found?.id, 'srv-4');
    // index + meta create metu, po to — tik mapped shardas (ne visi 6)
    assert.deepEqual(shardGets(kv), ['cache:servers:4']);
  });

  it('returns null for unknown id without scanning shards', async () => {
    const kv = makeKv({
      ...shardEntries,
      'cache:servers-index': JSON.stringify(index),
      'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.equal(await lookup.findById('srv-unknown'), null);
    assert.equal(shardGets(kv).length, 0);
  });

  it('reuses the cached shard for a repeat lookup', async () => {
    const kv = makeKv({
      ...shardEntries,
      'cache:servers-index': JSON.stringify(index),
      'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    });

    const lookup = await ServerLookup.create(kv, 'reforger');
    await lookup.findById('srv-2');
    await lookup.findById('srv-2');
    assert.deepEqual(shardGets(kv), ['cache:servers:2']);
  });
});

describe('ServerLookup — batched full-scan fallback (index missing)', () => {
  const metaOnly = {
    'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
    ...shardEntries,
  };

  it('finds a server via batched scan and stops early', async () => {
    const kv = makeKv(metaOnly);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);
    assert.equal(lookup.hasIndex, false);

    const found = await lookup.findById('srv-1');
    assert.equal(found?.id, 'srv-1');
    // Batch 0 = shards 0..3; srv-1 pirmame batch'e — shards 4..5 turi likti neliesti
    assert.deepEqual(shardGets(kv), [
      'cache:servers:0',
      'cache:servers:1',
      'cache:servers:2',
      'cache:servers:3',
    ]);
  });

  it('scans all shards (batched) when id is nowhere', async () => {
    const kv = makeKv(metaOnly);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.equal(await lookup.findById('nope'), null);
    assert.equal(shardGets(kv).length, SHARDS);
  });

  it('returns null when neither index nor meta exist', async () => {
    const kv = makeKv({});
    assert.equal(await ServerLookup.create(kv, 'reforger'), null);
  });
});
