/**
 * Official Bohemia Reforger Workshop API client.
 * Base: https://api-ar-workshop.bistudio.com/workshop-api/api/v3.0/
 *
 * No auth required. Provides catalog listing (batch by ids up to 50/request)
 * and full asset detail. Replaces per-mod HTML scraping for size/author/copy.
 * See docs/DATA_SOURCES_RESEARCH.md.
 */

const WORKSHOP_API_BASE = 'https://api-ar-workshop.bistudio.com/workshop-api/api/v3.0';
const WORKSHOP_API_CLIENT_ID = '$5d81ca9bbdd80f837dfe6380f436013';
const WORKSHOP_API_USER_AGENT = 'Arma Reforger/1.1.0.42 (Client; Windows)';

export const WORKSHOP_BATCH_MAX = 50;

export interface WorkshopApiAuthor {
  id?: string;
  username?: string;
}

export interface WorkshopApiAssetRow {
  id: string;
  name?: string;
  summary?: string | null;
  currentVersionNumber?: string | null;
  currentVersionSize?: number | null;
  currentVersionId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  unlisted?: boolean;
  private?: boolean;
  blocked?: boolean;
  author?: WorkshopApiAuthor | null;
  tags?: Array<{ name?: string }>;
}

export interface WorkshopApiAssetDetail extends WorkshopApiAssetRow {
  description?: string | null;
  license?: string | null;
  versions?: Array<{
    version?: string;
    totalFileSize?: number;
    createdAt?: string;
  }>;
  dependencies?: Array<{
    id?: string;
    name?: string;
    version?: string;
  }>;
  scenarios?: Array<{ name?: string; gameId?: string }>;
}

export interface WorkshopApiListResponse {
  count?: number;
  rows?: WorkshopApiAssetRow[];
}

export interface WorkshopApiFetchResult {
  status: number | null;
  ok: boolean;
  error?: string;
}

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'User-Agent': WORKSHOP_API_USER_AGENT,
  'x-client-id': WORKSHOP_API_CLIENT_ID,
};

async function postJson<T>(url: string, body: unknown): Promise<{ status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { status: res.status, data: null, error: text.slice(0, 300) };
    }
    const data = (await res.json()) as T;
    return { status: res.status, data };
  } catch (err) {
    return { status: null, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getJson<T>(url: string): Promise<{ status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      return { status: res.status, data: null, error: text.slice(0, 300) };
    }
    const data = (await res.json()) as T;
    return { status: res.status, data };
  } catch (err) {
    return { status: null, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface WorkshopListResult {
  rows: WorkshopApiAssetRow[];
  /** true kai bent vienas batch turėjo tinklo/5xx klaidą (skirta nuo "mod nerastas"). */
  networkError: boolean;
}

/** Batch lookup mods by id — up to WORKSHOP_BATCH_MAX per request. */
export async function workshopListByIds(ids: string[]): Promise<WorkshopListResult> {
  if (!ids.length) return { rows: [], networkError: false };
  const all: WorkshopApiAssetRow[] = [];
  let networkError = false;
  for (let i = 0; i < ids.length; i += WORKSHOP_BATCH_MAX) {
    const batch = ids.slice(i, i + WORKSHOP_BATCH_MAX);
    const { status, data, error } = await postJson<WorkshopApiListResponse>(
      `${WORKSHOP_API_BASE}/assets/list`,
      { limit: batch.length, offset: 0, orderBy: 'popularity', search: '', tags: {}, ids: batch }
    );
    if (status === 200 && data?.rows) {
      all.push(...data.rows);
    } else {
      // Tinklo klaida (status null) arba 5xx — skiriama nuo "mod nerastas" (200 su tuščiu rows).
      if (status === null || status >= 500) networkError = true;
      console.warn('[WORKSHOP_API] batch lookup failed', status, error);
    }
  }
  return { rows: all, networkError };
}

/** Full detail for one mod. */
export async function workshopAssetDetail(id: string): Promise<WorkshopApiAssetDetail | null> {
  const { status, data } = await getJson<WorkshopApiAssetDetail>(
    `${WORKSHOP_API_BASE}/assets/${encodeURIComponent(id.toUpperCase())}`
  );
  if (status === 200 && data) return data;
  return null;
}

/** Normalize a list row to the fields the collector cares about (size/author). */
export function sizeAuthorFromApiRow(row: WorkshopApiAssetRow | undefined): {
  sizeBytes: number | null;
  author: string | null;
  blocked: boolean;
} {
  if (!row) return { sizeBytes: null, author: null, blocked: false };
  const sizeBytes = typeof row.currentVersionSize === 'number' && row.currentVersionSize > 0
    ? row.currentVersionSize
    : null;
  const author = typeof row.author?.username === 'string' && row.author.username.trim()
    ? row.author.username.trim()
    : null;
  return { sizeBytes, author, blocked: Boolean(row.blocked) };
}

/** Check whether a mod exists (not 404) using a detail call. */
export async function workshopAssetExists(id: string): Promise<boolean> {
  const { status, data } = await getJson<WorkshopApiAssetDetail>(
    `${WORKSHOP_API_BASE}/assets/${encodeURIComponent(id.toUpperCase())}`
  );
  return status === 200 && Boolean(data?.id);
}
