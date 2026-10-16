import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseCache } from '../web/functions/lib/response-cache.ts';

function fixture() {
  let now = 0;
  let stored: Response | undefined;
  let expires = 0;
  const inner = {
    async put(_request: unknown, response: Response) {
      stored = response;
      expires = now + Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') ?? '')?.[1]);
    },
    async match() { return now < expires ? stored?.clone() : undefined; },
  };
  return { cache: responseCache(inner as never), stored: () => stored, advance: (seconds: number) => { now += seconds; } };
}

test('Cache API stores fresh TTL only; a hit preserves the external Workers Cache SWR policy', async () => {
  const f = fixture();
  const policy = 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=60';
  await f.cache.put('https://example.com/api', new Response('{"ok":true}', {
    headers: { 'Cache-Control': policy, ETag: '"v1"', 'Content-Type': 'application/json' },
  }));
  assert.equal(f.stored()?.headers.get('Cache-Control'), 'public, max-age=300');
  const hit = await f.cache.match('https://example.com/api');
  assert.ok(hit);
  assert.equal(hit.headers.get('Cache-Control'), policy);
  assert.equal(hit.headers.get('X-Armamods-Public-Cache-Control'), null);
  assert.equal(hit.headers.get('ETag'), '"v1"');
  assert.deepEqual(await hit.json(), { ok: true });
});

test('the inner cache expires at fresh TTL instead of extending it by the SWR window', async () => {
  const f = fixture();
  await f.cache.put('https://example.com/api', new Response('data', {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  }));
  f.advance(300);
  assert.equal(await f.cache.match('https://example.com/api'), undefined);
});

test('plain TTL and private/no-store policies are not loosened', async () => {
  for (const policy of ['public, max-age=60', 'private, no-store']) {
    const f = fixture();
    await f.cache.put('https://example.com/api', new Response(null, { headers: { 'Cache-Control': policy } }));
    assert.equal(f.stored()?.headers.get('Cache-Control'), policy);
    assert.equal(f.stored()?.headers.get('X-Armamods-Public-Cache-Control'), null);
  }
});
