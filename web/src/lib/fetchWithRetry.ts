const TRANSIENT_PATTERNS = [
  '503', '502', '504', 'timeout',
  'Network Error', 'Failed to fetch',
  'ERR_CONNECTION_REFUSED', 'ERR_CONNECTION_RESET',
  'ERR_INTERNET_DISCONNECTED',
];

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

const delays = [2000, 4000, 6000];

export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  onRetry?: (attempt: number, max: number) => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= delays.length; attempt++) {
    try {
      return await fetcher();
    } catch (err) {
      lastError = err;
      if (attempt < delays.length && isTransientError(err)) {
        onRetry?.(attempt, delays.length);
        await new Promise((r) => setTimeout(r, delays[attempt - 1]));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
