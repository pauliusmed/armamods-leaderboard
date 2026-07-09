import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findReverseDependentsFromDepMap,
  modDependsOnTarget,
} from '../web/functions/lib/reverse-deps.ts';

describe('modDependsOnTarget', () => {
  it('matches case-insensitive mod id', () => {
    assert.equal(
      modDependsOnTarget([{ id: 'abc123', name: 'Assets' }], 'ABC123'),
      true
    );
  });
});

describe('findReverseDependentsFromDepMap', () => {
  const serverMods = [
    { id: 'ASSETS', name: 'WCS_Clothing_Assets' },
    { id: 'CLOTH', name: 'WCS_Clothing' },
    { id: 'ARMS', name: 'WCS_Armaments' },
    { id: '401K', name: '401ks RHS Content' },
  ];

  it('lists mods that declare target as dependency', () => {
    const depMap = new Map([
      ['CLOTH', [{ id: 'ASSETS', name: 'WCS_Clothing_Assets' }]],
      ['ARMS', [{ id: 'SPACE', name: 'SpaceCore' }]],
      [
        '401K',
        [
          { id: 'ASSETS', name: 'WCS_Clothing_Assets' },
          { id: 'CLOTH', name: 'WCS_Clothing' },
        ],
      ],
    ]);

    const result = findReverseDependentsFromDepMap(serverMods, 'ASSETS', depMap);
    assert.equal(result.dependents.length, 2);
    assert.deepEqual(
      result.dependents.map((d) => d.id),
      ['401K', 'CLOTH']
    );
  });

  it('throws when target not on server', () => {
    assert.throws(
      () => findReverseDependentsFromDepMap(serverMods, 'MISSING', new Map()),
      /not on server/
    );
  });
});
