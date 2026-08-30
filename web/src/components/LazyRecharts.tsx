import { lazy } from 'react';

/**
 * Lazy-loaded Recharts components — atidedame 338 kB LineChart bundle
 * iki kol vartotojas iš tikrųjų pasiekia grafiko sekciją.
 * Fallback: Skeleton (tuščias) kol kraunasi.
 */
export const LazyLineChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);
export const LazyResponsiveContainer = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ResponsiveContainer }))
);
export const LazyXAxis = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.XAxis }))
);
export const LazyYAxis = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.YAxis }))
);
export const LazyCartesianGrid = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.CartesianGrid }))
);
export const LazyTooltip = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.Tooltip }))
);
export const LazyReferenceLine = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ReferenceLine }))
);
export const LazyReferenceArea = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ReferenceArea }))
);
export const LazyLine = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.Line }))
);

export function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse rounded bg-white/5" />
  );
}
