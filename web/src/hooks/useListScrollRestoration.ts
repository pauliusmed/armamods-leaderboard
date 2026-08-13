import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Persist the list scroll position per route key and restore it on back/forward (POP).
 *
 * Why: SPA lists scroll to top on page change, but browser back remounts the list with
 * the restored URL — without this hook the user loses both the view state and the scroll
 * position. The position is saved right before unmount (navigation away), keyed by route
 * + page so each page restores its own spot.
 */
export function useListScrollRestoration(key: string): void {
  const navigationType = useNavigationType();
  const location = useLocation();
  const storageKey = `armamods:scroll:${key}`;

  // Save before unmount (SPA navigation away) and on hard unload.
  useEffect(() => {
    const save = () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      save();
    };
  }, [storageKey]);

  // Restore after paint (rAF) so it wins over any page-change scrollTo(0) effect.
  const restoredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (navigationType !== 'POP') return;
    if (restoredKeyRef.current === location.key) return;
    restoredKeyRef.current = location.key;
    const raw = sessionStorage.getItem(storageKey);
    const y = raw == null ? 0 : parseInt(raw, 10);
    requestAnimationFrame(() => {
      window.scrollTo(0, Number.isFinite(y) && y > 0 ? y : 0);
    });
  }, [navigationType, location.key, storageKey]);
}
