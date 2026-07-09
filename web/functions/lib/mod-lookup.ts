function findMatchingBrace(text: string, openPos: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = openPos; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && inStr) {
      i++;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function modIdCandidates(modId: string): string[] {
  return [...new Set([modId, modId.toUpperCase(), modId.toLowerCase()])];
}

/** coDeployed entries only have id/name/count — not full leaderboard stats. */
export function isFullModRecord(obj: Record<string, unknown>, targetUpper: string): boolean {
  if (!obj.id || String(obj.id).toUpperCase() !== targetUpper) return false;
  return typeof obj.overallRank === 'number' || typeof obj.totalPlayers === 'number';
}

/** Parse one mod object from preloaded shard text (testable without KV). */
export function extractModFromChunks(
  chunksText: (string | null)[],
  modId: string
): Record<string, unknown> | null {
  const targetUpper = modId.toUpperCase();

  for (const chunkText of chunksText) {
    if (!chunkText) continue;

    for (const candidate of modIdCandidates(modId)) {
      const searchStr = `"id":"${candidate}"`;
      let pos = 0;

      while (pos < chunkText.length) {
        const idPos = chunkText.indexOf(searchStr, pos);
        if (idPos === -1) break;

        const startPos = chunkText.lastIndexOf('{', idPos);
        const endPos = findMatchingBrace(chunkText, startPos);
        if (startPos !== -1 && endPos !== -1) {
          try {
            const obj = JSON.parse(chunkText.slice(startPos, endPos + 1)) as Record<string, unknown>;
            if (isFullModRecord(obj, targetUpper)) {
              return obj;
            }
          } catch {
            /* try next occurrence */
          }
        }

        pos = idPos + searchStr.length;
      }
    }
  }

  return null;
}
