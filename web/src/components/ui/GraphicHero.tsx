import type { ReactNode } from 'react';

interface GraphicHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  imageSrc: string;
  imageSrcSet: string;
  imageAlt: string;
  children?: ReactNode;
  compact?: boolean;
}

/**
 * Editorial landing-page hero. Generated artwork remains atmospheric while
 * the gradient keeps copy readable at every responsive crop.
 */
export function GraphicHero({
  eyebrow,
  title,
  description,
  imageSrc,
  imageSrcSet,
  imageAlt,
  children,
  compact = false,
}: GraphicHeroProps) {
  const heightClass = compact
    ? 'min-h-[360px] sm:min-h-[400px]'
    : 'min-h-[500px] sm:min-h-[560px]';

  return (
    <section
      className={`relative isolate overflow-hidden border-y border-white/10 bg-[#0d1520] ${heightClass}`}
    >
      <img
        src={imageSrc}
        srcSet={imageSrcSet}
        sizes="(max-width: 960px) 960px, 1600px"
        alt={imageAlt}
        className="absolute inset-0 h-full w-full object-cover object-[68%_50%] sm:object-center"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,#101923_0%,rgba(16,25,35,0.98)_28%,rgba(16,25,35,0.82)_52%,rgba(16,25,35,0.18)_78%,rgba(16,25,35,0.32)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,25,35,0.38)_0%,transparent_38%,rgba(16,25,35,0.78)_100%)]" />
      <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/10" />

      <span className="absolute left-4 top-4 h-6 w-6 border-l border-t border-white/25 sm:left-6 sm:top-6" aria-hidden="true" />
      <span className="absolute bottom-4 right-4 h-6 w-6 border-b border-r border-white/25 sm:bottom-6 sm:right-6" aria-hidden="true" />

      <div className={`relative z-10 flex ${heightClass} items-center px-5 py-12 sm:px-10 lg:px-14`}>
        <div className="max-w-3xl space-y-5 sm:space-y-6">
          <p className="text-[9px] font-black uppercase tracking-[0.42em] text-tactical-orange sm:text-[10px]">
            {eyebrow}
          </p>
          <h1
            className={`${
              compact ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-6xl lg:text-7xl'
            } max-w-4xl font-black uppercase leading-[0.92] tracking-tighter text-white`}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-300 sm:text-base">
            {description}
          </p>
          {children}
        </div>
      </div>

      <div className="absolute bottom-4 right-14 hidden items-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 sm:flex" aria-hidden="true">
        <span className="h-px w-12 bg-white/20" />
        Modern operations visual
      </div>
    </section>
  );
}
