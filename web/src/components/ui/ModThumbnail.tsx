import { useEffect, useRef, useState } from 'react';
import type { GameType } from '../../api/client';
import { modListThumbnailUrl, cdnResizedThumbnailUrl, ENABLE_CDN_TRANSFORMS } from '../../lib/workshop';

const SIZE_PX = { sm: 64, md: 96, lg: 128 } as const;

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
  /** CDN URL from leaderboard list — skips extra API round-trips. */
  thumbnailUrl?: string | null;
  /** Hero/detail thumbnails should load immediately, not wait for scroll. */
  priority?: 'eager' | 'lazy';
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

export function ModThumbnail({
  modId,
  modName,
  game = 'reforger',
  size = 'sm',
  className = '',
  thumbnailUrl,
  priority = 'lazy',
}: ModThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(priority === 'eager');
  const rootRef = useRef<HTMLSpanElement>(null);
  const sizeClass = SIZE_CLASS[size];
  const sizePx = SIZE_PX[size];

  const eagerSrc = thumbnailUrl && priority === 'eager' ? thumbnailUrl : null;
  const cdnSrc =
    ENABLE_CDN_TRANSFORMS && thumbnailUrl && !thumbnailUrl.includes('og-image')
      ? cdnResizedThumbnailUrl(thumbnailUrl, sizePx)
      : null;
  const proxySrc = modListThumbnailUrl(modId, game, sizePx);
  const [src, setSrc] = useState<string>(eagerSrc ?? cdnSrc ?? proxySrc);

  // Adjust state during render when the source changes (React "derived state" pattern).
  const [prevKey, setPrevKey] = useState<string | undefined>(undefined);
  const resetKey = `${modId}:${game}:${thumbnailUrl ?? ''}:${priority}`;
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setFailed(false);
    setVisible(priority === 'eager');
    setSrc(eagerSrc ?? cdnSrc ?? proxySrc);
  }

  // If the edge-transform URL fails (transformations not enabled), fall back to the
  // Worker proxy; only then to the letter placeholder.
  const handleError = () => {
    if (src === cdnSrc && proxySrc && proxySrc !== cdnSrc) {
      setSrc(proxySrc);
      return;
    }
    setFailed(true);
  };

  useEffect(() => {
    if (priority === 'eager') return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [modId, priority]);

  if (failed) {
    return <Fallback modName={modName} sizeClass={sizeClass} className={className} />;
  }

  return (
    <span ref={rootRef} className={`inline-flex shrink-0 ${className}`}>
      {visible ? (
        <img
          src={src}
          alt={modName?.trim() ? `${modName} thumbnail` : `Mod ${modId} thumbnail`}
          loading={priority === 'eager' ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority === 'eager' ? 'high' : 'low'}
          width={size === 'lg' ? 96 : size === 'md' ? 48 : 32}
          height={size === 'lg' ? 96 : size === 'md' ? 48 : 32}
          onError={handleError}
          className={`${sizeClass} object-cover border border-white/10 bg-black/60`}
        />
      ) : (
        <Placeholder sizeClass={sizeClass} className="" />
      )}
    </span>
  );
}
