import { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { Photo } from "@/lib/archive";
import { formatDate } from "@/lib/archive";

type Props = {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/**
 * Full-screen image viewer. Arrow keys, Escape, and touch swipe gestures work;
 * metadata sits quietly along the bottom edge rather than in a boxed dialog.
 */
export function Lightbox({ photos, index, onClose, onIndexChange }: Props) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);

  const go = (step: number) => {
    onIndexChange((index + step + photos.length) % photos.length);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX !== null) {
      const diff = touchStartX.current - endX;
      if (Math.abs(diff) > 45) {
        if (diff > 0) {
          go(1); // Swiped left -> next
        } else {
          go(-1); // Swiped right -> prev
        }
      }
    }
    touchStartX.current = null;
  };

  if (!photo) return null;

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-10">
        <span className="eyebrow text-xs">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="eyebrow flex items-center gap-2 p-2 text-xs transition-colors hover:text-foreground min-h-[44px]"
          aria-label="Close viewer"
        >
          Close <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-4 md:px-24">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photograph"
          className="absolute left-1 sm:left-2 md:left-6 z-10 p-3 text-muted-foreground transition-colors hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        <img
          key={photo.id}
          src={photo.image_url}
          alt={photo.title}
          className="animate-fade max-h-[75vh] max-w-[95vw] sm:max-h-full sm:max-w-full object-contain select-none"
        />

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photograph"
          className="absolute right-1 sm:right-2 md:right-6 z-10 p-3 text-muted-foreground transition-colors hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      <div className="px-4 pb-6 pt-4 sm:px-6 sm:pb-10 sm:pt-6 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 border-t border-border pt-4 sm:pt-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl">{photo.title}</h2>
            {photo.description && (
              <p className="mt-1 sm:mt-2 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {photo.description}
              </p>
            )}
          </div>
          <dl className="flex flex-wrap gap-x-6 sm:gap-x-10 gap-y-2 text-xs sm:text-sm">
            <div>
              <dt className="eyebrow text-[10px] sm:text-xs">Category</dt>
              <dd className="mt-0.5">{photo.category}</dd>
            </div>
            {photo.event_name && (
              <div>
                <dt className="eyebrow text-[10px] sm:text-xs">Event</dt>
                <dd className="mt-0.5">{photo.event_name}</dd>
              </div>
            )}
            {photo.taken_on && (
              <div>
                <dt className="eyebrow text-[10px] sm:text-xs">Date</dt>
                <dd className="mt-0.5">{formatDate(photo.taken_on)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
