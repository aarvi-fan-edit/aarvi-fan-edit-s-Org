import type { Photo } from "@/lib/archive";
import { formatDate } from "@/lib/archive";

type Props = {
  photos: Photo[];
  onSelect: (index: number) => void;
  /** Number of masonry columns on large screens. */
  columns?: 2 | 3 | 4;
};

/**
 * Masonry (Pinterest-style) gallery built with CSS columns — no JavaScript
 * layout maths, so it stays smooth and works on every screen size.
 */
export function PhotoGrid({ photos, onSelect, columns = 3 }: Props) {
  const columnClass =
    columns === 4
      ? "sm:columns-2 lg:columns-3 xl:columns-4"
      : columns === 2
        ? "sm:columns-2"
        : "sm:columns-2 lg:columns-3";

  return (
    <div className={`columns-1 gap-4 md:gap-6 ${columnClass}`}>
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onClick={() => onSelect(index)}
          priority={index < 3}
        />
      ))}
    </div>
  );
}

function PhotoCard({
  photo,
  onClick,
  priority,
}: {
  photo: Photo;
  onClick: () => void;
  priority: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="reveal group mb-4 block w-full cursor-pointer overflow-hidden bg-card text-left md:mb-6"
      aria-label={`Open ${photo.title}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={photo.image_url}
          alt={photo.title}
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="font-display text-2xl leading-tight">{photo.title}</p>
          <p className="eyebrow mt-2">
            {photo.category}
            {photo.taken_on ? ` — ${formatDate(photo.taken_on)}` : ""}
          </p>
        </div>
      </div>
    </button>
  );
}
