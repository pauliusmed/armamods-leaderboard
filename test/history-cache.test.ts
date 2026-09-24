import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  entityHistoryObjectKey,
  readMaterializedEntityHistory,
  writeMaterializedEntityHistory,
  type HistoryBucket,
  type HistoryBucketObject,
} from '../web/functions/lib/history-cache.ts';

class FakeBucket implements HistoryBucket {
  store = new Map<string, string>();

  async get(key: string): Promise<HistoryBucketObject | null> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    return { json: async <T>() => JSON.parse(value) as T };
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

describe('history-cache — raktai', () => {
  it('sulipdo game/kind/variant/id ir užkoduoja reikšmes', () => {
    assert.equal(
      entityHistoryObjectKey('reforger', 'mod-history', 'history:daily:reforger:-30', 'ABC/123'),
      'history/v1/reforger/mod-history/history%3Adaily%3Areforger%3A-30/ABC%2F123.json'
    );
  });

  it('skirtingi variantai nesikerta', () => {
    const daily = entityHistoryObjectKey('reforger', 'server-history', 'history:daily:reforger:-30', '1');
    const weekly = entityHistoryObjectKey('reforger', 'server-history', 'history:weekly:reforger:-52', '1');
    assert.notEqual(daily, weekly);
  });
});

describe('history-cache — read/write', () => {
  let bucket: FakeBucket;

  beforeEach(() => {
    bucket = new FakeBucket();
  });

  it('write → read su ta pačia versija grąžina data', async () => {
    const key = entityHistoryObjectKey('reforger', 'mod-history', 'v1', 'MOD');
    await writeMaterializedEntityHistory(bucket, key, '2026-09-25T00:00:00Z', [{ time: '2026-09-25' }]);
    assert.deepEqual(await readMaterializedEntityHistory(bucket, key, '2026-09-25T00:00:00Z'), [
      { time: '2026-09-25' },
    ]);
  });

  it('read su pasenusia versija grąžina null (fallback į KV)', async () => {
    const key = entityHistoryObjectKey('reforger', 'mod-history', 'v1', 'MOD');
    await writeMaterializedEntityHistory(bucket, key, 'sena', [{ time: 'sena' }]);
    assert.equal(await readMaterializedEntityHistory(bucket, key, 'nauja'), null);
  });

  it('read be objekto arba be bucket/version grąžina null', async () => {
    const key = entityHistoryObjectKey('reforger', 'mod-history', 'v1', 'MOD');
    assert.equal(await readMaterializedEntityHistory(bucket, key, 'v1'), null);
    assert.equal(await readMaterializedEntityHistory(undefined, key, 'v1'), null);
    assert.equal(await readMaterializedEntityHistory(bucket, key, null), null);
  });

  it('write be bucket/version yra no-op', async () => {
    const key = entityHistoryObjectKey('reforger', 'mod-history', 'v1', 'MOD');
    await writeMaterializedEntityHistory(undefined, key, 'v1', [1]);
    await writeMaterializedEntityHistory(bucket, key, null, [1]);
    assert.equal(bucket.store.size, 0);
  });
});
