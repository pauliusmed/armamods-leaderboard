import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../web/worker';

/**
 * Regresinis: nerasto `/server/:id` atsakymas privalo turėti tą pačią
 * `Cache-Control` politiką kaip rastas. Anksčiau jis krisdavo į
 * `env.ASSETS.fetch` su `max-age=0, must-revalidate`, todėl Workers Caching
 * revaliduodavo kas kartą ir Worker'is vėl skaitydavo indeksą/shards
 * (matuota 2026-10: 213–507 ms už kiekvieną bot'o hit'ą).
 */

const SHELL = '<!doctype html><html><body><div id="root"></div></body></html>';
const page = { match: async () => undefined, put: async () => undefined };

interface CachesLike {
  default: { match: () => Promise<undefined>; put: () => Promise<void> };
  open: () => Promise<typeof page>;
}

let previous: unknown;

before(() => {
  previous = (globalThis as { caches?: unknown }).caches;
  (globalThis as { caches?: unknown }).caches = {
    default: { match: async () => undefined, put: async () => undefined },
    open: async () => page,
  } satisfies CachesLike;
});

after(() => {
  if (previous === undefined) delete (globalThis as { caches?: unknown }).caches;
  else (globalThis as { caches?: unknown }).caches = previous;
});

function makeEnv() {
  return {
    TRENDING_KV: {
      // Tuščias KV: ServerLookup.create grąžina null → serveris „nerastas".
      get: async () => null,
    },
    HISTORY_BUCKET: null,
    ASSETS: {
      fetch: async () =>
        new Response(SHELL, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }),
    },
    PAGE_RATE_LIMITER: undefined,
    ENVIRONMENT: 'test',
  };
}

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
} as unknown as ExecutionContext;

describe('/server/:id — nerastas serveris', () => {
  it('grąžina SPA shell su 300 s + SWR politika', async () => {
    const response = await worker.fetch(
      new Request('https://reforgermods.com/server/00000000', { method: 'GET' }),
      makeEnv() as never,
      ctx
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=300, stale-while-revalidate=3600'
    );
    assert.equal(await response.text(), SHELL);
  });
});
