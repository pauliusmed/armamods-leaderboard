import type { ShareGame } from './share-meta';

// ──────────────────────────────────────────────
// Mod sizes bundle — vienas KV raktas visų modų download dydžiams.
//
// Problema: kolektorius kas pilną run'ą skaitė po `cache:mod-size:` raktą
// KIEKVIENAM modui (~22k reads/run). Tai buvo didžiausias trending_snapshots
// reads generatorius (~90% visų account'o KV read'ų, ~33M/mėn).
//
// Sprendimas: kolektorius laiko vieną agreguotą raktą — attach skaito iš jo
// (1 read/run), o po workshop warm run'o švieži dydžiai mergerinami atgal.
// Per-mod raktai rašomi toliau nepriekaištingai: jų reikia worker'io
// resolveModSizeBytes fallback'ui (modai už leaderboard chunk'ų ribų).
// ──────────────────────────────────────────────

export interface ModSizesBundle {
  generatedAt: string;
  sizes: Record<string, number>;
}

export const MOD_SIZES_BUNDLE_TTL_SECONDS = 90000; // 25h — kolektorius bėga kas ~1–2 val.

export function modSizesBundleCacheKey(game: ShareGame): string {
  return `cache:bundle:modsizes:${String(game).toLowerCase()}`;
}

/**
 * Merge: teigiamas finite sizeBytes perrašo seną; null/undefined/≤0 reiškia
 * „šį run'ą nežinau" — sena reikšmė lieka. Įrašai, kurių nėra updates, NEIŠMETAMI:
 * ilgoji uoda (modai ne šio run'o BM sąraše) turi gyventi banke toliau.
 */
export function buildModSizesBundle(
  updates: Array<{ id: string; sizeBytes: number | null | undefined }>,
  existing: ModSizesBundle | null
): ModSizesBundle {
  const sizes: Record<string, number> = { ...(existing?.sizes ?? {}) };
  for (const u of updates) {
    if (!u?.id) continue;
    if (typeof u.sizeBytes === 'number' && Number.isFinite(u.sizeBytes) && u.sizeBytes > 0) {
      sizes[String(u.id).toUpperCase()] = u.sizeBytes;
    }
  }
  return { generatedAt: new Date().toISOString(), sizes };
}

/** Pripildo row.sizeBytes tik ten, kur dar nėra teigiamo dydžio. Grąžina pripildytų kiekį. */
export function applySizesFromBundle(
  bundle: ModSizesBundle,
  rows: Array<{ id: string; sizeBytes?: number | null }>
): number {
  let applied = 0;
  for (const row of rows) {
    if (!row?.id) continue;
    if (typeof row.sizeBytes === 'number' && row.sizeBytes > 0) continue;
    const n = bundle.sizes[String(row.id).toUpperCase()];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
      row.sizeBytes = n;
      applied++;
    }
  }
  return applied;
}
