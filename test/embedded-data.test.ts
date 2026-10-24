import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeJsonForScript,
  injectEmbeddedData,
  injectHeadTag,
  buildEmbeddedServerScript,
  replaceStaticHeadSeo,
  EMBEDDED_SERVER_ELEMENT_ID,
} from '../web/functions/lib/embedded-data.ts';

describe('escapeJsonForScript', () => {
  it('escapes < so </script> cannot break out of the tag', () => {
    const json = '{"name":"</script><script>alert(1)</script>"}';
    const escaped = escapeJsonForScript(json);
    assert.ok(!escaped.includes('</script>'), 'raw </script> must not survive');
    // Escape'uojamas tik `<` (`\u003c`) — to pakanka: `</script>` seka tampa nebeįmanoma
    assert.ok(escaped.includes('\\u003c/script>'), JSON.stringify(escaped));
  });

  it('leaves safe JSON untouched', () => {
    const json = '{"id":"123","name":"Plain Server"}';
    assert.equal(escapeJsonForScript(json), json);
  });
});

describe('injectEmbeddedData', () => {
  it('inserts the script tag before </body>', () => {
    const html = '<html><body><div id="root"></div></body></html>';
    const out = injectEmbeddedData(html, '<script id="x"></script>');
    assert.ok(out.includes('<script id="x"></script></body></html>'));
  });

  it('appends when </body> is missing', () => {
    const out = injectEmbeddedData('<div id="root"></div>', '<script id="x"></script>');
    assert.ok(out.endsWith('<script id="x"></script>'));
  });
});

describe('injectHeadTag', () => {
  it('inserts the tag before </head>', () => {
    const html = '<html><head><title>T</title></head><body></body></html>';
    const out = injectHeadTag(html, '<link rel="preconnect" href="https://cdn.example">');
    assert.ok(out.includes('<link rel="preconnect" href="https://cdn.example"></head>'));
  });

  it('appends when </head> is missing', () => {
    const out = injectHeadTag('<div></div>', '<link rel="preconnect">');
    assert.ok(out.endsWith('<link rel="preconnect">'));
  });
});

describe('buildEmbeddedServerScript', () => {
  it('builds a JSON script tag with the element id and escaped data', () => {
    const tag = buildEmbeddedServerScript({ id: '42', name: '<b>Server</b>' });
    assert.ok(tag.startsWith(`<script type="application/json" id="${EMBEDDED_SERVER_ELEMENT_ID}">`));
    assert.ok(tag.endsWith('</script>'));
    // Vardas su <b> turi būti escape'intas — HTML neatvaizduojamas kaip HTML
    assert.ok(tag.includes('\\u003cb>'), JSON.stringify(tag));
    // Grąžinamas JSON turi dekodavus duoti tą patį objektą
    const inner = tag.slice(tag.indexOf('>') + 1, -'</script>'.length);
    assert.deepEqual(JSON.parse(inner), { id: '42', name: '<b>Server</b>' });
  });
});

describe('replaceStaticHeadSeo', () => {
  const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#101923" />
    <title>Arma Mods - Real-time Analytics & Trends</title>
    <meta name="description" content="Discover and track the most popular Arma mods." />
    <meta name="keywords" content="Arma Reforger, Arma 3" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://reforgermods.com/" />
    <meta property="og:title" content="Arma Mods - Real-time Analytics & Trends" />
    <meta property="og:image" content="https://reforgermods.com/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Arma Mods - Real-time Analytics & Trends" />
  </head>
  <body><div id="root"></div></body>
</html>`;

  it('pašalina globalų title, description, og ir twitter bloką', () => {
    const out = replaceStaticHeadSeo(SHELL);
    assert.equal(out.includes('<title>'), false);
    assert.equal(out.includes('name="description"'), false);
    assert.equal(out.includes('name="keywords"'), false);
    assert.equal(out.includes('property="og:'), false);
    assert.equal(out.includes('name="twitter:'), false);
  });

  it('palieka techninius head tag\'us (charset, viewport, favicon)', () => {
    const out = replaceStaticHeadSeo(SHELL);
    assert.ok(out.includes('charset="UTF-8"'));
    assert.ok(out.includes('name="viewport"'));
    assert.ok(out.includes('rel="icon"'));
  });

  it('nekeičia HTML be SEO bloko', () => {
    const html = '<html><head><meta name="viewport" content="width=device-width" /></head><body></body></html>';
    assert.equal(replaceStaticHeadSeo(html), html);
  });
});
