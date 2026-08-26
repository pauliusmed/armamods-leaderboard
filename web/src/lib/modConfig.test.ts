import { describe, expect, it } from 'vitest';
import {
  formatModConfigPreview,
  formatModConfigSnippet,
  formatServerModsConfigSnippet,
} from './modConfig';

describe('modConfig formatting', () => {
  it('snippet without leading comma starts with the indented block brace', () => {
    const out = formatModConfigSnippet('6a0ee1a1d5261244', 'Dynamic Weather');
    expect(out.trimStart().startsWith('{')).toBe(true);
    expect(out).toContain('"modId": "6A0EE1A1D5261244"');
  });

  it('snippet with leadingComma prepends comma on its own line (append-ready)', () => {
    const out = formatModConfigSnippet('6A0EE1A1D5261244', 'Dynamic Weather', {
      leadingComma: true,
    });
    expect(out).toMatch(/^,\n\s+\{/);
    // Pasting after a previous entry must yield "}\n,\n{…" — valid JSON, nothing glued.
    expect(`}\n${out}`).toMatch(/\}\n,\n\s+\{/);
  });

  it('preview always carries the leading comma (matches copied snippet)', () => {
    const preview = formatModConfigPreview('6A0EE1A1D5261244', 'Dynamic Weather');
    const copied = formatModConfigSnippet('6A0EE1A1D5261244', 'Dynamic Weather', {
      leadingComma: true,
    });
    expect(preview).toBe(copied);
  });

  it('falls back to modId when name is blank and uppercases reforger ids', () => {
    const out = formatModConfigSnippet(' 68c6d7dd75dbdb57 ', '  ', { leadingComma: true });
    expect(out).toContain('"modId": "68C6D7DD75DBDB57"');
    expect(out).toContain('"name": "68C6D7DD75DBDB57"');
  });

  it('server list joins blocks with a comma after each closing brace, no leading comma', () => {
    const out = formatServerModsConfigSnippet([
      { id: '6A0EE1A1D5261244', name: 'A' },
      { id: '68C6D7DD75DBDB57', name: 'B' },
    ]);
    expect(out.trimStart().startsWith('{')).toBe(true);
    expect(out).toMatch(/\},\n\s+\{/);
  });

  it('server list is empty for no mods', () => {
    expect(formatServerModsConfigSnippet([])).toBe('');
  });
});
