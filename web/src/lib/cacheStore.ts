import { getLastCacheSource, resetLastCacheSource } from '../api/client';

type Listener = (source: string) => void;
const listeners = new Set<Listener>();

/** Notify listeners after an API call completes. */
export function notifyCacheCheck() {
  const source = getLastCacheSource();
  resetLastCacheSource();
  listeners.forEach((fn) => fn(source));
}

export function subscribeCacheChanges(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
