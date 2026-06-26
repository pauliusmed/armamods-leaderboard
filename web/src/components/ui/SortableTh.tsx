type SortDir = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  sortKey: string;
  activeSort: string;
  sortDir: SortDir;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function SortableTh({
  label,
  sortKey,
  activeSort,
  sortDir,
  onSort,
  align = 'left',
  className = '',
}: SortableThProps) {
  const active = activeSort === sortKey;
  const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <th className={`${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`w-full py-3 text-[11px] font-black uppercase tracking-[0.1em] transition-colors ${
          align === 'right' ? 'text-right' : 'text-left'
        } ${active ? 'text-tactical-orange' : 'text-gray-600 hover:text-gray-400'}`}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <span className="font-mono" aria-hidden>
          {arrow}
        </span>
      </button>
    </th>
  );
}
