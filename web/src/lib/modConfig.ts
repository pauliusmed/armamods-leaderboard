/** Indent for one mod entry inside `game.mods[]` in Reforger config.json. */
const MOD_ENTRY_INDENT = '            ';

/** Ready-to-paste mod block for server config.json (includes trailing comma). */
export function formatModConfigSnippet(modId: string, name: string): string {
  const entry = {
    modId: modId.trim().toUpperCase(),
    name: name.trim() || modId.trim().toUpperCase(),
  };

  const lines = JSON.stringify(entry, null, 4).split('\n');
  lines[lines.length - 1] = `${lines[lines.length - 1]},`;

  return lines.map((line) => `${MOD_ENTRY_INDENT}${line}`).join('\n');
}
