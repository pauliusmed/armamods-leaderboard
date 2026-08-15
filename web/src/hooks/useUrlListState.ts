import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * `set` accepts either a value or an updater function `(current) => next`, mirroring the
 * React setState API (used by toggle-sort patterns).
 */
export function useUrlListState<T>(
  options: UseUrlListStateOptions<T>
): [T, (next: T | ((current: T) => T)) => void] {
  const { param, parse, serialize, mode = 'replace', delayMs = 0 } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Live value mirrors the URL but also reflects in-flight typing immediately.
  // Debouncing the VALUE (as before) made React reset the controlled input to the
  // stale URL value on any re-render, dropping keystrokes while a write was pending.
  const [value, setValue] = useState<T>(() => parse(searchParams.get(param)));
  const valueRef = useRef(value);
  const searchParamsRef = useRef(searchParams);
  // Param value as of the last `set` call — the debounced write is dropped if the
  // URL changed externally in the meantime (back/forward must win over typing).
  const pendingBaseRef = useRef(searchParams.get(param));

  // Keep latest options/value in refs so `set` stays referentially stable (hooks can
  // list it in effect deps without re-running on every render) while still reading
  // fresh closures.
  const optionsRef = useRef({ param, parse, serialize, mode, delayMs });
  useEffect(() => {
    optionsRef.current = { param, parse, serialize, mode, delayMs };
    valueRef.current = value;
    searchParamsRef.current = searchParams;
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  // Mirror external URL changes (back/forward, share links) into local state during
  // render — the React-sanctioned "adjusting state when props change" pattern, which
  // avoids cascading renders that setState-in-effect would cause.
  const [prevRaw, setPrevRaw] = useState<string | null>(searchParams.get(param));
  const raw = searchParams.get(param);
  if (prevRaw !== raw) {
    setPrevRaw(raw);
    setValue(parse(raw));
  }

  const writeUrl = useCallback(
    (resolved: T) => {
      if (!mountedRef.current) return;
      const { param: p, serialize: ser, mode: m } = optionsRef.current;
      const serialized = ser(resolved);
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
    },
    [setSearchParams]
  );

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (cur: T) => T)(valueRef.current) : next;
      setValue(resolved);
      const d = optionsRef.current.delayMs;
      if (d > 0) {
        const { param: p } = optionsRef.current;
        pendingBaseRef.current = searchParamsRef.current.get(p);
        if (delayRef.current) clearTimeout(delayRef.current);
        delayRef.current = setTimeout(() => {
          const { param: p2 } = optionsRef.current;
          if (searchParamsRef.current.get(p2) !== pendingBaseRef.current) return;
          writeUrl(resolved);
        }, d);
      } else {
        writeUrl(resolved);
      }
    },
    [writeUrl]
  );

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
