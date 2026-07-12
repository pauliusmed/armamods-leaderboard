import { useEffect, useState, useCallback } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';
import type { ModGalleryImage } from '../../types';
import { GalleryLightbox } from './GalleryLightbox';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isInline = variant === 'inline';

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setActive(0);
    setLightboxOpen(false);
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
  const navBtn = isInline ? 'w-11 h-11 sm:w-8 sm:h-8 text-base' : 'w-11 h-11 sm:w-9 sm:h-9';
  const footerPad = isInline ? 'py-2.5' : 'py-3';
  const frameClass = isInline ? 'aspect-[4/3]' : 'aspect-square';

  return (
    <>
    <section
      className={`border border-white/5 bg-[#172635] ${
        isInline ? 'w-full' : 'w-full max-w-md sm:max-w-lg mx-auto'
      }`}
      aria-label={`${label} workshop gallery`}
    >
      <div className={`relative w-full ${frameClass} bg-[#101923] overflow-hidden`}>
        {images.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => {
              setActive(index);
              setLightboxOpen(true);
            }}
            className={`absolute inset-0 transition-opacity duration-300 cursor-zoom-in group ${
              index === active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            title={`View screenshot ${index + 1} of ${images.length}`}
            tabIndex={index === active ? 0 : -1}
            aria-label={`View screenshot ${index + 1} of ${images.length}`}
          >
            <img
              src={image.url}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className={`w-full h-full object-center pointer-events-none ${
                isInline && isLandscapeImage(image) ? 'object-cover' : 'object-contain'
              }`}
            />
            <span
              className="absolute bottom-2 right-2 z-20 px-2 py-1 bg-black/70 border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              aria-hidden
            >
              Expand
            </span>
          </button>
        ))}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className={`absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-black/70 border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors ${navBtn}`}
              aria-label="Previous screenshot"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
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
              className="p-3 flex items-center justify-center"
              aria-label={`Screenshot ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  index === active
                    ? 'w-6 bg-tactical-orange'
                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
            {active + 1} / {images.length}
          </span>
        </div>
      )}
    </section>

    {lightboxOpen && (
      <GalleryLightbox
        images={images}
        active={active}
        onActiveChange={setActive}
        onClose={() => setLightboxOpen(false)}
        label={label}
      />
    )}
  </>
  );
}
