import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseReforgerAuthorFromHtml, parseReforgerDependenciesFromHtml } from '../web/functions/lib/workshop-fetch.ts';

const SAMPLE_NEXT = `<script id="__NEXT_DATA__" type="application/json">{
  "props": {
    "pageProps": {
      "asset": {
        "author": { "username": "Worst Case Scenario" }
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
