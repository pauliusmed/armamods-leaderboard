/**
 * Mod alias (re-upload) resolution.
 *
 * Kai autorius persikelia modą po nauju GUID (senas Workshop itemas ištrintas),
 * senas ID lieka serverių telemetrijoje ir paieškoje. Šis modulis leidžia
 * deterministiškai susieti seną → naują GUID, kad edge galėtų 301 redirectinti
 * ir slėpti seną įrašą iš viešų sąrašų.
 *
 * Sąjunga griežta (be tylaus spėjimo): alias kuriamas TIK kai senas itemas
 * nepasiekiamas IR egzistuoja LYGIAGAI VIENAS kandidatas su ta pačia
 * normalizuota pavadinimo + autoriaus pora. 0 arba >1 kandidatų → nesujungiame.
 */
import type { ShareGame } from './share-meta';

export type ModAliasRecord = {
  targetId: string;
  matchedBy: 'name+author';
  createdAt: string;
};

/** Aliass turi gyventi ilgiau nei workshop/size cache (7 d.) – 365 d. self-clean. */
export const MOD_ALIAS_TTL_SECONDS = 31536000;

/** Minimali KV kliento sąsaja – tenkina ir CloudflareKVClient, ir KVNamespace. */
type KvLike = {
  get(key: string, type: 'text'): Promise<string | null>;
};

export function modAliasKey(game: ShareGame, modId: string): string {
  return `cache:mod-alias:${game}:${modId.toUpperCase()}`;
}

export function modAliasIndexKey(game: ShareGame): string {
  return `cache:mod-aliases:${game}`;
}

export function normalizeModName(name: string | null | undefined): string {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function sameAuthor(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a || '').trim().toLowerCase();
  const right = (b || '').trim().toLowerCase();
  return left.length > 0 && left === right;
}

/**
 * Grąžina vienintelio kandidato ID (uppercase) arba null.
 * Reikalauja abiejų pusių autoriaus – be jo sutapimas per silpnas.
 */
export function findModAliasTarget(
  oldMod: { id: string; name?: string | null; author?: string | null },
  candidates: Array<{ id: string; name?: string | null; author?: string | null }>
): string | null {
  const oldName = normalizeModName(oldMod?.name);
  const oldAuthor = (oldMod?.author || '').trim();
  if (!oldName || !oldAuthor) return null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const oldUpper = String(oldMod.id || '').toUpperCase();
  if (!oldUpper) return null;

  const matches = candidates.filter((candidate) => {
    const candidateUpper = String(candidate?.id || '').toUpperCase();
    if (!candidateUpper || candidateUpper === oldUpper) return false;
    if (normalizeModName(candidate?.name) !== oldName) return false;
    return sameAuthor(candidate?.author, oldMod.author);
  });

  // 0 arba >1 kandidatų – dviprasmybė, nesujungiame.
  if (matches.length !== 1) return null;
  return matches[0].id.toUpperCase();
}

/** Senųjų (nukreiptų) modų ID aibė sąrašų filtravimui – vienas KV read. */
export async function loadAliasedModIdSet(
  kv: KvLike,
  game: ShareGame
): Promise<Set<string>> {
  let raw: unknown = null;
  try {
    raw = await kv.get(modAliasIndexKey(game), 'text');
  } catch {
    return new Set();
  }
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === 'string').map((id) => id.toUpperCase())
    );
  } catch {
    return new Set();
  }
}
