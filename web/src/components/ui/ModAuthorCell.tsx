import { useEffect, useState } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';
import { ModAuthorLink } from './ModAuthorLink';

interface ModAuthorCellProps {
  modId: string;
  game?: GameType;
  className?: string;
  /** When provided, skips per-row author API (leaderboard list embeds this). */
  author?: string | null;
}

/** Lazy workshop author — KV-cached on the edge, client-cached 7d. */
export function ModAuthorCell({
  modId,
  game = 'reforger',
  className = '',
  author: authorProp,
}: ModAuthorCellProps) {
  const [author, setAuthor] = useState<string | null>(authorProp ?? null);
  const [loading, setLoading] = useState(game === 'reforger' && authorProp === undefined);

  useEffect(() => {
    if (authorProp !== undefined) {
      setAuthor(authorProp);
      setLoading(false);
      return;
    }

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
  }, [modId, game, authorProp]);

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
    <ModAuthorLink
      author={author}
      game={game}
      className={`text-xs font-bold text-gray-400 line-clamp-1 block ${className}`}
    />
  );
}
