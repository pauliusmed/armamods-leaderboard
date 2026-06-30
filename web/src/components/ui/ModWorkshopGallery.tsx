import { useEffect, useState } from 'react';
import type { GameType } from '../../api/client';
import { modsApi } from '../../api/client';
import type { ModGalleryImage } from '../../types';
import { ModThumbnail } from './ModThumbnail';

interface ModWorkshopGalleryProps {
  modId: string;
  modName?: string;
  game?: GameType;
  className?: string;
}

function GallerySkeleton({ className }: { className: string }) {
  return (
    <div
      className={`w-full max-w-sm aspect-4/3 bg-white/5 border border-white/10 animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function ModWorkshopGallery({
  modId,
  modName,
  game = 'reforger',
  className = '',
}: ModWorkshopGalleryProps) {
  const [images, setImages] = useState<ModGalleryImage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setStatus('loading');

    if (game !== 'reforger') {
      setStatus('empty');
      return;
    }

    modsApi
      .getGallery(modId, game)
      .then((gallery) => {
        if (cancelled) return;
        if (gallery.length === 0) {
          setStatus('empty');
          return;
        }
        setImages(gallery);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('empty');
      });

    return () => {
      cancelled = true;
    };
  }, [modId, game]);

  if (status === 'loading') {
    return <GallerySkeleton className={className} />;
  }

  if (status === 'empty') {
    return (
      <ModThumbnail
        modId={modId}
        modName={modName}
        game={game}
        size="lg"
        className={`self-start ${className}`}
      />
    );
  }

  return (
    <div className={`w-full max-w-sm shrink-0 space-y-2 ${className}`}>
      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [scrollbar-width:thin]"
        aria-label={`${modName ?? 'Mod'} workshop screenshots`}
      >
        {images.map((image, index) => (
          <a
            key={image.url}
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-start shrink-0 w-[85%] sm:w-72 aspect-4/3 border border-white/10 bg-black/60 overflow-hidden hover:border-tactical-orange/40 transition-colors"
            title={`Open screenshot ${index + 1} of ${images.length}`}
          >
            <img
              src={image.thumb || image.url}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover"
            />
          </a>
        ))}
      </div>
      {images.length > 1 && (
        <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.25em] text-center">
          Scroll for {images.length} workshop shots
        </p>
      )}
    </div>
  );
}
