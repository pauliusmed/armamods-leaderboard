import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findServerInChunks,
  buildServerIndex,
  ServerLookup,
} from '../web/functions/lib/server-lookup.ts';
import { clearModuleCache } from '../web/functions/lib/module-cache.ts';

beforeEach(() => clearModuleCache());

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
  // In-flight tracking: lets tests assert parallelism, not just the final order
  // (a flat ordered get-list cannot tell 4-at-a-time batching from 1-wave or
  // fully sequential scanning — all three produce the same list).
  let inFlight = 0;
  const probe = { maxInFlight: 0 };
  return {
    gets,
    probe,
    get: async (key: string, type?: string) => {
      gets.push(key);
      inFlight++;
      if (inFlight > probe.maxInFlight) probe.maxInFlight = inFlight;
      try {
        await Promise.resolve();
        const value = entries[key];
        if (value === undefined) return null;
        return type === 'json' ? JSON.parse(value) : value;
      } finally {
        inFlight--;
      }
    },
  } as unknown as KVNamespace & { gets: string[]; probe: { maxInFlight: number } };
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

describe('ServerLookup — findByIdWithScan (index miss falls back to scan)', () => {
  // Indexas parašytas prieš paskutinį shard'ų snapshot'ą: shard'e 5 serveris yra,
  // indekse jo nėra — tikras kolektoriaus run'o rašymo langas.
  const staleIndex = buildServerIndex([
    [{ id: 'srv-0' }], [{ id: 'srv-1' }], [{ id: 'srv-2' }],
    [{ id: 'srv-3' }], [{ id: 'srv-4' }], [],
  ]);
  const entries = {
    ...shardEntries,
    'cache:servers-index': JSON.stringify(staleIndex),
    'cache:servers:meta': JSON.stringify({ total: SHARDS, chunks: SHARDS }),
  };

  it('scans and finds a server the index does not know', async () => {
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    // be fallback'o — greitas 404
    assert.equal(await lookup.findById('srv-5'), null);
    assert.equal(shardGets(kv).length, 0);

    const found = await lookup.findByIdWithScan('srv-5');
    assert.equal(found?.id, 'srv-5');
    assert.equal(shardGets(kv).length, SHARDS);
  });

  it('does not scan when the index already answers', async () => {
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    assert.equal((await lookup.findByIdWithScan('srv-3'))?.id, 'srv-3');
    assert.deepEqual(shardGets(kv), ['cache:servers:3']);
  });

  it('returns null when the index misses and no shard has it', async () => {
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    assert.equal(await lookup.findByIdWithScan('srv-gone'), null);
    assert.equal(shardGets(kv).length, SHARDS);
  });

  it('never keeps more than FALLBACK_BATCH shard reads in flight', async () => {
    // 6 shardai. Bandymas: viena 6-paralelinė banga arba nuoseklus skenas irgi
    // duoda plokštų get'ų sąrašą [0..5] — todėl tvirtiname ne tvarką, o
    // lygiagumą. Be batchingo čia būtų 6; su juo — 4.
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    assert.equal(await lookup.findByIdWithScan('srv-gone'), null);
    assert.equal(shardGets(kv).length, SHARDS);
    // create() skaito index+meta (2) → batchai po 4 ir 2. Maksimumas lygus 4.
    assert.equal(kv.probe.maxInFlight, 4);
  });

  it('does not double-scan when the index is missing entirely', async () => {
    const kv = makeKv({ ...shardEntries, 'cache:servers:meta': entries['cache:servers:meta'] });
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);
    assert.equal(lookup.hasIndex, false);

    assert.equal(await lookup.findByIdWithScan('nope'), null);
    // `create()` skaito tik index+meta; visus shard'us perskaitė `findById()`
    // per savo batched fallback'ą. `findByIdWithScan()` mato `index === null`
    // ir neatlieka antrojo pilno skeno.
    assert.equal(shardGets(kv).length, SHARDS);
  });

  it('never logs a raw URL-supplied id (log-injection guard)', async () => {
    // serverId ateina iš `/server/:id` — botas gali įrėžti `\n` ir suforguoti
    // netikrus log įrašus. Kiekvienas įrašas turi būti VIENOS eilutės.
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    const lines: string[] = [];
    const real = console.warn;
    console.warn = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
    try {
      await lookup.findByIdWithScan('srv\n[SERVER_LOOKUP] forged line');
    } finally {
      console.warn = real;
    }

    assert.equal(lines.length, 1);
    assert.equal(lines[0].includes('\n'), false);
    assert.equal(lines[0].includes('forged'), true);
    // Kiekvienas neleidžiamas simbolis (newline, `[`, `]`, tarpas) → '?':
    // 'srv\n[SERVER_LOOKUP] forged line' turi likti VIENA eilute.
    assert.equal(lines[0].includes('srv??SERVER_LOOKUP??forged?line'), true);
  });
});
