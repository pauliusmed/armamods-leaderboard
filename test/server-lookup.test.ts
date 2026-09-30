import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findServerInChunks,
  buildServerIndex,
  ServerLookup,
  FALLBACK_BATCH,
  logSafeId,
} from '../web/functions/lib/server-lookup.ts';
import { clearModuleCache } from '../web/functions/lib/module-cache.ts';

beforeEach(() => clearModuleCache());

/** Run `fn` with console.warn captured; the `finally` restore is the part that matters. */
async function captureWarn(fn: () => Promise<unknown>): Promise<string[]> {
  const lines: string[] = [];
  const real = console.warn;
  console.warn = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  try {
    await fn();
  } finally {
    console.warn = real;
  }
  return lines;
}

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
  const probe = { maxInFlight: 0, reset: () => { probe.maxInFlight = 0; } };
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
  } as unknown as KVNamespace & { gets: string[]; probe: { maxInFlight: number; reset: () => void } };
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

/** ~5 MB vienam `cache:servers:<i>` shardui (išmatuota 09-30). */
const SHARD_MB = 5;
/** Workers izoliato RAM riba. */
const ISOLATE_MB = 128;

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

  it('holds the full-scan parallelism within FALLBACK_BATCH', async () => {
    // Tvirtiname SUTARTĮ su RAM biudžetu, ne tik su savo pačiu konstantu.
    // Tik `maxInFlight <= FALLBACK_BATCH` būtų tautologija: pakėlus
    // FALLBACK_BATCH iki 8, testas liktų žalias, o pikas 8×5 = 40 MB (~31 %)
    // vietoj 4×5 = 20 MB (~16 %) — siena, kuri saugo save pati. Todėl čia
    // fiksuojama ir **absoliuti** reikšmė pagal RAM ribą, ir santykis.
    assert.ok(
      FALLBACK_BATCH * SHARD_MB <= ISOLATE_MB / 4,
      `FALLBACK_BATCH=${FALLBACK_BATCH} → ${FALLBACK_BATCH * SHARD_MB} MB virš ${ISOLATE_MB / 4} MB biudžeto`
    );

    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    // `create()` skaitė index+meta paraleliai (2) — išvalome, kad matuotume
    // TIK skeno lygiagumą, o ne visos užklausos.
    kv.probe.reset();
    assert.equal(await lookup.findByIdWithScan('srv-gone'), null);
    assert.equal(shardGets(kv).length, SHARDS);
    assert.ok(kv.probe.maxInFlight <= FALLBACK_BATCH, `maxInFlight=${kv.probe.maxInFlight}`);
    // Lygiagumas turi egzistuoti — kitaip batchas nepasiteisimu.
    assert.ok(kv.probe.maxInFlight > 1, `maxInFlight=${kv.probe.maxInFlight}`);
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

  it('routes the logged id through logSafeId (log-injection guard)', async () => {
    // serverId ateina iš `/server/:id` — bots gali įrėžti `\n` ir suforguoti
    // netikrus log įrašus. Tvirtiname SUTARTĮ (kad naudojama `logSafeId`),
    // o ne pasisekimo šabloną: testas turi likti teisingas po bet kurio žodžio
    // pakeitimo pranešime.
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    const attack = 'srv\n[SERVER_LOOKUP] forged line';
    const lines = await captureWarn(() => lookup.findByIdWithScan(attack));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].includes('\n'), false);
    assert.equal(lines[0].includes(logSafeId(attack)), true);
  });

  it('caps the logged id at 32 characters (log-volume guard)', async () => {
    // Be `.slice(0, 32)` bots galėtų įrėžti šimtus ženklų į kiekvieną log
    // įrašą. Serverių id realiai ≤ 8 skaitmenys.
    const kv = makeKv(entries);
    const lookup = await ServerLookup.create(kv, 'reforger');
    assert.ok(lookup);

    const flood = 'A'.repeat(5_000);
    const lines = await captureWarn(() => lookup.findByIdWithScan(flood));

    // Čia tik integracijos klausimas: pranešime NĖRA raw id. Ilgio riba
    // tikrinama atskirai (`logSafeId` describe) — čia kartoti būtų dubiavimas.
    assert.equal(lines.length, 1);
    assert.equal(lines[0].includes(flood), false);
    assert.equal(lines[0].includes(logSafeId(flood)), true);
  });
});

describe('logSafeId', () => {
  it('strips everything outside [A-Za-z0-9_-] so one id stays one log line', () => {
    // Newline, `[`, `]`, tarpas → visi `?`. Jokio '\n' nelieka.
    assert.equal(logSafeId('srv\n[SERVER_LOOKUP] forged line'), 'srv??SERVER_LOOKUP??forged?line');
    assert.equal(logSafeId('a\nb').includes('\n'), false);
  });

  it('caps length at 32 characters', () => {
    assert.equal(logSafeId('A'.repeat(5_000)).length, 32);
    assert.equal(logSafeId('A'.repeat(5_000)), 'A'.repeat(32));
  });

  it('keeps legitimate server ids intact', () => {
    assert.equal(logSafeId('41066386'), '41066386');
    assert.equal(logSafeId('army-3_A'), 'army-3_A');
  });

  it('never returns an empty label', () => {
    assert.equal(logSafeId(''), '(empty)');
  });

  it('renders an all-unsafe id as placeholders, not nothing', () => {
    // `'??'` — matoma, kad buvo kažkas neteisingo, o ne „tuščias serveris".
    assert.equal(logSafeId('\n\n'), '??');
  });
});
