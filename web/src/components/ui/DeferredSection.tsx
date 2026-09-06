import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferredSectionProps {
  children: ReactNode;
  /** Placeholder aukštis prieš mount'ą — rezervuoja vietą, kad nenueitų CLS. */
  minHeight?: number;
  className?: string;
}

/**
 * Render'ina children tik kai sekcija priartėja prie viewport (IntersectionObserver,
 * rootMargin 400px — turinys paruoštas dar prieš vartotojui pasiekiant).
 * Below-fold sekcijos boot metu nekuria DOM — mažiau sinchroninio React darbo (TBT).
 * Naudojimas: apvynioti Tik sekcijas, kurios visada turi turinį — sąlyginį turinį
 * sprendžiami prieš kvietimą (pvz. `length > 0 ? <DeferredSection>… : null`).
 */
export function DeferredSection({ children, minHeight = 320, className }: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  // IO nėra (labai senos naršyklės) — rodome iškart, be observer'io.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
