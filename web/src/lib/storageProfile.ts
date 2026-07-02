import type { GameType } from '../api/client';

export type ConsolePresetId = 'ps5' | 'xbox-x' | 'xbox-s' | 'custom';

export interface StorageProfile {
  consolePreset: ConsolePresetId;
  availableGb: number;
  mainServerId: string | null;
  wantedServerIds: string[];
}

export const CONSOLE_PRESETS: Array<{ id: ConsolePresetId; label: string; gb: number }> = [
  { id: 'ps5', label: 'PlayStation 5', gb: 30 },
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
    availableGb: 30,
    mainServerId: null,
    wantedServerIds: [],
  };
  try {
    const raw = localStorage.getItem(profileKey(game));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StorageProfile>;
    return {
      consolePreset: parsed.consolePreset ?? fallback.consolePreset,
      availableGb: parsed.availableGb ?? fallback.availableGb,
      mainServerId: parsed.mainServerId ?? null,
      wantedServerIds: Array.isArray(parsed.wantedServerIds) ? parsed.wantedServerIds : [],
    };
  } catch {
    return fallback;
  }
}

export function saveStorageProfile(game: GameType, profile: StorageProfile): void {
  localStorage.setItem(profileKey(game), JSON.stringify(profile));
}
