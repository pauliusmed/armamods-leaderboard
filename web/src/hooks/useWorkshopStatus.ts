import { useEffect, useState } from 'react';
import { modsApi, type GameType } from '../api/client';
import type { WorkshopAvailability } from '../types';

interface UseWorkshopStatusOptions {
  /** Skip network when detail API already resolved status. */
  initialStatus?: WorkshopAvailability;
}

export function useWorkshopStatus(
  modId: string,
  game: GameType = 'reforger',
  options?: UseWorkshopStatusOptions
) {
  const [status, setStatus] = useState<WorkshopAvailability>(
    options?.initialStatus ?? 'unknown'
  );
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    game === 'reforger' && options?.initialStatus === undefined
  );

  // Adjust state during render when the fetch input changes (React "derived state" pattern).
  const [prevKey, setPrevKey] = useState<string | undefined>(undefined);
  const statusKey = `${game}:${modId}:${options?.initialStatus ?? ''}`;
  if (prevKey !== statusKey) {
    setPrevKey(statusKey);
    if (options?.initialStatus !== undefined) {
      setStatus(options.initialStatus);
      setLoading(false);
    } else {
      setLoading(game === 'reforger');
    }
  }

  useEffect(() => {
    if (options?.initialStatus !== undefined) return;
    if (game !== 'reforger') return;

    let cancelled = false;

    modsApi
      .getWorkshopStatus(modId, game)
      .then((result) => {
        if (cancelled) return;
        setStatus(result.status);
        setCheckedAt(result.checkedAt);
      })
      .catch(() => {
        if (!cancelled) setStatus('unknown');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [modId, game, options?.initialStatus]);

  return { status, checkedAt, loading, isUnavailable: status === 'unavailable' };
}
