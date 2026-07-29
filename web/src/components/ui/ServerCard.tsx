import { Link } from 'react-router-dom';
import type { Server } from '../../types';
import { ServerStatusBadge } from './ServerStatusBadge';
import { formatBytes } from '../../lib/formatBytes';
import { serverModpackBytes } from '../../lib/serverModpack';

interface ServerCardProps {
  server: Server;
  game?: string;
  pinned?: boolean;
}

export function ServerCard({
  server,
  game = 'reforger',
  pinned = false,
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
    <div className={`px-4 py-3 border-b border-white/5 ${pinned ? 'bg-tactical-orange/[0.04]' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm tabular-nums mt-1 shrink-0 w-7 ${isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'}`}>
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`${gp}/server/${server.id}`}
            className="block text-[13px] font-bold tracking-tight text-white hover:text-tactical-orange transition-colors line-clamp-1"
            title={server.scenarioName ? `${server.name} · ${server.scenarioName}` : server.name}
          >
            {server.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <ServerStatusBadge status={server.bmStatus} />
            {server.scenarioName && (
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600 line-clamp-1">
                {server.scenarioName}
              </span>
            )}
          </div>
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
    </div>
  );
}
