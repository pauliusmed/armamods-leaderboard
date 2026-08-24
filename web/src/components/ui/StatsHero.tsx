interface StatItem {
  label: string;
  value: string | number;
}

interface StatsHeroProps {
  title: string;
  subtitle: string;
  stats: StatItem[];
  /** Optional freshness line (e.g. stale snapshot age). */
  note?: string | null;
  noteTone?: 'default' | 'warning';
}

/**
 * Compact page header — one row of title + inline stats.
 * Replaced the old ~250px hero block (giant h1 + 4 stat boxes) so the actual
 * list/table content sits above the fold instead of being pushed down.
 */
export function StatsHero({ title, subtitle, stats, note, noteTone = 'default' }: StatsHeroProps) {
  return (
    <div className="mb-4 pb-3 border-b border-white/5 min-h-[68px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 hidden sm:block">
            {subtitle}
          </p>
          {note ? (
            <p
              className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                noteTone === 'warning' ? 'text-amber-400' : 'text-gray-400'
              }`}
            >
              {note}
            </p>
          ) : (
            <p className="text-[9px] font-bold uppercase tracking-wider mt-1.5 invisible" aria-hidden="true">
              placeholder
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 min-h-[20px] min-w-[180px]">
          {stats.length > 0 ? (
            stats.map((stat, i) => (
              <div key={i} className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="font-mono text-sm font-black text-white tabular-nums">{stat.value}</span>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</span>
              </div>
            ))
          ) : (
            <span className="invisible text-[9px] font-black uppercase tracking-widest" aria-hidden="true">
              0 placeholder
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
