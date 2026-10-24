import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../web/worker';
import { buildServerIndex } from '../web/functions/lib/server-lookup';
import { clearModuleCache } from '../web/functions/lib/module-cache';

/**
 * Kanoninis `/server/:id` puslapis: tas pats kūnas žmogui ir indeksuotojui.
 *
 * Anksčiau crawler'is gaudavo 2,4 KB share HTML, o žmogus — 18 KB SPA su
 * embedded duomenimis, abu su `public` politika TAME PAČIAME URL. Workers
 * Caching neatskiria variantų be `Vary`, todėl vienas galėjo būti patiektas
 * kitam. Dabar kūnas vienas, o socialinių tinklų botai kešuojami atskirai.
 */

const SHELL = `<!doctype html><html><head>
    <meta charset="UTF-8" />
    <title>Arma Mods - Real-time Analytics & Trends</title>
    <meta name="description" content="global" />
    <meta property="og:title" content="global" />
  </head><body><div id="root"></div></body></html>`;

const SERVER = {
  id: 'srv-1',
  name: 'Test "Server" <1>',
  players: 10,
  maxPlayers: 64,
  sqeRank: 3,
  mods: [],
};

const index = buildServerIndex([[SERVER]]);

const KV_ENTRIES: Record<string, string> = {
  'cache:servers-index': JSON.stringify(index),
  'cache:servers:meta': JSON.stringify({ total: 1, chunks: 1 }),
  'cache:servers:0': JSON.stringify([SERVER]),
};

let previousCaches: unknown;

beforeEach(() => {
  clearModuleCache();
  previousCaches ??= (globalThis as { caches?: unknown }).caches;
  (globalThis as { caches?: unknown }).caches = {
    default: { match: async () => undefined, put: async () => undefined },
    open: async () => ({ match: async () => undefined, put: async () => undefined }),
  };
});

function makeEnv() {
  return {
    TRENDING_KV: {
      get: async (key: string, type?: string) => {
        const value = KV_ENTRIES[key];
        if (value === undefined) return null;
        return type === 'json' ? JSON.parse(value) : value;
      },
    },
    HISTORY_BUCKET: null,
    ASSETS: {
      fetch: async () =>
        new Response(SHELL, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }),
    },
    PAGE_RATE_LIMITER: undefined,
    ENVIRONMENT: 'test',
  };
}

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

const UA = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  googlebot:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.52 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ahrefs: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
};

async function get(path: string, userAgent: string) {
  const response = await worker.fetch(
    new Request(`https://reforgermods.com${path}`, { method: 'GET', headers: { 'user-agent': userAgent } }),
    makeEnv() as never,
    ctx
  );
  return { response, body: await response.text() };
}

describe('/server/:id — kanoninis kūnas', () => {
  it('žmogus ir Googlebot gauna IDENTIŠKĄ HTML su meta ir embedded duomenimis', async () => {
    const human = await get('/server/srv-1', UA.chrome);
    const bot = await get('/server/srv-1', UA.googlebot);

    assert.equal(human.body, bot.body, 'turinys turi būti vienodas');
    assert.equal(
      human.response.headers.get('Cache-Control'),
      'public, max-age=300, stale-while-revalidate=3600'
    );
    assert.equal(bot.response.headers.get('Cache-Control'), human.response.headers.get('Cache-Control'));

    for (const { body } of [human, bot]) {
      assert.ok(body.includes('id="embedded-server"'), 'embedded duomenys');
      assert.ok(body.includes('<title data-ssr>Test &quot;Server&quot; &lt;1> | Arma Reforger Server</title>'));
      assert.ok(body.includes('application/ld+json'), 'JSON-LD');
      assert.ok(body.includes('rel="canonical" href="https://reforgermods.com/server/srv-1"'));
      // Globalus statinio shell meta pakeistas, ne pridėtas
      assert.equal(body.includes('content="global"'), false);
      assert.equal(body.match(/<title/g)?.length, 1, 'tik vienas <title>');
    }
  });

  it('AhrefsBot (SEO crawler) nebegauna socialinio share HTML su meta refresh', async () => {
    const { body } = await get('/server/srv-1', UA.ahrefs);
    assert.equal(body.includes('http-equiv="refresh"'), false);
    assert.ok(body.includes('id="embedded-server"'));
  });

  it('Discordbot gauna share HTML, bet jis NĖRA bendrai kešuojamas (private)', async () => {
    const { response, body } = await get('/server/srv-1', UA.discord);
    assert.equal(response.headers.get('Cache-Control'), 'private, max-age=0');
    assert.ok(body.includes('http-equiv="refresh"'));
    assert.ok(body.includes('<h1>'));
    assert.equal(body.includes('id="embedded-server"'), false);
  });

  it('nerastas serveris: SPA shell su ta pačia 300 s politika', async () => {
    const { response, body } = await get('/server/00000000', UA.chrome);
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=300, stale-while-revalidate=3600'
    );
    assert.ok(body.includes('<div id="root"></div>'));
  });
});
