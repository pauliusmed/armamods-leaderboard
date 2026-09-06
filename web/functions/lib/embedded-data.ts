/**
 * Serverio puslapio embedded duomenys: serverio JSON įdėtas į HTML
 * `<script type="application/json">` tag'ą. Client'as (ServerDetail) jį skaito
 * iškart po React boot — API round-trip critical path'e dingsta (PSI mobile LCP 6.3 s).
 * Botams share prerender'is lieka atskiras (share-meta.ts).
 */

export const EMBEDDED_SERVER_ELEMENT_ID = 'embedded-server';

/** Escape'inti JSON script tag'ui: `<` → `\u003c` — apsauga nuo `</script>` break-out. */
export function escapeJsonForScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

/** Įterpia script tag'ą prieš `</body>`; jei HTML neturi jo — append'ina pabaigoje. */
export function injectEmbeddedData(html: string, scriptTag: string): string {
  const idx = html.lastIndexOf('</body>');
  return idx === -1 ? html + scriptTag : html.slice(0, idx) + scriptTag + html.slice(idx);
}

/** Įterpia tag'ą prieš `</head>` (pvz., preconnect link'ai); jei `</head>` nėra — append'ina. */
export function injectHeadTag(html: string, tag: string): string {
  const idx = html.indexOf('</head>');
  return idx === -1 ? html + tag : html.slice(0, idx) + tag + html.slice(idx);
}

export function buildEmbeddedServerScript(server: unknown): string {
  const json = escapeJsonForScript(JSON.stringify(server));
  return `<script type="application/json" id="${EMBEDDED_SERVER_ELEMENT_ID}">${json}</script>`;
}
