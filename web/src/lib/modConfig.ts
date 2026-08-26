function modEntry(modId: string, name: string) {
  return {
    modId: modId.trim().toUpperCase(),
    name: name.trim() || modId.trim().toUpperCase(),
  };
}

function formatBlock(modId: string, name: string): string {
  const raw = JSON.stringify(modEntry(modId, name), null, 4);
  return raw
    .split('\n')
    .map((line) => `            ${line}`)
    .join('\n');
}

/** Sidebar preview — indented block with leading comma on its own line. */
export function formatModConfigPreview(modId: string, name: string): string {
  return `,\n${formatBlock(modId, name)}`;
}

/**
 * Ready-to-paste mod block for server config.json — indented for direct paste
 * into `game.mods[]` (outer 12 spaces, inner 16). When `leadingComma` is true
 * the block is prefixed with `,` on its own line (`,\n` + block) for appending
 * after existing entries.
 */
export function formatModConfigSnippet(
  modId: string,
  name: string,
  options?: { leadingComma?: boolean }
): string {
  const block = formatBlock(modId, name);
  if (options?.leadingComma) return `,\n${block}`;
  return block;
}

export interface ServerModConfigEntry {
  id: string;
  name: string;
}

/** Full game.mods[] body — indented blocks joined with `,` at the end of each closing brace line. */
export function formatServerModsConfigSnippet(
  mods: ReadonlyArray<ServerModConfigEntry>
): string {
  if (!mods.length) return '';

  return mods.map((mod) => formatBlock(mod.id, mod.name)).join(',\n');
}
