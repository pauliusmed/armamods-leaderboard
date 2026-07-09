import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ModGalleryImage } from '../../types';

interface GalleryLightboxProps {
  images: ModGalleryImage[];
  active: number;
  onActiveChange: (index: number) => void;
  onClose: () => void;
  label: string;
}

export function GalleryLightbox({
  images,
  active,
  onActiveChange,
  onClose,
  label,
}: GalleryLightboxProps) {
  const image = images[active];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        onActiveChange((active - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight') {
        onActiveChange((active + 1) % images.length);
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, images.length, onActiveChange, onClose]);

  if (!image) return null;

  const go = (delta: number) => {
    onActiveChange((active + delta + images.length) % images.length);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} screenshot preview`}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center w-full max-w-6xl max-h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full mb-3 gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 truncate">
            {label}
            {hasMultiple && (
              <span className="text-gray-600 ml-2 tabular-nums">
                {active + 1} / {images.length}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-tactical-orange transition-colors px-2 py-1 border border-white/10 hover:border-tactical-orange/40"
            >
              Full size ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors text-lg leading-none"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center w-full flex-1 min-h-0">
          {hasMultiple && (
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/70 border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors text-xl"
              aria-label="Previous screenshot"
            >
              ‹
            </button>
          )}

          <img
            src={image.url}
            alt={`${label} screenshot ${active + 1} of ${images.length}`}
            className="max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto object-contain select-none"
            draggable={false}
          />

          {hasMultiple && (
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/70 border border-white/10 text-white hover:border-tactical-orange/50 hover:text-tactical-orange transition-colors text-xl"
              aria-label="Next screenshot"
            >
              ›
            </button>
          )}
        </div>

        {hasMultiple && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {images.map((item, index) => (
              <button
                key={item.url}
                type="button"
                onClick={() => onActiveChange(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === active
                    ? 'w-6 bg-tactical-orange'
                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Screenshot ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
