import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  websiteJsonLd,
  softwareApplicationJsonLd,
  itemListJsonLd,
  howToJsonLd,
} from '../web/src/lib/seoJsonLd.ts';

describe('seoJsonLd', () => {
  it('builds WebSite SearchAction', () => {
    const ld = websiteJsonLd();
    assert.equal(ld['@type'], 'WebSite');
    assert.ok((ld.potentialAction as { target: { urlTemplate: string } }).target.urlTemplate.includes('{search_term_string}'));
  });

  it('builds SoftwareApplication for a mod', () => {
    const ld = softwareApplicationJsonLd({
      name: 'RHS',
      url: 'https://reforgermods.com/mod/ABC',
      description: 'Rank #1',
      modId: 'ABC',
      players: 100,
    });
    assert.equal(ld['@type'], 'SoftwareApplication');
    assert.equal(ld.identifier, 'ABC');
  });

  it('builds ItemList positions', () => {
    const ld = itemListJsonLd({
      name: 'Top',
      description: 'd',
      url: 'https://reforgermods.com/',
      items: [{ name: 'A', url: 'https://reforgermods.com/mod/A' }],
    });
    assert.equal(ld.numberOfItems, 1);
    assert.equal((ld.itemListElement as Array<{ position: number }>)[0].position, 1);
  });

  it('builds HowTo steps', () => {
    const ld = howToJsonLd({
      name: 'Guide',
      description: 'd',
      url: 'https://reforgermods.com/how-to',
      steps: [{ name: 'One', text: 'Do one' }],
    });
    assert.equal(ld['@type'], 'HowTo');
    assert.equal((ld.step as unknown[]).length, 1);
  });
});
