import axios from 'axios';
import type { Mod, Server, ApiResponse, TrendingResponse } from '../types';
import { modThumbnailUrl } from '../lib/workshop';

export type GameType = 'reforger' | 'arma3';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Simple in-memory cache to prevent redundant requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 120000; // 2 minutes

/** Dedupe concurrent thumbnail URL lookups for the same mod. */
const thumbnailInflight = new Map<string, Promise<string | null>>();

/** Dedupe concurrent author lookups for the same mod. */
const authorInflight = new Map<string, Promise<string | null>>();

/** Dedupe concurrent gallery lookups for the same mod. */
const galleryInflight = new Map<string, Promise<import('../types').ModGalleryImage[]>>();

async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp < ttl)) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

export const modsApi = {
  getPopular: async (
    limit = 50,
    offset = 0,
    search?: string,
    sortBy?: string,
    sortDir: 'asc' | 'desc' = 'asc',
    game: GameType = 'reforger'
  ) => {
    const key = `mods:${game}:${limit}:${offset}:${search}:${sortBy}:${sortDir}`;
    return getCached(key, async () => {
      const response = await api.get<ApiResponse<Mod>>('mods', {
        params: { limit, offset, search, sortBy, sortDir, game },
      });
      return response.data;
    });
  },

  getById: async (modId: string, game: GameType = 'reforger') => {
    const key = `mod:${game}:${modId}`;
    return getCached(key, async () => {
      const response = await api.get<{ data: Mod & { stats: Mod & { totalMods: number }; servers: Server[] } }>(`mods/${modId}`, {
        params: { game }
      });
      return response.data;
    });
  },

  getHistory: async (modId: string, days = 30, game: GameType = 'reforger') => {
    const key = `history:${game}:${modId}:${days}`;
    return getCached(key, async () => {
      const response = await api.get<{ data: import('../types').ModHistory[] }>(`mods/${modId}/history`, {
        params: { days, game }
      });
      return response.data;
    }, 3600000); // History can be cached for 1 hour
  },

  getDependencies: async (modId: string, game: GameType = 'reforger') => {
    const key = `deps:${game}:${modId}`;
    return getCached(key, async () => {
      const response = await api.get<{
        data: import('../types').ModDependency[];
        meta: { source: string; supported: boolean; count?: number; message?: string };
      }>(`mods/${modId}/dependencies`, { params: { game } });
      return response.data;
    }, 86400000); // Workshop deps change rarely — cache 24h client-side
  },

  getGallery: async (modId: string, game: GameType = 'reforger') => {
    const key = `gallery:${game}:${modId}`;
    const inflight = galleryInflight.get(key);
    if (inflight) return inflight;

    const request = getCached(
      key,
      async () => {
        const response = await api.get<{
          data: import('../types').ModGalleryImage[];
          meta: { source: string; supported: boolean; count?: number };
        }>(`mods/${modId}/gallery`, { params: { game } });
        return response.data.data ?? [];
      },
      604800000 // 7 days — matches KV TTL
    )
      .then((images) => images as import('../types').ModGalleryImage[])
      .finally(() => galleryInflight.delete(key));

    galleryInflight.set(key, request);
    return request;
  },

  getThumbnailUrl: async (modId: string, game: GameType = 'reforger'): Promise<string | null> => {
    const key = `thumb:${game}:${modId}`;
    const inflight = thumbnailInflight.get(key);
    if (inflight) return inflight;

    const request = getCached(
      key,
      async () => {
        try {
          const response = await api.get<{ data: { url: string } }>(`mods/${modId}/thumbnail`, {
            params: { game },
          });
          const url = response.data.data?.url ?? null;
          if (url && !url.includes('/og-image.png')) return url;
        } catch {
          // JSON endpoint missing or failing — 302 preview route still works as <img src>
          return modThumbnailUrl(modId, game);
        }
        return null;
      },
      604800000 // 7 days — matches KV TTL for CDN URLs
    )
      .then((url) => url as string | null)
      .finally(() => thumbnailInflight.delete(key));

    thumbnailInflight.set(key, request);
    return request;
  },

  getAuthor: async (modId: string, game: GameType = 'reforger'): Promise<string | null> => {
    const key = `author:${game}:${modId}`;
    const inflight = authorInflight.get(key);
    if (inflight) return inflight;

    const request = getCached(
      key,
      async () => {
        const response = await api.get<{ data: { author: string | null } }>(`mods/${modId}/author`, {
          params: { game },
        });
        return response.data.data?.author ?? null;
      },
      604800000 // 7 days — matches KV TTL
    )
      .then((author) => author as string | null)
      .finally(() => authorInflight.delete(key));

    authorInflight.set(key, request);
    return request;
  },

  getGlobalStats: async (game: GameType = 'reforger') => {
    const key = `stats:${game}`;
    return getCached(key, async () => {
      const response = await api.get<{ totalServers: number; totalPlayers: number; totalMods: number }>('stats', {
        params: { game }
      });
      return response.data;
    }, 300000); // Stats cached for 5 mins
  }
};

export const serversApi = {
  getList: async (
    limit = 100,
    offset = 0,
    game: GameType = 'reforger',
    options?: { full?: boolean; search?: string }
  ) => {
    const search = options?.search;
    const full = options?.full;
    const key = `servers:${game}:${limit}:${offset}:${full ? 'full' : 'paged'}:${search ?? ''}`;
    return getCached(key, async () => {
      const response = await api.get<ApiResponse<Server>>('servers', {
        params: { limit, offset, search, game, ...(full ? { full: '1' } : {}) },
      });
      return response.data;
    }, 60000); // Servers cached for 1 min
  },

  getById: async (serverId: string, game: GameType = 'reforger') => {
    const key = `server:${game}:${serverId}`;
    return getCached(key, async () => {
      const response = await api.get<{ data: Server }>(`servers/${serverId}`, {
        params: { game }
      });
      return response.data;
    });
  },

  getHistory: async (serverId: string, days = 30, game: GameType = 'reforger') => {
    const key = `server-history:${game}:${serverId}:${days}`;
    return getCached(key, async () => {
      const response = await api.get<{ data: { time: string; points: number; rank: number | null; players: number | null }[] }>(`servers/${serverId}/history`, {
        params: { days, game }
      });
      return response.data;
    }, 3600000);
  },
};

export const trendingApi = {
  getTrending: async (period: import('../types').TrendPeriod = '7d', game: GameType = 'reforger') => {
    const key = `trending:${game}:${period}`;
    return getCached(key, async () => {
      const response = await api.get<TrendingResponse>('trending', {
        params: { period, game }
      });
      return response.data;
    }, 600000); // 10 mins cache
  },
};

export const diagnosticsApi = {
  getDiagnostics: async (game: GameType = 'reforger') => {
    const key = `diagnostics:${game}`;
    return getCached(key, async () => {
      const response = await api.get<any>('diagnostics', {
        params: { game }
      });
      return response.data;
    }, 60000); // 1 min cache
  }
};
