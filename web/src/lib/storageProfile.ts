import type { GameType } from '../api/client';

export type ConsolePresetId = 'ps5' | 'xbox-x' | 'xbox-s' | 'custom';

export interface StorageProfile {
  consolePreset: ConsolePresetId;
  availableGb: number;
  mainServerId: string | null;
  wantedServerIds: string[];
  /** Last known server names — instant labels before list/API resolve. */
  serverNames?: Record<string, string>;
}

export const CONSOLE_PRESETS: Array<{ id: ConsolePresetId; label: string; gb: number }> = [
  { id: 'ps5', label: 'PlayStation 5', gb: 25 },
  { id: 'xbox-x', label: 'Xbox Series X', gb: 40 },
  { id: 'xbox-s', label: 'Xbox Series S', gb: 20 },
  { id: 'custom', label: 'Custom', gb: 25 },
];

function profileKey(game: GameType): string {
  return `armamods:storage-profile:${game}`;
}

export function loadStorageProfile(game: GameType): StorageProfile {
  const fallback: StorageProfile = {
    consolePreset: 'ps5',
    availableGb: 25,
    mainServerId: null,
    wantedServerIds: [],
    serverNames: {},
  };
  try {
    const raw = localStorage.getItem(profileKey(game));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StorageProfile>;
    const profile: StorageProfile = {
      consolePreset: parsed.consolePreset ?? fallback.consolePreset,
      availableGb: parsed.availableGb ?? fallback.availableGb,
      mainServerId: parsed.mainServerId ?? null,
      wantedServerIds: Array.isArray(parsed.wantedServerIds) ? parsed.wantedServerIds : [],
      serverNames:
        parsed.serverNames && typeof parsed.serverNames === 'object' ? parsed.serverNames : {},
    };
    // PS5 official Workshop cap is 25 GB (was 30 in early planner builds).
    if (profile.consolePreset === 'ps5' && profile.availableGb === 30) {
      profile.availableGb = 25;
    }
    return profile;
  } catch {
    return fallback;
  }
}

export function saveStorageProfile(game: GameType, profile: StorageProfile): void {
  localStorage.setItem(profileKey(game), JSON.stringify(profile));
}

export function rememberServerNames(
  profile: StorageProfile,
  entries: Array<{ id: string; name: string }>
): StorageProfile {
  if (!entries.length) return profile;
  const serverNames = { ...profile.serverNames };
  for (const { id, name } of entries) {
    if (id && name) serverNames[id] = name;
  }
  return { ...profile, serverNames };
}
