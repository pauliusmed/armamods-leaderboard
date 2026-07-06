import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeServerSets,
  clusterServersByModpack,
  detectStackTags,
  findFittingServerSets,
} from '../web/functions/lib/server-set-analysis.ts';

const mod = (id: string, name: string) => ({ id, name });

describe('detectStackTags', () => {
  it('detects WCS and RHS from mod names', () => {
    const tags = detectStackTags([
      mod('1', 'WCS_Armaments'),
      mod('2', 'RHS - Content Pack 01'),
    ]);
    assert.deepEqual(tags, ['WCS', 'RHS']);
  });

  it('returns Vanilla for empty mod list', () => {
    assert.deepEqual(detectStackTags([]), ['Vanilla']);
  });
});

describe('clusterServersByModpack', () => {
  it('groups highly overlapping servers', () => {
    const base = ['A', 'B', 'C', 'D', 'E'];
    const servers = [
      { id: 's1', name: 'WCS EU1', mods: base.map((id) => mod(id, `WCS_${id}`)) },
      { id: 's2', name: 'WCS EU2', mods: [...base, 'F'].map((id) => mod(id, `WCS_${id}`)) },
      { id: 's3', name: 'Vanilla', mods: [mod('V1', 'VanillaOnly')] },
    ];
    const clusters = clusterServersByModpack(servers);
    assert.equal(clusters.length, 2);
    assert.equal(clusters[0].length, 2);
    assert.equal(clusters[1].length, 1);
  });
});

describe('findFittingServerSets', () => {
  const sizeById = new Map<string, number | null>([
    ['A', 22 * 1024 ** 3],
    ['B', 22 * 1024 ** 3],
    ['C', 4 * 1024 ** 3],
  ]);

  it('returns fitting subsets under budget', () => {
    const servers = [
      { id: 's1', name: 'Heavy A', mods: [mod('A', 'A')] },
      { id: 's2', name: 'Heavy B', mods: [mod('B', 'B')] },
      { id: 's3', name: 'Light', mods: [mod('C', 'C')] },
    ];
    const fits = findFittingServerSets({
      servers,
      availableBytes: 25 * 1024 ** 3,
      sizeById,
    });
    assert.ok(fits.some((f) => f.serverIds.length === 1 && f.serverIds[0] === 's3'));
    assert.ok(!fits.some((f) => f.serverIds.length === 2));
  });
});

describe('analyzeServerSets', () => {
  it('builds guidance for multiple mod families over limit', () => {
    const sizeById = new Map<string, number | null>([
      ['W1', 20 * 1024 ** 3],
      ['C1', 18 * 1024 ** 3],
    ]);
    const feedback = analyzeServerSets({
      selectedServers: [
        { id: 'wcs', name: 'WCS Server', mods: [mod('W1', 'WCS_Core')] },
        { id: 'cie', name: 'CIE Server', mods: [mod('C1', 'CIE_Assets')] },
      ],
      availableBytes: 25 * 1024 ** 3,
      sizeById,
    });
    assert.equal(feedback.clusters.length, 2);
    assert.equal(feedback.allSelectedFits, false);
    assert.ok(feedback.guidance.some((g) => g.includes('mod families')));
  });

  it('fits selection when extrapolation overshoots but known sizes fit', () => {
    const heavy = 2 * 1024 ** 3;
    const sizeById = new Map<string, number | null>();
    const mods = [
      ...Array.from({ length: 9 }, (_, i) => {
        const id = `H${i}`;
        sizeById.set(id, heavy);
        return mod(id, `Heavy ${i}`);
      }),
      ...Array.from({ length: 91 }, (_, i) => {
        const id = `U${i}`;
        sizeById.set(id, null);
        return mod(id, `Unknown ${i}`);
      }),
    ];

    const feedback = analyzeServerSets({
      selectedServers: [{ id: 's1', name: 'Heavy stack', mods }],
      availableBytes: 25 * 1024 ** 3,
      sizeById,
    });

    assert.equal(feedback.allSelectedFits, true);
    assert.equal(feedback.allSelectedBytes, 9 * heavy);
  });
});
