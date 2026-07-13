import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeStoragePlan,
  deduplicateMods,
  estimateTotalBytes,
  fitBytesForSummary,
  SIZE_COVERAGE_FIT_THRESHOLD,
} from '../web/functions/lib/storage-calc.ts';
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

  it('reads Version size from workshop dl text blob', () => {
    const html =
      '<section><dl>Rating93%Version0.6.10Game Version1.7.0.41Version size67.24 KBSubscribers5,455Downloads12,345</dl></section>';
    assert.equal(parseReforgerSizeBytesFromHtml(html), Math.round(67.24 * 1024));
  });

  it('reads Version size from App Router dt/dd markup', () => {
    const html =
      '<dt>Version size</dt><dd class="flex items-center gap-1">339.89 MB</dd>';
    assert.equal(
      parseReforgerSizeBytesFromHtml(html),
      Math.round(339.89 * 1024 ** 2)
    );
  });

  it('reads VersionSize numeric field from embedded JSON', () => {
    const html = '{"VersionSize":356397017,"name":"WCS_Armaments"}';
    assert.equal(parseReforgerSizeBytesFromHtml(html), 356397017);
  });
});

describe('analyzeStoragePlan', () => {
  const mod = (id: string, name: string, sizeBytes: number | null) => ({ id, name, sizeBytes });

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

  it('includes proxy-only mods in combined modpack total', () => {
    const analysis = analyzeStoragePlan({
      installedMods: [mod('A', 'RHS', 1_000_000_000), mod('B', 'ACE', 500_000_000)],
      wantedServers: [
        { id: 's2', name: 'KOTH', mods: [mod('A', 'RHS', 1_000_000_000), mod('C', 'WCS', 300_000_000)] },
      ],
      availableBytes: 10_000_000_000,
    });

    assert.equal(analysis.toDownload.length, 1);
    assert.equal(analysis.toDownload[0].id, 'C');
    assert.equal(analysis.canRemove.length, 1);
    assert.equal(analysis.canRemove[0].id, 'B');
    assert.equal(analysis.wanted.modCount, 3);
    assert.equal(analysis.wanted.knownBytes, 1_800_000_000);
  });

  it('uses conservative known-only fit when coverage is partial', () => {
    const heavy = 2 * 1024 ** 3;
    const withNullSizes = [
      ...Array.from({ length: 9 }, (_, i) => mod(`H${i}`, `Heavy ${i}`, heavy)),
      ...Array.from({ length: 91 }, (_, i) => mod(`U${i}`, `Unknown ${i}`, null)),
    ];

    const analysis = analyzeStoragePlan({
      installedMods: [],
      wantedServers: [{ id: 's1', name: 'Heavy stack', mods: withNullSizes }],
      availableBytes: 25 * 1024 ** 3,
    });

    assert.equal(analysis.wanted.knownCount, 9);
    assert.ok(analysis.wanted.estimatedBytes > analysis.wanted.knownBytes);
    assert.equal(analysis.fitBasis, 'known');
    assert.ok(analysis.fits);
    assert.equal(analysis.fitBytes, 9 * heavy);
  });

  it('uses estimated fit when coverage meets threshold', () => {
    const mods = Array.from({ length: 15 }, (_, i) =>
      mod(`M${i}`, `Mod ${i}`, 2 * 1024 ** 3)
    );
    const analysis = analyzeStoragePlan({
      installedMods: [],
      wantedServers: [{ id: 's1', name: 'Full', mods }],
      availableBytes: 25 * 1024 ** 3,
    });

    assert.equal(analysis.wanted.coverage, 1);
    assert.equal(analysis.fitBasis, 'estimated');
    assert.equal(analysis.fits, false);
    assert.equal(analysis.fitBytes, 30 * 1024 ** 3);
  });
});

describe('estimateTotalBytes', () => {
  it('extrapolates unknown mods from average of known', () => {
    const total = estimateTotalBytes({
      knownBytes: 10_000_000_000,
      knownCount: 10,
      modCount: 100,
    });
    assert.equal(total, 100_000_000_000);
  });
});

describe('fitBytesForSummary', () => {
  it('prefers known bytes below coverage threshold', () => {
    const summary = { knownBytes: 17 * 1024 ** 3, knownCount: 88, modCount: 128 };
    const fit = fitBytesForSummary(summary);
    assert.equal(fit.basis, 'known');
    assert.equal(fit.bytes, summary.knownBytes);
  });

  it('uses estimated bytes at full coverage', () => {
    const summary = { knownBytes: 20 * 1024 ** 3, knownCount: 100, modCount: 100 };
    const fit = fitBytesForSummary(summary);
    assert.equal(fit.basis, 'estimated');
    assert.equal(fit.bytes, 20 * 1024 ** 3);
  });

  it('uses estimated when no sizes known', () => {
    const fit = fitBytesForSummary(
      { knownBytes: 0, knownCount: 0, modCount: 50 },
      24 * 1024 ** 3
    );
    assert.equal(fit.basis, 'estimated');
    assert.equal(fit.bytes, 24 * 1024 ** 3);
  });
});

describe('SIZE_COVERAGE_FIT_THRESHOLD', () => {
  it('is 90 percent', () => {
    assert.equal(SIZE_COVERAGE_FIT_THRESHOLD, 0.9);
  });
});

describe('formatBytes', () => {
  it('formats gigabytes', () => {
    assert.equal(formatBytes(1024 ** 3), '1.00 GB');
  });
});
