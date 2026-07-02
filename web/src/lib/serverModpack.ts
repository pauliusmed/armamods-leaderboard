import type { Server } from '../types';

export const CONSOLE_MOD_LIMIT_GB = {
  ps5: 25,
  'xbox-x': 40,
  'xbox-s': 20,
} as const;

export type ConsoleFitFilter = 'all' | 'vanilla' | 'ps5' | 'xbox-x' | 'xbox-s';

export type ConsoleFitStatus = 'vanilla' | 'fits' | 'over' | 'unknown';

export function consoleFilterLimitBytes(filter: ConsoleFitFilter): number | null {
  if (filter === 'all' || filter === 'vanilla') return null;
  const gb = CONSOLE_MOD_LIMIT_GB[filter];
  return Math.round(gb * 1024 ** 3);
}

/** Best available modpack size for a server (null if mods exist but size unknown). */
export function serverModpackBytes(server: Server): number | null {
  const modCount = server.mods?.length ?? 0;
  if (modCount === 0) return 0;
  const bytes = server.modpackEstimatedBytes ?? server.modpackKnownBytes;
  if (bytes == null || bytes <= 0) return null;
  return bytes;
}

export function serverConsoleFit(server: Server, limitBytes: number): ConsoleFitStatus {
  const modCount = server.mods?.length ?? 0;
  if (modCount === 0) return 'vanilla';
  const bytes = serverModpackBytes(server);
  if (bytes == null) return 'unknown';
  return bytes <= limitBytes ? 'fits' : 'over';
}

export function matchesConsoleFilter(server: Server, filter: ConsoleFitFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'vanilla') return (server.mods?.length ?? 0) === 0;

  const limitBytes = consoleFilterLimitBytes(filter);
  if (limitBytes == null) return true;

  const status = serverConsoleFit(server, limitBytes);
  return status === 'vanilla' || status === 'fits';
}

export function consoleFitLabel(status: ConsoleFitStatus, limitGb: number): string {
  switch (status) {
    case 'vanilla':
      return 'Vanilla';
    case 'fits':
      return `≤${limitGb} GB`;
    case 'over':
      return 'Heavy';
    case 'unknown':
      return 'Size ?';
  }
}
