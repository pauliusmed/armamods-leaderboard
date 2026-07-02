/** Human-readable byte sizes (binary units). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0 || !Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function gbToBytes(gb: number): number {
  return Math.round(gb * 1024 ** 3);
}
