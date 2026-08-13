function modEntry(modId: string, name: string) {
  return {
    modId: modId.trim().toUpperCase(),
    name: name.trim() || modId.trim().toUpperCase(),
  };
}

/** Compact JSON for sidebar preview — same comma-first layout as the copy snippet. */
export function formatModConfigPreview(modId: string, name: string): string {
  return `,${JSON.stringify(modEntry(modId, name), null, 2)}`;
}

/**
 * Ready-to-paste mod block for server config.json — comma-first style.
 * The comma sits *before* the block on the same line as `{`, so the last mod in a
 * list never carries a trailing comma (trailing comma after a final entry is invalid
 * in Reforger config.json).
 */
export function formatModConfigSnippet(
  modId: string,
  name: string,
  options?: { leadingComma?: boolean }
): string {
  const body = JSON.stringify(modEntry(modId, name), null, 2);
  if (options?.leadingComma === false) return body;
  return `,${body}`;
}

export interface ServerModConfigEntry {
  id: string;
  name: string;
}

/** Full game.mods[] body — comma-first between blocks, first entry has no comma. */
export function formatServerModsConfigSnippet(
  mods: ReadonlyArray<ServerModConfigEntry>
): string {
  if (!mods.length) return '';

  return mods
    .map((mod, index) =>
      formatModConfigSnippet(mod.id, mod.name, {
        leadingComma: index > 0,
      })
    )
    .join('\n');
}
