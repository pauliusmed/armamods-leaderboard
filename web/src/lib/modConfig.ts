/** Indent for one mod entry inside `game.mods[]` in Reforger config.json. */
const MOD_ENTRY_INDENT = '            ';

function modEntry(modId: string, name: string) {
  return {
    modId: modId.trim().toUpperCase(),
    name: name.trim() || modId.trim().toUpperCase(),
  };
}

/** Compact JSON for sidebar preview — copy still uses full config.json indent. */
export function formatModConfigPreview(modId: string, name: string): string {
  const lines = JSON.stringify(modEntry(modId, name), null, 2).split('\n');
  lines[lines.length - 1] = `${lines[lines.length - 1]},`;
  return lines.join('\n');
}

/** Ready-to-paste mod block for server config.json (includes trailing comma). */
export function formatModConfigSnippet(modId: string, name: string): string {
  const lines = JSON.stringify(modEntry(modId, name), null, 4).split('\n');
  lines[lines.length - 1] = `${lines[lines.length - 1]},`;

  return lines.map((line) => `${MOD_ENTRY_INDENT}${line}`).join('\n');
}
