import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStoragePlan, deduplicateMods } from '../web/functions/lib/storage-calc.ts';
import { formatBytes, parseHumanSizeToBytes } from '../web/functions/lib/storage-format.ts';
import { parseReforgerSizeBytesFromHtml } from '../web/functions/lib/workshop-fetch.ts';

describe('parseHumanSizeToBytes', () => {
  it('parses KB and GB labels', () => {
    assert.equal(parseHumanSizeToBytes('116.72 KB'), 119521);
    assert.equal(parseHumanSizeToBytes('1.5 GB'), Math.round(1.5 * 1024 ** 3));
  });
});

describe('parseReforgerSizeBytesFromHtml', () => {
  it('reads numeric size from assetVersionDetail', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{
      "props": { "pageProps": { "assetVersionDetail": { "size": 119520 } } }
    }</script>`;
    assert.equal(parseReforgerSizeBytesFromHtml(html), 119520);
  });

  it('reads formatted version size string', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{
      "props": { "pageProps": { "assetVersionDetail": { "versionSize": "116.72 KB" } } }
    }</script>`;
    assert.equal(parseReforgerSizeBytesFromHtml(html), 119521);
  });

  it('reads visible Version size label from HTML', () => {
    const html = '<html><body>Version size116.72 KB</body></html>';
    assert.equal(parseReforgerSizeBytesFromHtml(html), 119521);
  });
});

describe('analyzeStoragePlan', () => {
  const mod = (id: string, name: string, sizeBytes: number) => ({ id, name, sizeBytes });

  it('deduplicates shared mods across servers', () => {
    const union = deduplicateMods([
      [mod('A', 'RHS', 1_000_000_000), mod('B', 'ACE', 500_000_000)],
      [mod('A', 'RHS', 1_000_000_000), mod('C', 'WCS', 300_000_000)],
    ]);
    assert.equal(union.length, 3);
  });

  it('computes download and removable mods when switching servers', () => {
    const analysis = analyzeStoragePlan({
      installedMods: [mod('A', 'RHS', 1_000_000_000), mod('B', 'ACE', 200_000_000)],
      wantedServers: [
        { id: 's2', name: 'Server B', mods: [mod('C', 'WCS', 300_000_000)] },
      ],
      availableBytes: 2_000_000_000,
    });

    assert.equal(analysis.toDownload.length, 1);
    assert.equal(analysis.toDownload[0].id, 'C');
    assert.equal(analysis.canRemove.length, 2);
    assert.ok(analysis.fits);
  });
});

describe('formatBytes', () => {
  it('formats gigabytes', () => {
    assert.equal(formatBytes(1024 ** 3), '1.00 GB');
  });
});
