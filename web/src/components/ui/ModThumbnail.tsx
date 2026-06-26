import { useEffect, useState } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';

const SIZE_CLASS = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-12 h-12 text-xs',
  lg: 'w-20 h-20 sm:w-24 sm:h-24 text-lg',
} as const;

interface ModThumbnailProps {
  modId: string;
  modName?: string;
  game?: GameType;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

function fallbackInitial(modName?: string): string {
  const trimmed = modName?.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : '?';
}

function Fallback({
  modName,
  sizeClass,
  className,
}: {
  modName?: string;
  sizeClass: string;
  className: string;
}) {
  return (
    <div
      className={`${sizeClass} shrink-0 bg-tactical-orange/15 border border-tactical-orange/30 flex items-center justify-center text-tactical-orange font-black ${className}`}
      aria-hidden
    >
      {fallbackInitial(modName)}
    </div>
  );
}

function Placeholder({ sizeClass, className }: { sizeClass: string; className: string }) {
  return (
    <div
      className={`${sizeClass} shrink-0 bg-white/5 border border-white/10 animate-pulse ${className}`}
      aria-hidden
    />
  );
}

/**
 * Resolves workshop CDN URL once (JSON API + client cache), then loads image
 * directly from Bohemia CDN — skips per-image 302 through our Worker.
 * Falls back to /api/og/preview when the JSON endpoint is unavailable.
 */
export function ModThumbnail({
  modId,
  modName,
  game = 'reforger',
  size = 'sm',
  className = '',
}: ModThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const sizeClass = SIZE_CLASS[size];

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setStatus('loading');

    modsApi
      .getThumbnailUrl(modId, game)
      .then((url) => {
        if (cancelled) return;
        if (!url || url.includes('/og-image.png')) {
          setStatus('failed');
          return;
        }
        setSrc(url);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [modId, game]);

  if (status === 'loading') {
    return <Placeholder sizeClass={sizeClass} className={className} />;
  }

  if (status === 'failed' || !src) {
    return <Fallback modName={modName} sizeClass={sizeClass} className={className} />;
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onError={() => setStatus('failed')}
      className={`${sizeClass} shrink-0 object-cover border border-white/10 bg-black/60 ${className}`}
    />
  );
}
