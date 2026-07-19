import type { AxiosError } from 'axios';

const FRIENDLY_NOT_FOUND = 'Server not found — it may be offline, removed, or the ID is incorrect.';

export function toUserErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ message?: string; error?: string }> | undefined;
  if (axiosErr?.response?.status === 404) return FRIENDLY_NOT_FOUND;
  if (axiosErr?.response?.data?.message) return axiosErr.response.data.message;
  if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
  if (err instanceof Error) return err.message;
  return 'Failed to load server';
}
