import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatModConfigSnippet } from '../web/src/lib/modConfig.ts';

describe('formatModConfigSnippet', () => {
  it('formats a game.mods[] entry with trailing comma', () => {
    const snippet = formatModConfigSnippet('64f47ec0f5aaee26', 'Slav Life - Eastern Bloc Autos');
    assert.match(snippet, /"modId": "64F47EC0F5AAEE26"/);
    assert.match(snippet, /"name": "Slav Life - Eastern Bloc Autos"/);
    assert.match(snippet, /\},\s*$/);
    assert.match(snippet, /^            \{/);
  });

  it('escapes quotes in mod names', () => {
    const snippet = formatModConfigSnippet('AAAAAAAAAAAAAAAA', 'Mod "Special" Name');
    assert.match(snippet, /"name": "Mod \\"Special\\" Name"/);
  });
});
