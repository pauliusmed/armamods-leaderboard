import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Vite alias not available in root tests — inline the same rules as web/src/lib/workshop.ts
function workshopPageUrl(modId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  if (game === 'arma3' || /^\d+$/.test(modId)) {
    return `https://steamcommunity.com/sharedfiles/filedetails/?id=${encodeURIComponent(modId)}`;
  }
  return `https://reforger.armaplatform.com/workshop/${encodeURIComponent(modId)}`;
}

function modThumbnailUrl(modId: string, game: 'reforger' | 'arma3' = 'reforger'): string {
  return `/api/og/preview/mod/${encodeURIComponent(modId)}?game=${game}`;
}

describe('workshop URLs', () => {
  it('builds Reforger workshop page for GUID ids', () => {
    assert.equal(
      workshopPageUrl('ABC123-DEF', 'reforger'),
      'https://reforger.armaplatform.com/workshop/ABC123-DEF'
    );
  });

  it('builds Steam workshop for arma3 game', () => {
    assert.match(workshopPageUrl('12345', 'arma3'), /steamcommunity\.com\/sharedfiles/);
    assert.match(workshopPageUrl('12345', 'arma3'), /id=12345/);
  });

  it('builds relative thumbnail API path', () => {
    assert.equal(modThumbnailUrl('ABC', 'reforger'), '/api/og/preview/mod/ABC?game=reforger');
    assert.equal(modThumbnailUrl('99', 'arma3'), '/api/og/preview/mod/99?game=arma3');
  });
});
