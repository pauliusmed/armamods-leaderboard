type SortDir = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  sortKey: string;
  activeSort: string;
  sortDir: SortDir;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
  /** Match Share row layout (label over %, spacer over progress bar). */
  mirrorBar?: boolean;
  className?: string;
}

export function SortableTh({
  label,
  sortKey,
  activeSort,
  sortDir,
  onSort,
  align = 'left',
  mirrorBar = false,
  className = '',
}: SortableThProps) {
  const active = activeSort === sortKey;
  const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
          align === 'right' ? 'ml-auto' : ''
        } ${active ? 'text-tactical-orange' : 'text-gray-600 hover:text-gray-400'}`}
      >
        <span>
          {label}
          <span className="font-mono" aria-hidden>
            {arrow}
          </span>
        </span>
        {mirrorBar && <span className="w-16 shrink-0" aria-hidden />}
      </button>
    </th>
  );
}
