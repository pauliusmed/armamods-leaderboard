import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSHOP_BATCH_MAX,
  workshopListByIds,
  workshopAssetDetail,
  sizeAuthorFromApiRow,
  workshopAssetExists,
  type WorkshopApiAssetRow,
} from '../web/functions/lib/workshop-api.js';

// Mock global fetch — no real network in tests.
type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

let mockImpl: FetchImpl | null = null;

beforeEach(() => {
  const original = globalThis.fetch;
  mockImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/assets/list')) {
      const body = JSON.parse(String(init?.body || '{}'));
      const ids: string[] = body.ids || [];
      const rows = ids.map((id) => ({ id, name: `Mod ${id}`, currentVersionSize: 1234, author: { username: 'AuthorX' } }));
      return new Response(JSON.stringify({ count: rows.length, rows }), { status: 200 });
    }
    if (url.includes('/assets/')) {
      const id = url.split('/').pop()?.toUpperCase();
      if (id === 'MISSING') {
        return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      }
      return new Response(
        JSON.stringify({ id, name: 'Mod Detail', currentVersionSize: 5678, author: { username: 'DetailAuthor' } }),
        { status: 200 }
      );
    }
    return new Response('Not Found', { status: 404 });
  }) as FetchImpl;
  (globalThis as { fetch: FetchImpl }).fetch = mockImpl;
  return () => { (globalThis as { fetch: FetchImpl }).fetch = original; };
});

describe('workshopListByIds', () => {
  it('returns rows for given ids', async () => {
    const { rows } = await workshopListByIds(['AAA', 'BBB']);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.id, 'AAA');
  });

  it('returns empty for no ids', async () => {
    const { rows, networkError } = await workshopListByIds([]);
    assert.deepEqual(rows, []);
    assert.equal(networkError, false);
  });

  it('chunks requests at WORKSHOP_BATCH_MAX', async () => {
    const ids = Array.from({ length: WORKSHOP_BATCH_MAX + 5 }, (_, i) => `M${i}`);
    const { rows } = await workshopListByIds(ids);
    assert.equal(rows.length, WORKSHOP_BATCH_MAX + 5);
  });
});

describe('workshopAssetDetail', () => {
  it('returns detail for existing id', async () => {
    const d = await workshopAssetDetail('abc');
    assert.equal(d?.name, 'Mod Detail');
    assert.equal(d?.currentVersionSize, 5678);
  });

  it('returns null for missing id', async () => {
    const d = await workshopAssetDetail('MISSING');
    assert.equal(d, null);
  });
});

describe('sizeAuthorFromApiRow', () => {
  it('extracts size and author', () => {
    const row: WorkshopApiAssetRow = { id: 'X', currentVersionSize: 999, author: { username: 'A' } };
    assert.deepEqual(sizeAuthorFromApiRow(row), { sizeBytes: 999, author: 'A', blocked: false });
  });

  it('handles undefined row', () => {
    assert.deepEqual(sizeAuthorFromApiRow(undefined), { sizeBytes: null, author: null, blocked: false });
  });

  it('flags blocked mods', () => {
    const row: WorkshopApiAssetRow = { id: 'X', blocked: true };
    assert.deepEqual(sizeAuthorFromApiRow(row), { sizeBytes: null, author: null, blocked: true });
  });
});

describe('workshopAssetExists', () => {
  it('true for existing', async () => {
    assert.equal(await workshopAssetExists('abc'), true);
  });

  it('false for missing', async () => {
    assert.equal(await workshopAssetExists('MISSING'), false);
  });
});
