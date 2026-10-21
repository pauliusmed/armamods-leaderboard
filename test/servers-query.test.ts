import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveServersLimit,
  serversCacheControl,
  SERVERS_DEFAULT_LIMIT,
  SERVERS_FULL_LIMIT_CAP,
  SERVERS_LIST_LIMIT_CAP,
  SERVERS_LIST_CACHE_CONTROL,
  SERVERS_SEARCH_CACHE_CONTROL,
} from '../web/functions/lib/servers-query.ts';

test('/api/servers: paieška negali prašyti 5000 eilučių (senasis 25 MB kelias)', () => {
  assert.equal(
    resolveServersLimit({ full: false, search: 'wasteland', requestedLimit: 5000 }),
    SERVERS_LIST_LIMIT_CAP
  );
  assert.equal(SERVERS_LIST_LIMIT_CAP, 500);
});

test('/api/servers: full=1 išlaiko 5000 (admin/planner puslapiai)', () => {
  assert.equal(
    resolveServersLimit({ full: true, search: '', requestedLimit: 5000 }),
    SERVERS_FULL_LIMIT_CAP
  );
  assert.equal(
    resolveServersLimit({ full: true, search: 'wasteland', requestedLimit: 2000 }),
    2000
  );
});

test('/api/servers: default limit ir NaN atvejis nepakitę', () => {
  assert.equal(
    resolveServersLimit({ full: false, search: '', requestedLimit: 200 }),
    200
  );
  assert.equal(
    resolveServersLimit({ full: false, search: '', requestedLimit: Number.NaN }),
    SERVERS_DEFAULT_LIMIT
  );
  assert.equal(
    resolveServersLimit({ full: false, search: '', requestedLimit: 0 }),
    1
  );
});

test('paieškos atsakymas kešuojamas ilgiau nei sąrašo', () => {
  assert.equal(serversCacheControl(''), SERVERS_LIST_CACHE_CONTROL);
  assert.equal(serversCacheControl('   '), SERVERS_LIST_CACHE_CONTROL);
  assert.equal(serversCacheControl('wasteland'), SERVERS_SEARCH_CACHE_CONTROL);

  const maxAge = (policy: string) => Number(/max-age=(\d+)/.exec(policy)?.[1]);
  assert.ok(
    maxAge(SERVERS_SEARCH_CACHE_CONTROL) > maxAge(SERVERS_LIST_CACHE_CONTROL),
    'paieška turi gyventi ilgiau — ją generuoja pilnas shard scan'
  );
});
