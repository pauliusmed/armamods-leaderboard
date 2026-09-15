import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmbed, collectStale } from '../scripts/post-stale-alert.mjs';

describe('collectStale', () => {
  it('keeps only games above the stale threshold', () => {
    const stale = collectStale({
      reforger: { isStale: true, staleHours: 3.7, lastUpdate: '2026-09-14T15:42:31.817Z' },
      arma3: { isStale: false, staleHours: 0.3, lastUpdate: '2026-09-14T15:46:45.486Z' },
    });

    assert.deepEqual(stale, [
      { game: 'reforger', lastUpdate: '2026-09-14T15:42:31.817Z', staleHours: 3.7 },
    ]);
  });

  it('ignores entries without a numeric staleHours', () => {
    assert.equal(collectStale({ reforger: { isStale: true } }).length, 0);
  });
});

describe('buildEmbed', () => {
  it('includes per-game totals and diagnostic links', () => {
    const embed = buildEmbed(
      [{ game: 'reforger', lastUpdate: '2026-09-14T15:42:31.817Z', staleHours: 3.7 }],
      { reforger: { kv: 'ok', mods: { total: 18142 }, servers: { total: 7332 } } },
    );
    const entry = embed.embeds[0];

    assert.match(entry.title, /STALE DATA/);
    assert.ok(entry.description.includes('actions/workflows/collector.yml'));
    assert.ok(entry.description.includes('/api/health'));
    assert.equal(entry.fields.length, 1);
    assert.equal(entry.fields[0].name, 'reforger');
    assert.ok(entry.fields[0].value.includes('stale **3.7h**'));
    assert.ok(entry.fields[0].value.includes('mods 18142'));
    assert.ok(entry.fields[0].value.includes('servers 7332'));
    assert.ok(entry.fields[0].value.includes('KV ok'));
  });

  it('tolerates missing check details', () => {
    const embed = buildEmbed([{ game: 'arma3', lastUpdate: null, staleHours: 4 }], {});
    const entry = embed.embeds[0];

    assert.ok(entry.fields[0].value.includes('unknown'));
    assert.ok(entry.fields[0].value.includes('mods ?'));
    assert.ok(entry.fields[0].value.includes('servers ?'));
  });
});
