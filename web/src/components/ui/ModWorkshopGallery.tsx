import { useEffect, useState, useCallback } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';
import type { ModGalleryImage } from '../../types';

function isLandscapeImage(image: ModGalleryImage): boolean {
  return Boolean(image.width && image.height && image.width > image.height);
}

/** Hero inline drops the leading workshop icon only when more media exists. */
function pickInlineGalleryImages(gallery: ModGalleryImage[]): ModGalleryImage[] {
  if (gallery.length <= 2) return gallery;
  return gallery.slice(1);
}

interface ModWorkshopGalleryProps {
  modId: string;
  modName?: string;
  game?: GameType;
  /** inline = compact square in mod hero row; standalone = full-width block below hero */
  variant?: 'inline' | 'standalone';
  onVisibilityChange?: (visible: boolean) => void;
}

export function ModWorkshopGallery({
  modId,
  modName,
  game = 'reforger',
  variant = 'standalone',
  onVisibilityChange,
}: ModWorkshopGalleryProps) {
  const [images, setImages] = useState<ModGalleryImage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'hidden'>('loading');
  const [active, setActive] = useState(0);
  const isInline = variant === 'inline';

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setActive(0);
    setStatus('loading');

    if (game !== 'reforger') {
      setStatus('hidden');
      return;
    }

    modsApi
      .getGallery(modId, game)
      .then((gallery) => {
        if (cancelled) return;
        if (gallery.length === 0) {
          setStatus('hidden');
          return;
        }
        if (!isInline && gallery.length <= 1) {
          setStatus('hidden');
          return;
        }
        const chosen = isInline ? pickInlineGalleryImages(gallery) : gallery;
        if (chosen.length === 0) {
          setStatus('hidden');
          return;
        }
        setImages(chosen);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('hidden');
      });

    return () => {
      cancelled = true;
    };
  }, [modId, game, isInline]);

  useEffect(() => {
    onVisibilityChange?.(status === 'ready' && images.length > 0);
    return () => onVisibilityChange?.(false);
  }, [status, images.length, onVisibilityChange]);

  const go = useCallback(
    (delta: number) => {
      setActive((i) => (i + delta + images.length) % images.length);
    },
    [images.length]
  );

  if (status !== 'ready' || images.length === 0) return null;

  const label = modName ?? 'Mod';
  const hasMultiple = images.length > 1;
  const navBtn = isInline ? 'w-8 h-8 text-base' : 'w-9 h-9';
  const footerPad = isInline ? 'py-2.5' : 'py-3';
  const frameClass = isInline ? 'aspect-[4/3]' : 'aspect-square';

  return (
    <section
      className={`border border-white/5 bg-zinc-950/50 ${
        isInline ? 'w-full' : 'w-full max-w-md sm:max-w-lg mx-auto'
      }`}
      aria-label={`${label} workshop gallery`}
    >
      <div className={`relative w-full ${frameClass} bg-zinc-950 overflow-hidden`}>
        {images.map((image, index) => (
          <a
            key={image.url}
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            title={`Open screenshot ${index + 1} of ${images.length}`}
            tabIndex={index === active ? 0 : -1}
          >
            <img
              src={image.url}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={`w-full h-full object-center ${
                isInline && isLandscapeImage(image) ? 'object-cover' : 'object-contain'
              }`}
            />
          </a>
        ))}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={`absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-black/70 border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors ${navBtn}`}
              aria-label="Previous screenshot"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-black/70 border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors ${navBtn}`}
              aria-label="Next screenshot"
            >
              ›
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className={`flex items-center justify-center gap-2 ${footerPad} border-t border-white/5`}>
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === active
                  ? 'w-6 bg-tactical-orange'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Screenshot ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
            />
          ))}
          <span className="ml-2 text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
            {active + 1} / {images.length}
          </span>
        </div>
      )}
    </section>
  );
}
