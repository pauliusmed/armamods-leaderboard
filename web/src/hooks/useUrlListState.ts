import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UseUrlListStateOptions<T> {
  /** URL query param name (e.g. `page`, `sort`). */
  param: string;
  /** Value when the param is absent or unparsable. */
  fallback: T;
  parse: (raw: string | null) => T;
  /** Return null to remove the param from the URL (fallback state keeps URL clean). */
  serialize: (value: T) => string | null;
  /** push keeps a history entry per change (back walks through pages); replace overwrites. */
  mode?: 'push' | 'replace';
  /** Debounce URL writes (e.g. search input) to avoid history spam. */
  delayMs?: number;
}

/**
 * Two-way URL query param ↔ value, with the URL as the single source of truth.
 *
 * Why: list pages (mods/servers/scenarios) kept their filters, sort and page in useState,
 * so browser back from a detail page re-mounted the list with defaults — search results,
 * filters and pagination were lost. Mirroring state into the URL means back/forward and
 * share links re-render the list with the exact restored view, no imperative sync needed.
 */
export function useUrlListState<T>(options: UseUrlListStateOptions<T>): [T, (next: T) => void] {
  const { param, parse, serialize, mode = 'replace', delayMs = 0 } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Keep latest options in a ref so `set` stays referentially stable (hooks can list it
  // in effect deps without re-running on every render) while still reading fresh closures.
  const optionsRef = useRef({ param, parse, serialize, mode, delayMs });
  useEffect(() => {
    optionsRef.current = { param, parse, serialize, mode, delayMs };
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  // Single source of truth: the URL. Back/forward restores the params and React Router
  // re-renders, so the value always reflects the current URL (never an out-of-sync state).
  const value = parse(searchParams.get(param));

  const set = useCallback((next: T) => {
    const apply = () => {
      if (!mountedRef.current) return;
      const { param: p, serialize: ser, mode: m } = optionsRef.current;
      const serialized = ser(next);
      setSearchParams(
        (prev) => {
          const qp = new URLSearchParams(prev);
          if (serialized == null) {
            qp.delete(p);
          } else if (qp.get(p) !== serialized) {
            qp.set(p, serialized);
          }
          return qp;
        },
        { replace: m !== 'push' }
      );
    };
    const d = optionsRef.current.delayMs;
    if (d > 0) {
      if (delayRef.current) clearTimeout(delayRef.current);
      delayRef.current = setTimeout(apply, d);
    } else {
      apply();
    }
  }, [setSearchParams]);

  return [value, set];
}

/** Parse helpers shared by list hooks. */

export function parseEnum<T extends string>(values: readonly T[]) {
  return (raw: string | null, fallback: T): T =>
    values.includes(raw as T) ? (raw as T) : fallback;
}

export function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export function parseSortDir(raw: string | null, fallback: 'asc' | 'desc'): 'asc' | 'desc' {
  return raw === 'desc' || raw === 'asc' ? raw : fallback;
}
