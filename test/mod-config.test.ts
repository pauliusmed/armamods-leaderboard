import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatModConfigPreview,
  formatModConfigSnippet,
  formatServerModsConfigSnippet,
} from '../web/src/lib/modConfig.ts';

describe('formatModConfigSnippet', () => {
  it('formats a game.mods[] entry without leading comma by default', () => {
    const snippet = formatModConfigSnippet('64f47ec0f5aaee26', 'Slav Life - Eastern Bloc Autos');
    assert.match(snippet, /^\{/);
    assert.doesNotMatch(snippet, /^,/);
    assert.match(snippet, /"modId": "64F47EC0F5AAEE26"/);
    assert.match(snippet, /"name": "Slav Life - Eastern Bloc Autos"\n\}/);
    assert.doesNotMatch(snippet, /\},\s*$/);
  });

  it('prefixes a leading comma when requested', () => {
    const snippet = formatModConfigSnippet('64f47ec0f5aaee26', 'Slav Life - Eastern Bloc Autos', {
      leadingComma: true,
    });
    assert.match(snippet, /^,\{/);
    assert.match(snippet, /"modId": "64F47EC0F5AAEE26"/);
  });

  it('escapes quotes in mod names', () => {
    const snippet = formatModConfigSnippet('AAAAAAAAAAAAAAAA', 'Mod "Special" Name');
    assert.match(snippet, /"name": "Mod \\"Special\\" Name"/);
  });
});

describe('formatServerModsConfigSnippet', () => {
  it('joins mod blocks with trailing comma between entries', () => {
    const snippet = formatServerModsConfigSnippet([
      { id: '65063d992f5ef8c8', name: 'NLR - Americana' },
      { id: '66f0560f1bde732a', name: 'DynamicEconomy' },
    ]);

    assert.match(snippet, /^\{/);
    assert.match(snippet, /"modId": "65063D992F5EF8C8"/);
    assert.match(snippet, /"name": "NLR - Americana"\n\},\n\{/);
    assert.match(snippet, /"name": "DynamicEconomy"\n\}$/);
    assert.doesNotMatch(snippet, /DynamicEconomy"\n\},\s*$/);
  });

  it('returns empty string for vanilla servers', () => {
    assert.equal(formatServerModsConfigSnippet([]), '');
  });
});

describe('formatModConfigPreview', () => {
  it('shows clean object without leading comma or config.json indent', () => {
    const preview = formatModConfigPreview('629B2BA37EFFD577', 'WCS_Armaments');
    assert.match(preview, /^\{\n\s*"modId": "629B2BA37EFFD577"/);
    assert.doesNotMatch(preview, /^,/);
    assert.doesNotMatch(preview, /^            \{/);
  });
});
