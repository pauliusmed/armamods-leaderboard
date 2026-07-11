import type { ReactNode } from 'react';

/** Shared dense mod table chrome — matches ModList / TrendingPage rows. */
export function ModDataTable({ children }: { children: ReactNode }) {
  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Rank</th>
              <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Module</th>
              <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Personnel</th>
              <th className="hidden md:table-cell px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Deploy</th>
              <th className="hidden md:table-cell pl-4 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">Share</th>
              <th className="pl-2 pr-4 py-3" aria-label="Workshop link" />
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function ServerDataTable({ children }: { children: ReactNode }) {
  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto -mx-px">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Rank</th>
              <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 min-w-[8rem]">Server</th>
              <th className="px-3 sm:px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Players</th>
              <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Mods</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Build a Mod-shaped row from partial leaderboard data. */
export function toModRow(
  partial: {
    id: string;
    name: string;
    totalPlayers?: number;
    serverCount?: number;
    overallRank?: number;
    marketShare?: number;
  }
) {
  return {
    id: partial.id,
    name: partial.name,
    totalPlayers: partial.totalPlayers ?? 0,
    serverCount: partial.serverCount ?? 0,
    overallRank: partial.overallRank ?? 0,
    marketShare: partial.marketShare ?? 0,
  };
}
