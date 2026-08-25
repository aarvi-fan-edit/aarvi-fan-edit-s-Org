import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { Lightbox } from "@/components/site/Lightbox";
import { AlbumCard } from "@/components/site/AlbumCard";
import { AlbumDetail } from "@/components/site/AlbumDetail";
import { useReveal } from "@/hooks/use-reveal";
import {
  ARCHIVE_NAME,
  buildFilters,
  buildAlbumFilters,
  fetchPhotos,
  fetchAlbums,
  matchesFilter,
  matchesSearch,
  matchesAlbumFilter,
  matchesAlbumSearch,
  photosQueryKey,
  albumsQueryKey,
  type Album,
} from "@/lib/archive";
import { fetchSiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";
import { Grid, Layers } from "lucide-react";

export const Route = createFileRoute("/archive")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      album: typeof search.album === "string" ? search.album : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: `Archive & Collections — ${ARCHIVE_NAME}` },
      {
        name: "description",
        content:
          "Browse curated albums, collections, events, photoshoots, red carpet and editorial work, catalogued by collection and year.",
      },
      { property: "og:title", content: `Archive & Collections — ${ARCHIVE_NAME}` },
      {
        property: "og:description",
        content: "Curated collections and photographic archive, filterable by category and year.",
      },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/archive" });

  const { data: photos = [], isLoading: isPhotosLoading } = useQuery({
    queryKey: photosQueryKey,
    queryFn: fetchPhotos,
  });

  const { data: albums = [], isLoading: isAlbumsLoading } = useQuery({
    queryKey: albumsQueryKey,
    queryFn: fetchAlbums,
  });

  const { data: siteContent = DEFAULT_SITE_CONTENT } = useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContent,
  });

  const [viewMode, setViewMode] = useState<"albums" | "all">("albums");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(searchParams.album || null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useReveal();

  // Sync state if URL search query changes
  useEffect(() => {
    if (searchParams.album !== undefined) {
      setSelectedAlbumId(searchParams.album);
    }
  }, [searchParams.album]);

  const handleSelectAlbum = (albumId: string | null) => {
    setSelectedAlbumId(albumId);
    void navigate({
      search: (prev) => ({
        ...prev,
        album: albumId || undefined,
      }),
      replace: true,
    });
  };

  const selectedAlbum = useMemo(() => {
    if (!selectedAlbumId) return null;
    return albums.find((a) => a.id === selectedAlbumId) || null;
  }, [albums, selectedAlbumId]);

  // Filters for Albums
  const albumFilters = useMemo(() => buildAlbumFilters(albums), [albums]);
  const visibleAlbums = useMemo(
    () => albums.filter((a) => matchesAlbumFilter(a, filter) && matchesAlbumSearch(a, search)),
    [albums, filter, search],
  );

  // Filters for Flat Photos
  const photoFilters = useMemo(() => buildFilters(photos), [photos]);
  const visiblePhotos = useMemo(
    () => photos.filter((p) => matchesFilter(p, filter) && matchesSearch(p, search)),
    [photos, filter, search],
  );

  const arc = siteContent.archive;
  const currentFilters = viewMode === "albums" ? albumFilters : photoFilters;
  const isLoading = isPhotosLoading || isAlbumsLoading;

  // If viewing a single album collection
  if (selectedAlbum) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="pt-20 sm:pt-24 md:pt-32">
          <AlbumDetail
            album={selectedAlbum}
            allPhotos={photos}
            onBack={() => handleSelectAlbum(null)}
          />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="px-4 pt-32 sm:px-6 sm:pt-36 md:px-12 md:pt-48">
        <div className="mx-auto max-w-[1600px] flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow animate-fade">
              {viewMode === "albums"
                ? `${albums.length} collections curated`
                : `${photos.length} ${arc.cataloguedLabel || "photographs catalogued"}`}
            </p>
            <h1 className="display animate-rise mt-4 text-[clamp(2.75rem,9vw,8rem)]">
              {arc.pageTitle || "Archive"}
            </h1>
          </div>

          {/* View Mode Toggle: Collections / All Photos */}
          <div className="flex items-center gap-1.5 sm:gap-2 border border-border/60 p-1 bg-secondary/20 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode("albums");
                setFilter("All");
              }}
              className={`eyebrow flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs transition-all ${
                viewMode === "albums"
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Collections ({albums.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("all");
                setFilter("All");
              }}
              className={`eyebrow flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs transition-all ${
                viewMode === "all"
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              All Photos ({photos.length})
            </button>
          </div>
        </div>

        {/* Filters + search */}
        <div
          id="search"
          className="mx-auto mt-12 sm:mt-16 flex max-w-[1600px] flex-col gap-6 sm:gap-8 border-y border-border py-5 sm:py-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-2.5 sm:gap-y-3">
            {currentFilters.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={`eyebrow pb-1 text-xs transition-colors ${
                  filter === name ? "border-b border-accent text-accent" : "hover:text-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              viewMode === "albums"
                ? "Search collections, location or year"
                : arc.searchPlaceholder || "Search title, event or year"
            }
            className="w-full max-w-xs border-b border-border bg-transparent pb-2 text-sm outline-none placeholder:text-muted-foreground focus:border-accent"
            aria-label={viewMode === "albums" ? "Search collections" : "Search photographs"}
          />
        </div>
      </section>

      {/* Main Content: Albums Grid or Flat Photo Grid */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1600px]">
          {isLoading ? (
            <p className="eyebrow text-muted-foreground">Loading archive…</p>
          ) : viewMode === "albums" ? (
            // ALBUMS VIEW
            visibleAlbums.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-2xl sm:text-3xl text-muted-foreground">
                  No collections match this selection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter("All");
                    setSearch("");
                  }}
                  className="eyebrow mt-4 text-xs text-accent underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
                {visibleAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    photos={photos}
                    onClick={() => handleSelectAlbum(album.id)}
                  />
                ))}
              </div>
            )
          ) : // ALL PHOTOS FLAT VIEW
          visiblePhotos.length === 0 ? (
            <p className="py-20 text-center font-display text-2xl sm:text-3xl text-muted-foreground">
              {arc.emptyMessage || "No photographs match this selection."}
            </p>
          ) : (
            <PhotoGrid photos={visiblePhotos} columns={4} onSelect={(i) => setLightboxIndex(i)} />
          )}
        </div>
      </section>

      <SiteFooter />

      {lightboxIndex !== null && (
        <Lightbox
          photos={visiblePhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
