import { useMemo } from "react";
import type { Album, Photo } from "@/lib/archive";
import { Folder, Image as ImageIcon, MapPin } from "lucide-react";

interface AlbumCardProps {
  album: Album;
  photos: Photo[];
  onClick?: () => void;
}

export function AlbumCard({ album, photos, onClick }: AlbumCardProps) {
  // Find cover photo object safely
  const coverPhoto = useMemo(() => {
    if (album.coverPhotoId) {
      const found = photos.find((p) => p.id === album.coverPhotoId);
      if (found) return found;
    }
    if (album.photoIds && album.photoIds.length > 0) {
      const first = photos.find((p) => p.id === album.photoIds[0]);
      if (first) return first;
    }
    // Also check photos assigned to album_id
    const assigned = photos.find((p) => p.album_id === album.id);
    if (assigned) return assigned;

    return photos[0] || null;
  }, [album, photos]);

  // Compute total photograph count in this collection
  const count = useMemo(() => {
    const idsCount = album.photoIds ? album.photoIds.length : 0;
    const assignedCount = photos.filter(
      (p) => p.album_id === album.id && !(album.photoIds || []).includes(p.id),
    ).length;
    return Math.max(idsCount + assignedCount, idsCount);
  }, [album, photos]);

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer overflow-hidden border border-border/40 bg-secondary/20 transition-all duration-500 hover:border-foreground/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Open ${album.title} collection`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {coverPhoto ? (
          <img
            src={coverPhoto.image_url}
            alt={album.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-muted/50">
            <ImageIcon className="h-10 w-10 opacity-30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-60" />

        {/* Category & Year badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 sm:top-4 sm:left-4 sm:right-4">
          <span className="eyebrow border border-border/40 bg-background/85 backdrop-blur-md px-2.5 py-1 text-[10px] text-foreground font-medium">
            {album.category}
          </span>
          <span className="eyebrow border border-border/40 bg-background/85 backdrop-blur-md px-2.5 py-1 text-[10px] text-muted-foreground">
            {album.year}
          </span>
        </div>

        {/* Photo count badge */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-1.5 border border-accent/20 bg-background/90 backdrop-blur-md px-2.5 py-1 text-[10px] eyebrow text-accent">
          <Folder className="h-3 w-3" />
          <span>
            {count} {count === 1 ? "PHOTOGRAPH" : "PHOTOGRAPHS"}
          </span>
        </div>
      </div>

      {/* Album Info */}
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div>
          <h3 className="display text-xl sm:text-2xl tracking-wide text-foreground transition-colors group-hover:text-accent">
            {album.title}
          </h3>

          {album.location && (
            <p className="eyebrow mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-accent/70" />
              {album.location}
            </p>
          )}

          {album.description && (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
              {album.description}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
          <span className="eyebrow text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
            View Collection →
          </span>
        </div>
      </div>
    </article>
  );
}
