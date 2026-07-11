import type { ModSortBy } from '../../hooks/useMods';
import { SortableTh } from './SortableTh';

interface ModLeaderboardHeadProps {
  sortBy: ModSortBy;
  sortDir: 'asc' | 'desc';
  onSort: (key: ModSortBy) => void;
}

/** Shared thead so favorites rows and main list share identical column widths. */
export function ModLeaderboardHead({ sortBy, sortDir, onSort }: ModLeaderboardHeadProps) {
  return (
    <thead>
      <tr className="border-b border-white/10">
        <SortableTh
          label="Rank"
          sortKey="overall"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          className="w-14 pl-4 pr-2"
        />
        <SortableTh
          label="Module"
          sortKey="name"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          className="min-w-0 pr-4"
        />
        <SortableTh
          label="Author"
          sortKey="author"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          className="hidden md:table-cell w-[140px] max-w-[140px] px-3"
        />
        <SortableTh
          label="Personnel"
          sortKey="players"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          align="right"
          className="w-[4.25rem] sm:w-[5.5rem] px-2 sm:px-4"
        />
        <SortableTh
          label="Deploy"
          sortKey="servers"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          align="right"
          className="hidden md:table-cell w-[4.5rem] px-4"
        />
        <SortableTh
          label="Size"
          sortKey="size"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          align="right"
          className="hidden md:table-cell w-[5rem] px-4"
        />
        <SortableTh
          label="Share"
          sortKey="share"
          activeSort={sortBy}
          sortDir={sortDir}
          onSort={(key) => onSort(key as ModSortBy)}
          align="right"
          mirrorBar
          className="hidden md:table-cell w-[7.5rem] pl-4 pr-4"
        />
        <th className="w-[6.5rem] sm:w-[9rem] md:w-[11rem] pl-1 sm:pl-2 pr-2 sm:pr-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-gray-600">
          <span className="hidden sm:inline">Actions</span>
          <span className="sm:hidden" aria-hidden>· · ·</span>
        </th>
      </tr>
    </thead>
  );
}

export const MOD_LEADERBOARD_COL_COUNT = 8;
