import { ModLeaderboardHead } from './ModLeaderboardHead';

/** Shimmer block used for every placeholder cell. */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-white/10 rounded ${className}`} />;
}

/** Desktop placeholder row — mirrors ModRow column-for-column (incl. md:-only cells). */
function ModRowSkeleton() {
  return (
    <tr className="border-b border-white/5" aria-hidden="true">
      <td className="w-14 py-3 md:py-2.5 pl-4 pr-2 align-middle">
        <Bar className="h-4 w-7" />
      </td>
      <td className="py-3 md:py-2.5 pr-4 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <Bar className="w-8 h-8 rounded shrink-0" />
          <div className="min-w-0 flex-1">
            <Bar className="h-3.5 w-3/4" />
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell w-[140px] max-w-[140px] py-3 md:py-2.5 px-3 align-middle">
        <Bar className="h-3 w-24" />
      </td>
      <td className="w-[4.25rem] sm:w-[5.5rem] py-3 md:py-2.5 px-2 sm:px-4 text-right align-middle">
        <Bar className="h-4 w-12 ml-auto" />
      </td>
      <td className="hidden md:table-cell w-[4.5rem] py-3 md:py-2.5 px-4 text-right align-middle">
        <Bar className="h-4 w-8 ml-auto" />
      </td>
      <td className="hidden md:table-cell w-[5rem] py-3 md:py-2.5 px-4 text-right align-middle">
        <Bar className="h-3 w-10 ml-auto" />
      </td>
      <td className="hidden md:table-cell w-[7.5rem] py-3 md:py-2.5 pl-4 pr-4 align-middle">
        <div className="flex items-center justify-end gap-3">
          <Bar className="h-3 w-8" />
          <Bar className="w-16 h-[3px]" />
        </div>
      </td>
      <td className="w-[6.5rem] sm:w-[9rem] md:w-[13.5rem] py-3 md:py-2.5 pl-1 sm:pl-2 pr-2 sm:pr-4 text-right align-middle">
        <Bar className="h-7 w-24 ml-auto" />
      </td>
    </tr>
  );
}

/** Mobile placeholder row — mirrors ModCard (rank + thumb + name + meta). */
function ModCardSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-white/5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Bar className="h-4 w-7 mt-1 shrink-0" />
        <Bar className="w-8 h-8 rounded shrink-0" />
        <div className="min-w-0 flex-1">
          <Bar className="h-3.5 w-3/4" />
          <div className="mt-1.5 flex gap-3">
            <Bar className="h-2.5 w-20" />
            <Bar className="h-2.5 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModListSkeleton({ count = 24 }: { count?: number }) {
  return (
    <>
      {/* Desktop: table skeleton that matches the real leaderboard layout 1:1
          (reuses ModLeaderboardHead so column widths are identical → no layout shift). */}
      <div
        className="hidden md:block border border-white/5 bg-black/40 animate-pulse"
        aria-hidden="true"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse">
            <ModLeaderboardHead sortBy="overall" sortDir="asc" onSort={() => {}} />
            <tbody>
              {Array.from({ length: count }, (_, i) => (
                <ModRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card stack skeleton mirroring ModCard. */}
      <div
        className="md:hidden border border-white/5 bg-black/40 animate-pulse"
        aria-hidden="true"
      >
        {Array.from({ length: Math.min(count, 12) }, (_, i) => (
          <ModCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
