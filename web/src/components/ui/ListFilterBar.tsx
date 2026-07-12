import type { ReactNode } from 'react';

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectField {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  ariaLabel: string;
}

export interface FilterSearchField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  hint?: ReactNode;
}

interface ListFilterBarProps {
  search: FilterSearchField;
  selects?: FilterSelectField[];
  onReset?: () => void;
  resetLabel?: string;
  footer?: ReactNode;
  sticky?: boolean;
  /** Tailwind md:grid-cols-N — 2–6 */
  columns?: 2 | 3 | 4 | 5 | 6;
}

const GRID_COLS: Record<NonNullable<ListFilterBarProps['columns']>, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
  5: 'md:grid-cols-2 lg:grid-cols-5',
  6: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

const labelClass =
  'block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-2 group-hover:text-tactical-orange transition-colors italic';

const controlClass =
  'w-full px-8 py-3 bg-black/60 border border-white/10 focus:border-tactical-orange focus:bg-black transition-all font-black text-white placeholder-gray-700 uppercase tracking-widest text-[13px] rounded-none outline-none';

const selectClass = `${controlClass} appearance-none cursor-pointer`;

export function ListFilterBar({
  search,
  selects = [],
  onReset,
  resetLabel = 'Reset',
  footer,
  sticky = true,
  columns,
}: ListFilterBarProps) {
  const fieldCount = 1 + selects.length + (onReset ? 1 : 0);
  const gridCols = columns ?? (fieldCount <= 2 ? 2 : fieldCount <= 3 ? 3 : fieldCount <= 4 ? 4 : fieldCount <= 5 ? 5 : 6);

  return (
    <div
      className={`bg-[#172635] p-4 border border-white/5 transition-all hover:bg-[#1C2E3F] ${
        sticky ? 'sticky top-[72px] sm:top-[84px] z-40' : ''
      }`}
    >
      <div className={`grid grid-cols-1 gap-4 items-end ${GRID_COLS[gridCols]}`}>
        <div className="group">
          <label htmlFor="list-filter-search" className={labelClass}>
            {search.label}
          </label>
          <input
            id="list-filter-search"
            type="search"
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            aria-label={search.ariaLabel}
            className={controlClass}
          />
          {search.hint}
        </div>

        {selects.map((field) => (
          <div key={field.id}>
            <label htmlFor={`list-filter-${field.id}`} className={labelClass}>
              {field.label}
            </label>
            <select
              id={`list-filter-${field.id}`}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              aria-label={field.ariaLabel}
              className={selectClass}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {onReset && (
          <div>
            <span className={`${labelClass} invisible select-none`} aria-hidden>
              // ACTIONS
            </span>
            <button
              type="button"
              onClick={onReset}
              className={`${selectClass} text-gray-400 hover:text-tactical-orange hover:border-tactical-orange/40`}
            >
              {resetLabel}
            </button>
          </div>
        )}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
