import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReforgerAuthorFromHtml,
  parseReforgerDependenciesFromHtml,
  parseReforgerGalleryFromHtml,
  parseReforgerDatesFromHtml,
  formatWorkshopDate,
  isReforgerWorkshopPageAvailable,
} from '../web/functions/lib/workshop-fetch.ts';

const SAMPLE_NEXT = `<script id="__NEXT_DATA__" type="application/json">{
  "props": {
    "pageProps": {
      "asset": {
        "author": { "username": "Worst Case Scenario" },
        "createdAt": "2024-10-15T12:00:00.000Z",
        "updatedAt": "2026-06-19T08:30:00.000Z",
        "previews": [
          {
            "url": "https://cdn.example/preview.jpg",
            "width": 400,
            "height": 300
          }
        ],
        "screenshots": [
          {
            "url": "https://cdn.example/shot1.jpg",
            "width": 1258,
            "height": 671,
            "thumbnails": {
              "image/jpeg": [
                { "url": "https://cdn.example/shot1-thumb.jpg", "width": 776, "height": 436 }
              ]
            }
          },
          {
            "url": "https://cdn.example/shot2.jpg",
            "width": 1237,
            "height": 671
          }
        ]
      },
      "assetVersionDetail": {
        "dependencies": [
          {
            "version": "0.6.10",
            "dependencies": [],
            "asset": { "id": "5D6EA74A94173EDF", "name": "Enfusion Database Framework" }
          },
          {
            "version": "0.6.18",
            "dependencies": [],
            "asset": { "id": "5D6EBC81EB1842EF", "name": "Enfusion Persistence Framework" }
          }
        ]
      }
    }
  }
}</script>`;

describe('parseReforgerDependenciesFromHtml', () => {
  it('extracts direct dependencies from __NEXT_DATA__', () => {
    const deps = parseReforgerDependenciesFromHtml(SAMPLE_NEXT);
    assert.equal(deps.length, 2);
    assert.equal(deps[0].id, '5D6EA74A94173EDF');
    assert.equal(deps[0].name, 'Enfusion Database Framework');
    assert.equal(deps[0].version, '0.6.10');
    assert.equal(deps[1].id, '5D6EBC81EB1842EF');
  });

  it('returns empty array when __NEXT_DATA__ is missing', () => {
    assert.deepEqual(parseReforgerDependenciesFromHtml('<html></html>'), []);
  });
});

describe('parseReforgerAuthorFromHtml', () => {
  it('extracts author username from asset metadata', () => {
    assert.equal(parseReforgerAuthorFromHtml(SAMPLE_NEXT), 'Worst Case Scenario');
  });

  it('returns null when author is missing', () => {
    assert.equal(parseReforgerAuthorFromHtml('<html></html>'), null);
  });
});

describe('parseReforgerDatesFromHtml', () => {
  it('extracts created and modified dates as DD.MM.YYYY', () => {
    const dates = parseReforgerDatesFromHtml(SAMPLE_NEXT);
    assert.equal(dates.created, '15.10.2024');
    assert.equal(dates.modified, '19.06.2026');
  });

  it('returns nulls when dates are missing', () => {
    assert.deepEqual(parseReforgerDatesFromHtml('<html></html>'), {
      created: null,
      modified: null,
    });
  });
});

describe('formatWorkshopDate', () => {
  it('formats ISO strings to DD.MM.YYYY', () => {
    assert.equal(formatWorkshopDate('2024-10-15T12:00:00.000Z'), '15.10.2024');
  });
});

describe('parseReforgerGalleryFromHtml', () => {
  it('merges previews and screenshots with thumbnails', () => {
    const gallery = parseReforgerGalleryFromHtml(SAMPLE_NEXT);
    assert.equal(gallery.length, 3);
    assert.equal(gallery[0].url, 'https://cdn.example/preview.jpg');
    assert.equal(gallery[1].url, 'https://cdn.example/shot1.jpg');
    assert.equal(gallery[1].thumb, 'https://cdn.example/shot1-thumb.jpg');
    assert.equal(gallery[2].url, 'https://cdn.example/shot2.jpg');
    assert.equal(gallery[2].thumb, undefined);
  });

  it('dedupes identical image URLs', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{
      "props": {
        "pageProps": {
          "asset": {
            "previews": [{ "url": "https://cdn.example/same.jpg" }],
            "screenshots": [{ "url": "https://cdn.example/same.jpg" }]
          }
        }
      }
    }</script>`;
    assert.equal(parseReforgerGalleryFromHtml(html).length, 1);
  });

  it('returns empty array when __NEXT_DATA__ is missing', () => {
    assert.deepEqual(parseReforgerGalleryFromHtml('<html></html>'), []);
  });
});

describe('isReforgerWorkshopPageAvailable', () => {
  it('returns true when asset id and name exist in __NEXT_DATA__', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{
      "props": { "pageProps": { "asset": { "id": "ABC123", "name": "Test Mod" } } }
    }</script>`;
    assert.equal(isReforgerWorkshopPageAvailable(html), true);
  });

  it('returns false for empty or asset-less pages', () => {
    assert.equal(isReforgerWorkshopPageAvailable('<html></html>'), false);
    assert.equal(
      isReforgerWorkshopPageAvailable(
        `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>`
      ),
      false
    );
  });

  it('returns false when asset record lacks id or name', () => {
    assert.equal(isReforgerWorkshopPageAvailable(SAMPLE_NEXT), false);
  });
});
