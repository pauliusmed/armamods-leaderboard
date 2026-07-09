import { Link } from 'react-router-dom';
import type { Server } from '../types';
import { TierBadge } from './ui/TierBadge';
import { ConsoleFitBadge } from './ui/ConsoleFitBadge';
import { ServerStatusBadge } from './ui/ServerStatusBadge';
import { formatBytes } from '../lib/formatBytes';
import { serverModpackBytes } from '../lib/serverModpack';

interface ServerRowProps {
  server: Server;
  game?: string;
  showConsoleFit?: boolean;
  consoleLimitGb?: number;
  consoleLimitBytes?: number;
}

/**
 * Dense leaderboard row for servers — mirrors the mod table.
 * Players shown ONCE as "current / max" (the old card showed both numbers
 * twice: in the personnel bar AND in a Deployed/Total-Cap grid). Here each
 * value appears once; current players is emphasised for scanning.
 */
export function ServerRow({
  server,
  game = 'reforger',
  showConsoleFit = false,
  consoleLimitGb = 25,
  consoleLimitBytes = 25 * 1024 ** 3,
}: ServerRowProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const rank = server.sqeRank;
  const isTop3 = rank != null && rank <= 3;
  const max = server.maxPlayers || 0;
  const players = server.players || 0;

  const modCount = server.mods?.length ?? 0;
  const isVanilla = modCount === 0;
  const modpackBytes = serverModpackBytes(server);

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      {/* SQE rank + tier */}
      <td className="py-3 md:py-2.5 pl-4 pr-2 align-middle">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-sm tabular-nums ${
              isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'
            }`}
          >
            {rank != null ? String(rank).padStart(2, '0') : '–'}
          </span>
          <TierBadge tier={server.sqeTier} />
        </div>
      </td>

      {/* Server name — primary CTA */}
      <td className="py-3 md:py-2.5 pr-4 align-middle">
        <Link
          to={`${gp}/server/${server.id}`}
          className="block min-w-0"
          title={server.scenarioName ? `${server.name} · ${server.scenarioName}` : server.name}
        >
          <span className="block text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-1">
            {server.name}
          </span>
          <span className="flex flex-wrap items-center gap-2 mt-0.5">
            <ServerStatusBadge status={server.bmStatus} />
            {server.scenarioName && (
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600 line-clamp-1 min-w-0">
                {server.scenarioName}
              </span>
            )}
            {showConsoleFit && (
              <ConsoleFitBadge
                server={server}
                limitGb={consoleLimitGb}
                limitBytes={consoleLimitBytes}
              />
            )}
          </span>
        </Link>
      </td>

      {/* Players = current / capacity (each value shown once) */}
      <td className="py-3 md:py-2.5 px-4 text-right align-middle whitespace-nowrap">
        <span className="font-mono text-sm tabular-nums text-white">{players}</span>
        <span className="font-mono text-xs tabular-nums text-gray-600"> / {max}</span>
      </td>

      {/* Mod count + mobile modpack size */}
      <td className="py-3 md:py-2.5 px-4 text-right align-middle">
        {isVanilla ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vanilla</span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm tabular-nums text-gray-300">{modCount}</span>
            <span
              className="lg:hidden font-mono text-[9px] tabular-nums text-tactical-orange/90"
              title={
                server.modpackCoverage != null && server.modpackCoverage < 1
                  ? `${Math.round((server.modpackCoverage ?? 0) * 100)}% of mods sized — estimate`
                  : undefined
              }
            >
              {formatBytes(modpackBytes)}
            </span>
          </div>
        )}
      </td>

      {/* Modpack download size (desktop) */}
      <td className="hidden lg:table-cell py-3 md:py-2.5 pl-4 pr-4 text-right align-middle">
        {isVanilla ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">—</span>
        ) : (
          <>
            <span
              className="font-mono text-xs tabular-nums text-tactical-orange/90"
              title={
                server.modpackCoverage != null && server.modpackCoverage < 1
                  ? `${Math.round((server.modpackCoverage ?? 0) * 100)}% of mods sized — estimate`
                  : undefined
              }
            >
              {formatBytes(modpackBytes)}
            </span>
            {server.modpackCoverage != null && server.modpackCoverage > 0 && server.modpackCoverage < 1 && (
              <span className="block text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                ~{Math.round(server.modpackCoverage * 100)}% sized
              </span>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
