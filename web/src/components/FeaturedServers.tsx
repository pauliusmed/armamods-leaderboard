import type { GameType } from '../api/client';
import type { Server } from '../types';
import { FEATURED_SERVERS } from '../lib/featuredServers';
import { ServerRow } from './ServerRow';
import { ServerCard } from './ui/ServerCard';

interface FeaturedServersProps {
  game: GameType;
  servers: Server[];
  isMobile?: boolean;
}

/**
 * Paid placements strip — clearly marked, never affects organic rankings.
 * Renders only servers present in the current dataset (config may lag data).
 */
export function FeaturedServers({ game, servers, isMobile = false }: FeaturedServersProps) {
  const featured = FEATURED_SERVERS.filter((f) => f.game === game)
    .map((f) => servers.find((s) => s.id === f.id))
    .filter((s): s is Server => Boolean(s));

  if (featured.length === 0) return null;

  return (
    <div className="border border-tactical-orange/30 bg-[#172635]">
      <div className="px-4 py-2.5 border-b border-tactical-orange/20">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tactical-orange">
          Featured
        </p>
        <p className="mt-0.5 text-[8px] font-bold text-gray-600 uppercase tracking-widest">
          Sponsored placement — never affects rankings
        </p>
      </div>
      {isMobile ? (
        <div>
          {featured.map((server) => (
            <ServerCard key={server.id} server={server} game={game} featured />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {featured.map((server) => (
                <ServerRow
                  key={server.id}
                  server={server}
                  game={game}
                  showConsoleFit={game === 'reforger'}
                  featured
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
