import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatModConfigPreview,
  formatModConfigSnippet,
  formatServerModsConfigSnippet,
} from '../web/src/lib/modConfig.ts';

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

describe('formatServerModsConfigSnippet', () => {
  it('joins mod blocks with commas between entries but not on the last', () => {
    const snippet = formatServerModsConfigSnippet([
      { id: '65063d992f5ef8c8', name: 'NLR - Americana' },
      { id: '66f0560f1bde732a', name: 'DynamicEconomy' },
    ]);

    assert.match(snippet, /"modId": "65063D992F5EF8C8"/);
    assert.match(snippet, /"name": "NLR - Americana"\n            \},/);
    assert.match(snippet, /"name": "DynamicEconomy"\n            \}\s*$/);
    assert.doesNotMatch(snippet, /DynamicEconomy"\n            \},/);
  });

  it('returns empty string for vanilla servers', () => {
    assert.equal(formatServerModsConfigSnippet([]), '');
  });
});

describe('formatModConfigPreview', () => {
  it('shows compact JSON without config.json line indent', () => {
    const preview = formatModConfigPreview('629B2BA37EFFD577', 'WCS_Armaments');
    assert.match(preview, /^\{\n  "modId": "629B2BA37EFFD577"/);
    assert.doesNotMatch(preview, /^            \{/);
  });
});
