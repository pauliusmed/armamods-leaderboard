import { describe, expect, it } from 'vitest';
import {
  PRECOMPUTED_MODS_PAGE_SIZE,
  PRECOMPUTED_MODS_PAGES,
  PRECOMPUTED_MODS_SIZE,
  PRECOMPUTED_SERVERS_SIZE,
  precomputedModsCacheKey,
  precomputedModsSliceParams,
  precomputedServersCacheKey,
  precomputedServersParams,
  precomputedStatsCacheKey,
} from '../../functions/lib/precomputed-pages';

describe('precomputed-pages (bendras šildymas)', () => {
  it('raktai – 3 skirtingi namespace-ai, per game', () => {
    expect(precomputedModsCacheKey('reforger')).toBe('cache:page:mods:reforger:default');
    expect(precomputedServersCacheKey('reforger')).toBe('cache:page:servers:reforger:default');
    expect(precomputedStatsCacheKey('reforger')).toBe('cache:page:stats:reforger');
    expect(precomputedModsCacheKey('arma3')).not.toBe(precomputedModsCacheKey('reforger'));
  });

  it('mods default kelias – 24-aligned pirmi 96 (p1..p4) tik Reforger', () => {
    const hit = (o: number) =>
      precomputedModsSliceParams({
        game: 'reforger',
        sortBy: 'overall',
        sortDir: 'asc',
        search: '',
        playerFilter: 'all',
        limit: 24,
        offset: o,
      });
    expect(hit(0)?.pageIndex).toBe(0);
    expect(hit(24)?.pageIndex).toBe(1);
    expect(hit(72)?.pageIndex).toBe(3);
    expect(hit(96)).toBeNull(); // už precomputed ribos → fallback
    expect(hit(12)).toBeNull(); // ne 24-aligned
  });

  it('mods non-default kelias → fallback', () => {
    const miss = (q: Partial<Parameters<typeof precomputedModsSliceParams>[0]>) =>
      precomputedModsSliceParams({
        game: 'reforger',
        sortBy: 'overall',
        sortDir: 'asc',
        search: '',
        playerFilter: 'all',
        limit: 24,
        offset: 0,
        ...q,
      } as any);
    expect(miss({ search: 'vietnam' })).toBeNull();
    expect(miss({ sortBy: 'players' })).toBeNull();
    expect(miss({ sortDir: 'desc' })).toBeNull();
    expect(miss({ playerFilter: 'high' })).toBeNull();
    expect(miss({ game: 'arma3' })).toBeNull();
    expect(miss({ limit: 100 })).toBeNull();
  });

  it('servers default – tik limit=200 offset=0 be paieškos (Reforger)', () => {
    expect(
      precomputedServersParams({ game: 'reforger', search: '', limit: 200, offset: 0 })
    ).toBe(true);
    expect(
      precomputedServersParams({ game: 'reforger', search: 'camo', limit: 200, offset: 0 })
    ).toBe(false);
    expect(
      precomputedServersParams({ game: 'reforger', search: '', limit: 100, offset: 0 })
    ).toBe(false);
    expect(
      precomputedServersParams({ game: 'arma3', search: '', limit: 200, offset: 0 })
    ).toBe(false);
  });

  it('geometrija sutampa su useMods/hooks: 24/page', () => {
    expect(PRECOMPUTED_MODS_PAGE_SIZE).toBe(24);
    expect(PRECOMPUTED_MODS_SIZE).toBe(PRECOMPUTED_MODS_PAGE_SIZE * PRECOMPUTED_MODS_PAGES);
    expect(PRECOMPUTED_SERVERS_SIZE).toBe(200);
  });
});
