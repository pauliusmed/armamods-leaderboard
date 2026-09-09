import { useEffect, useState } from 'react';

/** SSR-safe matchMedia hook — pradinė reikšmė skaitoma sinchroniškai,
 * kad pirmas render iškart atitiktų viewport (be dvigubo render + layout thrash). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
