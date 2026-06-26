import { Link } from 'react-router-dom';
import type { Mod } from '../types';

interface ModRowProps {
  mod: Mod;
  rank?: number;
  game?: string;
}

/**
 * Dense leaderboard row — "tactical Bloomberg" density.
 * One row per mod, right-aligned tabular-nums so a column of values scans
 * and compares at a glance. Keeps the brand (orange top-3, mono numbers,
 * dark bg) but trades hero-sized numbers for information density.
 */
export function ModRow({ mod, rank, game = 'reforger' }: ModRowProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const isTop3 = rank != null && rank <= 3;
  const share = mod.marketShare ?? 0;

  const workshopUrl = /^\d+$/.test(mod.id)
    ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`
    : `https://reforger.armaplatform.com/workshop/${mod.id}`;

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      {/* Rank */}
      <td className="py-2.5 pl-4 pr-2 align-middle">
        <span
          className={`font-mono text-sm tabular-nums ${
            isTop3 ? 'text-tactical-orange font-bold' : 'text-gray-600'
          }`}
        >
          {rank != null ? String(rank).padStart(2, '0') : '–'}
        </span>
      </td>

      {/* Module name — primary CTA */}
      <td className="py-2.5 pr-4 align-middle">
        <Link
          to={`${gp}/mod/${mod.id}`}
          className="block text-[13px] font-bold tracking-tight text-white group-hover:text-tactical-orange transition-colors line-clamp-1"
          title={mod.name}
        >
          {mod.name}
        </Link>
      </td>

      {/* Personnel (active players) */}
      <td className="py-2.5 px-4 text-right align-middle">
        <span className="font-mono text-sm tabular-nums text-white">
          {(mod.totalPlayers || 0).toLocaleString()}
        </span>
      </td>

      {/* Deployments (servers) — hidden on mobile */}
      <td className="hidden md:table-cell py-2.5 px-4 text-right align-middle">
        <span className="font-mono text-sm tabular-nums text-gray-300">{mod.serverCount}</span>
      </td>

      {/* Market share — hidden on mobile */}
      <td className="hidden md:table-cell py-2.5 pl-4 pr-4 align-middle">
        <div className="flex items-center justify-end gap-3">
          <span className="font-mono text-xs tabular-nums text-tactical-orange/80">
            {share.toFixed(1)}%
          </span>
          <div className="w-16 h-[3px] bg-white/5 overflow-hidden">
            <div
              className="h-full bg-tactical-orange/60 group-hover:bg-tactical-orange transition-colors"
              style={{ width: `${Math.min(share, 100)}%` }}
            />
          </div>
        </div>
      </td>

      {/* Workshop link */}
      <td className="py-2.5 pl-2 pr-4 text-right align-middle">
        <a
          href={workshopUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${mod.name} on the workshop`}
          className="inline-block px-1 text-xs font-black text-gray-600 hover:text-tactical-orange transition-colors"
        >
          ↗
        </a>
      </td>
    </tr>
  );
}
