import type { Server } from '../types';

const ELEMENT_ID = 'embedded-server';

/**
 * Skaito /server/:id HTML'e embedded serverio JSON (įdėtą worker'io, žr. functions/lib/embedded-data.ts).
 * Grąžina null, kai elemento nėra (kiti puslapiai / API navigacija) arba id nesutampa
 * (klientinė navigacija iš kito serverio puslapio) — tada normalus API fetch.
 */
export function readEmbeddedServer(serverId: string | undefined): Server | null {
  if (!serverId || typeof document === 'undefined') return null;
  const el = document.getElementById(ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    const parsed = JSON.parse(el.textContent) as Server;
    return parsed?.id === serverId ? parsed : null;
  } catch {
    return null;
  }
}
