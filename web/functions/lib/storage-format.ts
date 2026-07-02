/** Human-readable byte sizes (binary units, matches workshop UI). */
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

/** Parse workshop labels like "116.72 KB" or "1.2 GB". */
export function parseHumanSizeToBytes(text: string): number | null {
  const m = text.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toUpperCase();
  const mult =
    unit === 'B'
      ? 1
      : unit === 'KB'
        ? 1024
        : unit === 'MB'
          ? 1024 ** 2
          : unit === 'GB'
            ? 1024 ** 3
            : 1024 ** 4;
  return Math.round(n * mult);
}
