import { useEffect, useState } from 'react';
import { modsApi, type GameType } from '../api/client';

/** Batch-resolve workshop authors for visible mod rows (deduped + cached in modsApi). */
export function useModAuthors(modIds: string[], game: GameType = 'reforger') {
  const [authors, setAuthors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (game !== 'reforger' || modIds.length === 0) return;

    let cancelled = false;

    Promise.all(
      modIds.map(async (id) => {
        const author = await modsApi.getAuthor(id, game).catch(() => null);
        return [id, author] as const;
      })
    ).then((pairs) => {
      if (cancelled) return;
      setAuthors(Object.fromEntries(pairs));
    });

    return () => {
      cancelled = true;
    };
  }, [game, modIds.join('|')]);

  return authors;
}
