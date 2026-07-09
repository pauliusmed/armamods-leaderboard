import { Link } from 'react-router-dom';
import type { GameType } from '../../api/client';
import { modListHref } from '../../lib/site';

interface ModAuthorLinkProps {
  author: string;
  game?: GameType;
  className?: string;
}

/** Links to the mod leaderboard filtered by workshop author name. */
export function ModAuthorLink({ author, game = 'reforger', className = '' }: ModAuthorLinkProps) {
  return (
    <Link
      to={modListHref(game, author)}
      className={`hover:text-tactical-orange transition-colors ${className}`}
      title={`View all mods by ${author}`}
    >
      {author}
    </Link>
  );
}
