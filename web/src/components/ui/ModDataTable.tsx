import type { ReactNode } from 'react';
import { SortableTh } from './SortableTh';

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

export type ServerDataTableSortBy = 'rank' | 'name' | 'players' | 'mods';
export type ServerDataTableSortDir = 'asc' | 'desc';

export function ServerDataTable({
  children,
  sortBy,
  sortDir,
  onSort,
}: {
  children: ReactNode;
  sortBy?: ServerDataTableSortBy;
  sortDir?: ServerDataTableSortDir;
  onSort?: (key: ServerDataTableSortBy) => void;
}) {
  const sortable = sortBy && sortDir && onSort;
  return (
    <div className="border border-white/5 bg-black/40">
      <div className="overflow-x-auto -mx-px">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {sortable ? (
                <SortableTh
                  label="Rank"
                  sortKey="rank"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => onSort!(key as ServerDataTableSortBy)}
                  className="pl-4 pr-2"
                />
              ) : (
                <th className="pl-4 pr-2 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Rank</th>
              )}
              {sortable ? (
                <SortableTh
                  label="Server"
                  sortKey="name"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => onSort!(key as ServerDataTableSortBy)}
                  className="pr-4 min-w-[8rem]"
                />
              ) : (
                <th className="pr-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 min-w-[8rem]">Server</th>
              )}
              {sortable ? (
                <SortableTh
                  label="Players"
                  sortKey="players"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => onSort!(key as ServerDataTableSortBy)}
                  align="right"
                  className="px-3 sm:px-4"
                />
              ) : (
                <th className="px-3 sm:px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Players</th>
              )}
              {sortable ? (
                <SortableTh
                  label="Mods"
                  sortKey="mods"
                  activeSort={sortBy}
                  sortDir={sortDir}
                  onSort={(key) => onSort!(key as ServerDataTableSortBy)}
                  align="right"
                  className="pl-2 pr-4"
                />
              ) : (
                <th className="pl-2 pr-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 whitespace-nowrap">Mods</th>
              )}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
