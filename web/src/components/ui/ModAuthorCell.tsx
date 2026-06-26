import { useEffect, useState } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';

interface ModAuthorCellProps {
  modId: string;
  game?: GameType;
  className?: string;
}

/** Lazy workshop author — KV-cached on the edge, client-cached 7d. */
export function ModAuthorCell({ modId, game = 'reforger', className = '' }: ModAuthorCellProps) {
  const [author, setAuthor] = useState<string | null>(null);
  const [loading, setLoading] = useState(game === 'reforger');

  useEffect(() => {
    if (game !== 'reforger') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    modsApi
      .getAuthor(modId, game)
      .then((name) => {
        if (!cancelled) setAuthor(name);
      })
      .catch(() => {
        if (!cancelled) setAuthor(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [modId, game]);

  if (game !== 'reforger') {
    return <span className={`text-gray-700 text-xs ${className}`}>—</span>;
  }

  if (loading) {
    return <span className={`text-gray-700 text-xs animate-pulse ${className}`}>…</span>;
  }

  if (!author) {
    return <span className={`text-gray-700 text-xs ${className}`}>—</span>;
  }

  return (
    <span
      className={`text-xs font-bold text-gray-400 line-clamp-1 ${className}`}
      title={author}
    >
      {author}
    </span>
  );
}
