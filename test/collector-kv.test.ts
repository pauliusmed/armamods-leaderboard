import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareKVClient } from '../scripts/collector.ts';

const origToken = process.env.CLOUDFLARE_API_TOKEN;
const origAccount = process.env.CLOUDFLARE_ACCOUNT_ID;

describe('CloudflareKVClient.put', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
  });

  afterEach(() => {
    if (origToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = origToken;
    if (origAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = origAccount;
    globalThis.fetch = originalFetch;
  });

  it('forwards expirationTtl as expiration_ttl query param', async () => {
    let calledUrl = '';
    globalThis.fetch = (async (input: any) => {
      calledUrl = String(input);
      return { ok: true, status: 200 };
    }) as any;

    const kv = new CloudflareKVClient();
    await kv.put('cache:mod-size:reforger:TESTID', '123', { expirationTtl: 604800 });

    assert.ok(calledUrl.includes('expiration_ttl=604800'));
  });

  it('omits expiration_ttl when no TTL option is given', async () => {
    let calledUrl = '';
    globalThis.fetch = (async (input: any) => {
      calledUrl = String(input);
      return { ok: true, status: 200 };
    }) as any;

    const kv = new CloudflareKVClient();
    await kv.put('cache:mod-size:reforger:TESTID', '123');

    assert.ok(!calledUrl.includes('expiration_ttl'));
  });
});
