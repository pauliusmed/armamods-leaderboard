import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findModAliasTarget,
  loadAliasedModIdSet,
  modAliasIndexKey,
  modAliasKey,
  normalizeModName,
} from '../web/functions/lib/mod-alias.ts';

describe('normalizeModName', () => {
  it('lowercases and collapses whitespace', () => {
    assert.equal(normalizeModName('  Special   Operations\tWeapon Pack '), 'special operations weapon pack');
  });

  it('returns empty string for missing name', () => {
    assert.equal(normalizeModName(null), '');
    assert.equal(normalizeModName(undefined), '');
  });
});

describe('modAliasKey / modAliasIndexKey', () => {
  it('uppercases mod id in alias key', () => {
    assert.equal(modAliasKey('reforger', '69f6d888c2070420'), 'cache:mod-alias:reforger:69F6D888C2070420');
  });

  it('builds per-game index key', () => {
    assert.equal(modAliasIndexKey('reforger'), 'cache:mod-aliases:reforger');
    assert.equal(modAliasIndexKey('arma3'), 'cache:mod-aliases:arma3');
  });
});

describe('findModAliasTarget', () => {
  const old = { id: '69F6D888C2070420', name: 'Special Operations Weapon Pack', author: 'Meatball1127' };

  it('returns the single same-name same-author candidate', () => {
    const candidates = [
      { id: '1111111111111111', name: 'Other Mod', author: 'Meatball1127' },
      { id: 'AAAAE9AAAAAAAAAA', name: 'special operations weapon pack', author: 'meatball1127' },
    ];
    assert.equal(findModAliasTarget(old, candidates), 'AAAAE9AAAAAAAAAA');
  });

  it('rejects when two candidates match (ambiguity)', () => {
    const candidates = [
      { id: 'AAAAE9AAAAAAAAAA', name: old.name, author: old.author },
      { id: 'BBBBE9BBBBBBBBBB', name: old.name, author: old.author },
    ];
    assert.equal(findModAliasTarget(old, candidates), null);
  });

  it('rejects when no candidate matches', () => {
    assert.equal(findModAliasTarget(old, [{ id: 'CCCCCCCCCCCCCCCC', name: 'Different', author: old.author }]), null);
    assert.equal(findModAliasTarget(old, []), null);
  });

  it('rejects when either side has no author', () => {
    assert.equal(
      findModAliasTarget({ ...old, author: null }, [{ id: 'AAAAE9AAAAAAAAAA', name: old.name, author: 'X' }]),
      null
    );
    assert.equal(
      findModAliasTarget(old, [{ id: 'AAAAE9AAAAAAAAAA', name: old.name, author: '' }]),
      null
    );
  });

  it('never matches itself', () => {
    assert.equal(findModAliasTarget(old, [old]), null);
  });

  it('requires exact normalized name, not substring', () => {
    assert.equal(
      findModAliasTarget(old, [{ id: 'AAAAE9AAAAAAAAAA', name: 'Special Operations Weapon Pack 2', author: old.author }]),
      null
    );
  });
});

describe('loadAliasedModIdSet', () => {
  it('parses index json into uppercase id set', async () => {
    const kv = {
      get: async (key: string, type: 'text') =>
        key === 'cache:mod-aliases:reforger' && type === 'text'
          ? JSON.stringify(['69f6d888c2070420', 'DEADC0DE00000000'])
          : null,
    };
    const set = await loadAliasedModIdSet(kv as any, 'reforger');
    assert.deepEqual([...set].sort(), ['69F6D888C2070420', 'DEADC0DE00000000']);
  });

  it('returns empty set on missing or corrupt payload', async () => {
    const empty = await loadAliasedModIdSet({ get: async () => null } as any, 'reforger');
    assert.equal(empty.size, 0);
    const corrupt = await loadAliasedModIdSet({ get: async () => '{oops' } as any, 'reforger');
    assert.equal(corrupt.size, 0);
  });
});
