import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { persistentCache } from './db';

describe('persistentCache', () => {
  const KEY = 'test:key:1';
  const DATA = { name: 'test-mod', value: 42 };

  it('stores and retrieves data', async () => {
    const now = Date.now();
    await persistentCache.set(KEY, DATA, now);
    const result = await persistentCache.get(KEY);
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(DATA);
    expect(result!.timestamp).toBe(now);
  });

  it('returns null for missing key', async () => {
    const result = await persistentCache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null after prune removes expired entries', async () => {
    const OLD = Date.now() - 100000;
    await persistentCache.set('old:entry', { old: true }, OLD);
    await persistentCache.prune(50000);
    const result = await persistentCache.get('old:entry');
    expect(result).toBeNull();
  });

  it('keeps entries within prune age', async () => {
    const RECENT = Date.now();
    await persistentCache.set('recent:entry', { fresh: true }, RECENT);
    await persistentCache.prune(100000);
    const result = await persistentCache.get('recent:entry');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual({ fresh: true });
  });

  it('overwrites existing key', async () => {
    const t1 = Date.now();
    await persistentCache.set(KEY, { v1: true }, t1);
    const t2 = t1 + 1000;
    await persistentCache.set(KEY, { v2: true }, t2);
    const result = await persistentCache.get(KEY);
    expect(result!.data).toEqual({ v2: true });
    expect(result!.timestamp).toBe(t2);
  });
});
