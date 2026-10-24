import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { cacheKeyRequest, cacheKeyUrl } from '../web/functions/lib/cache-key';

describe('cacheKeyUrl', () => {
  it('pašalina jQuery cache-buster `_`, kitus parametrus palieka', () => {
    const key = cacheKeyUrl(
      new URL('https://reforgermods.com/api/servers?limit=500&full=1&search=ultr&_=1792769928508')
    );
    assert.equal(key.searchParams.get('_'), null);
    assert.equal(key.searchParams.get('limit'), '500');
    assert.equal(key.searchParams.get('full'), '1');
    assert.equal(key.searchParams.get('search'), 'ultr');
  });

  it('du skirtingi `_` duoda tą patį raktą', () => {
    const a = cacheKeyUrl(new URL('https://example.com/api/servers?game=reforger&_=1'));
    const b = cacheKeyUrl(new URL('https://example.com/api/servers?game=reforger&_=2'));
    assert.equal(a.toString(), b.toString());
  });

  it('skirtingi realūs parametrai lieka skirtingi (be klaidingo suliejimo)', () => {
    const a = cacheKeyUrl(new URL('https://example.com/api/servers?search=pvp&_=1'));
    const b = cacheKeyUrl(new URL('https://example.com/api/servers?search=ultra&_=1'));
    assert.notEqual(a.toString(), b.toString());
  });

  it('nekeičia įvesties URL (jokių šalutinių poveikių)', () => {
    const input = new URL('https://example.com/api/servers?_=42');
    cacheKeyUrl(input);
    assert.equal(input.searchParams.get('_'), '42');
  });

  it('be cache-buster\'io grąžina tą patį URL', () => {
    const input = new URL('https://example.com/api/mods?page=2');
    assert.equal(cacheKeyUrl(input).toString(), input.toString());
  });
});

describe('cacheKeyRequest', () => {
  it('grąžina GET užklausą su normalizuotu URL', () => {
    const key = cacheKeyRequest(
      new Request('https://example.com/api/servers?game=reforger&_=99', { method: 'GET' })
    );
    assert.equal(key.method, 'GET');
    assert.equal(key.url, 'https://example.com/api/servers?game=reforger');
  });

  it('Cache API raktas nepaveldžia užklausos antraščių', () => {
    const key = cacheKeyRequest(
      new Request('https://example.com/api/servers?_=7', {
        method: 'GET',
        headers: { 'user-agent': 'Arma-Reforger-Launcher' },
      })
    );
    assert.equal(key.headers.get('user-agent'), null);
  });
});
