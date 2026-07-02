import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesAllSearchTokens,
  matchesModSearch,
  matchesModSearchByNameOrId,
  matchesServerSearch,
} from '../web/functions/lib/search-match.ts';

describe('matchesAllSearchTokens', () => {
  it('matches when all words appear in any order', () => {
    assert.equal(
      matchesAllSearchTokens('Relax Ukraine | PVP', 'ukraine relax'),
      true
    );
    assert.equal(matchesAllSearchTokens('Relax Ukraine', 'relax ukraine'), true);
  });

  it('fails when a token is missing', () => {
    assert.equal(matchesAllSearchTokens('Relax Ukraine', 'relax poland'), false);
  });
});

describe('matchesServerSearch', () => {
  it('searches name and ip fields', () => {
    assert.equal(
      matchesServerSearch({ name: 'My Server', ip: '1.2.3.4' }, '1.2.3'),
      true
    );
  });
});

describe('matchesModSearch', () => {
  it('matches mod name and id', () => {
    assert.equal(
      matchesModSearch({ name: 'RHS Core', id: 'ABC-123' }, 'rhs'),
      true
    );
    assert.equal(matchesModSearch({ name: 'RHS Core', id: 'ABC-123' }, 'abc-123'), true);
  });

  it('matches workshop author', () => {
    assert.equal(
      matchesModSearch({ name: 'Some Mod', id: 'X', author: 'Red Hammer Studios' }, 'red hammer'),
      true
    );
    assert.equal(
      matchesModSearch({ name: 'Some Mod', id: 'X', author: 'Red Hammer Studios' }, 'hammer rhs'),
      false
    );
  });
});

describe('matchesModSearchByNameOrId', () => {
  it('ignores author field', () => {
    assert.equal(
      matchesModSearchByNameOrId({ name: 'RHS Core', id: 'ABC' }, 'rhs'),
      true
    );
    assert.equal(
      matchesModSearchByNameOrId(
        { name: 'Unrelated', id: 'X' },
        'red hammer'
      ),
      false
    );
  });
});
