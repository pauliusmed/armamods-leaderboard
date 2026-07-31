import { Link } from 'react-router-dom';
import type { Server } from '../../types';
import { formatBytes } from '../../lib/formatBytes';
import { serverModpackBytes } from '../../lib/serverModpack';

interface ServerCardProps {
  server: Server;
  game?: string;
  pinned?: boolean;
  featured?: boolean;
}

export function ServerCard({
  server,
  game = 'reforger',
  pinned = false,
  featured = false,
}: ServerCardProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const rank = server.sqeRank;
  const isTop3 = rank != null && rank <= 3;
  const players = server.players || 0;
  const max = server.maxPlayers || 0;
  const modCount = server.mods?.length ?? 0;
  const isVanilla = modCount === 0;
  const modpackBytes = serverModpackBytes(server);

  return (
    <Link
      to={`${gp}/server/${server.id}`}
      className={`block px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${pinned ? 'bg-tactical-orange/[0.04]' : featured ? 'bg-tactical-orange/[0.06]' : ''}`}
      title={server.scenarioName ? `${server.name} · ${server.scenarioName}` : server.name}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-tight text-white line-clamp-1">
            {server.name}
            {featured ? (
              <span className="ml-2 align-middle inline-block text-[8px] font-black uppercase tracking-widest text-black bg-tactical-orange px-1.5 py-0.5">
                Featured
              </span>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono tabular-nums text-gray-500">
            <span>{players} / {max} players</span>
            {isVanilla ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vanilla</span>
            ) : (
              <>
                <span>{modCount} mods</span>
                <span>{formatBytes(modpackBytes)}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
