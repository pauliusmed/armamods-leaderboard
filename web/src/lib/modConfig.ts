function modEntry(modId: string, name: string) {
  return {
    modId: modId.trim().toUpperCase(),
    name: name.trim() || modId.trim().toUpperCase(),
  };
}

/** Sidebar preview — clean object, same as copy snippet (no leading comma). */
export function formatModConfigPreview(modId: string, name: string): string {
  return JSON.stringify(modEntry(modId, name), null, 2);
}

/**
 * Ready-to-paste mod block for server config.json — trailing-comma style.
 * Returns a plain object `{\n  "modId": "...",\n  "name": "..."\n}` without a
 * leading comma. Use `formatServerModsConfigSnippet` for a comma-separated list.
 * The optional `leadingComma` flag is kept for backward compat — when true it
 * prefixes `,` for appending after existing entries.
 */
export function formatModConfigSnippet(
  modId: string,
  name: string,
  options?: { leadingComma?: boolean }
): string {
  const body = JSON.stringify(modEntry(modId, name), null, 2);
  if (options?.leadingComma) return `,${body}`;
  return body;
}

export interface ServerModConfigEntry {
  id: string;
  name: string;
}

/** Full game.mods[] body — trailing comma between blocks, no trailing comma after last. */
export function formatServerModsConfigSnippet(
  mods: ReadonlyArray<ServerModConfigEntry>
): string {
  if (!mods.length) return '';

  return mods
    .map((mod) => formatModConfigSnippet(mod.id, mod.name, { leadingComma: false }))
    .join(',\n');
}
