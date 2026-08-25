import { useMemo, useState } from "react";
import type { Album, Photo } from "@/lib/archive";
import { formatDate } from "@/lib/archive";
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { Lightbox } from "@/components/site/Lightbox";
import { ArrowLeft, Calendar, MapPin, Tag } from "lucide-react";

interface AlbumDetailProps {
  album: Album;
  allPhotos: Photo[];
  onBack: () => void;
}

export function AlbumDetail({ album, allPhotos, onBack }: AlbumDetailProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Resolve the photos belonging to this album in specified order
  const albumPhotos = useMemo(() => {
    const photoMap = new Map(allPhotos.map((p) => [p.id, p]));
    const list: Photo[] = [];

    for (const pid of album.photoIds || []) {
      const p = photoMap.get(pid);
      if (p) {
        list.push(p);
        photoMap.delete(pid);
      }
    }

    // Also include photos assigned to album_id
    for (const p of photoMap.values()) {
      if (p.album_id === album.id) {
        list.push(p);
      }
    }

    return list;
  }, [album, allPhotos]);

  return (
    <div className="min-h-screen">
      {/* Header & Back Navigation */}
      <div className="border-b border-border/40 bg-secondary/10 py-8 px-4 sm:py-12 sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1600px]">
          <button
            type="button"
            onClick={onBack}
            className="eyebrow group inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground mb-6 sm:mb-8 min-h-[40px]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to All Collections
          </button>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground eyebrow mb-3">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3 text-accent" />
                  {album.category}
                </span>
                <span>•</span>
                <span>{album.year}</span>
                {album.date && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(album.date)}
                    </span>
                  </>
                )}
                {album.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {album.location}
                    </span>
                  </>
                )}
              </div>

              <h1 className="display text-3xl sm:text-5xl md:text-7xl text-foreground break-words leading-tight">
                {album.title}
              </h1>

              {album.description && (
                <p className="mt-4 sm:mt-6 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl">
                  {album.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4 self-start lg:self-auto">
              <div className="border border-border/60 bg-background/60 backdrop-blur px-4 py-2.5 sm:px-5 sm:py-3 text-left lg:text-right">
                <div className="eyebrow text-[10px] text-muted-foreground">Collection Size</div>
                <div className="display text-xl sm:text-2xl text-accent font-semibold mt-0.5">
                  {albumPhotos.length} {albumPhotos.length === 1 ? "Photo" : "Photos"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos Masonry Grid */}
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 sm:py-16 md:px-12">
        {albumPhotos.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-border py-16 text-center">
            <p className="display text-2xl text-muted-foreground">
              This collection is currently empty
            </p>
            <p className="eyebrow mt-2 text-xs text-muted-foreground/60">
              Photographs can be added to this collection in the Admin Portal.
            </p>
          </div>
        ) : (
          <PhotoGrid photos={albumPhotos} columns={3} onSelect={(i) => setLightboxIndex(i)} />
        )}
      </div>

      {/* Lightbox for full screen viewing */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={albumPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
