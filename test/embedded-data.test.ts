import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeJsonForScript,
  injectEmbeddedData,
  injectHeadTag,
  buildEmbeddedServerScript,
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
