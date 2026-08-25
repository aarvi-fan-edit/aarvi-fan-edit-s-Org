import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { AlbumCard } from "@/components/site/AlbumCard";
import { Lightbox } from "@/components/site/Lightbox";
import { useReveal } from "@/hooks/use-reveal";
import {
  ARCHIVE_NAME,
  fetchPhotos,
  fetchAlbums,
  photosQueryKey,
  albumsQueryKey,
} from "@/lib/archive";
import { fetchSiteContent, siteContentQueryKey } from "@/lib/site-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${ARCHIVE_NAME} — The Archive` },
      {
        name: "description",
        content: `The official photographic archive of ${ARCHIVE_NAME}: editorial sittings, red carpet arrivals and curated collections catalogued by year.`,
      },
      { property: "og:title", content: `${ARCHIVE_NAME} — The Archive` },
      {
        property: "og:description",
        content: `A cinematic archive of ${ARCHIVE_NAME}'s photography and curated collections.`,
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { data: photos = [] } = useQuery({ queryKey: photosQueryKey, queryFn: fetchPhotos });
  const { data: albums = [] } = useQuery({ queryKey: albumsQueryKey, queryFn: fetchAlbums });
  const { data: siteContent, isLoading: isContentLoading } = useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContent,
    staleTime: 0,
  });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  useReveal();

  const brandName = siteContent?.brand.name || ARCHIVE_NAME;
  const hp = siteContent?.homepage;
  const heroImageUrl = hp?.heroImageUrl;

  // Independent Featured Photographs (up to 6)
  const featuredPhotos = useMemo(() => {
    return photos.filter((p) => p.featured).slice(0, 6);
  }, [photos]);

  // Curated Homepage Collections (ONLY cover cards, each collection appears once)
  const homepageAlbums = useMemo(() => {
    // 1. Filter albums selected for homepage (or all if none explicitly marked)
    let selected = albums.filter((a) => a.featuredOnHomepage !== false);
    if (selected.length === 0 && albums.length > 0) {
      selected = [...albums];
    }

    // 2. Sort by homepageOrder if defined, else stable order
    selected.sort((a, b) => {
      const orderA = typeof a.homepageOrder === "number" ? a.homepageOrder : 999;
      const orderB = typeof b.homepageOrder === "number" ? b.homepageOrder : 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // 3. Slice according to max count (default 6)
    const maxCount =
      hp?.collectionsMaxCount && hp.collectionsMaxCount > 0 ? hp.collectionsMaxCount : 6;
    return selected.slice(0, maxCount);
  }, [albums, hp?.collectionsMaxCount]);

  const showViewAll = hp?.showViewAllButton !== false;
  const viewAllText = hp?.latestSectionButtonText || "VIEW ALL";

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO — visually dominant, full viewport with zero-flash loading */}
      <section className="relative h-[100svh] min-h-[580px] w-full overflow-hidden bg-background">
        {/* Placeholder / ambient dark gradient while CMS content or image loads */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/40 to-background" />

        {/* Hero image only rendered once authoritative CMS content is fetched */}
        {!isContentLoading && heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={hp?.heroImageAlt || `${brandName} photographed in a darkened studio`}
            width={1600}
            height={1000}
            onLoad={() => setHeroImageLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${
              heroImageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-background" />

        <div className="relative flex h-full flex-col justify-end px-4 pb-16 sm:px-6 sm:pb-20 md:px-12 md:pb-28">
          <p className="eyebrow animate-fade">{hp?.heroSubtitle || "Photography — 2024 to 2026"}</p>
          <h1 className="display animate-rise mt-4 sm:mt-6 text-[clamp(2.75rem,12vw,10.5rem)] leading-[0.95] tracking-tight break-words">
            {hp?.heroTitle || "The Archive"}
          </h1>
          <div className="animate-rise mt-6 sm:mt-8 flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {hp?.heroDescription ||
                `A permanent record of ${brandName}'s work in front of the camera — editorial sittings, festival arrivals and quiet moments between takes.`}
            </p>
            <Link
              to="/archive"
              className="group inline-flex w-fit items-center gap-3 sm:gap-4 border-b border-accent pb-2 eyebrow text-accent transition-all hover:gap-6 min-h-[44px]"
            >
              {hp?.heroButtonText || "Explore Archive"}
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED PHOTOGRAPHS (Independent single images) */}
      {featuredPhotos.length > 0 && (
        <section className="px-4 py-20 sm:px-6 sm:py-28 md:px-12 md:py-36">
          <div className="reveal mx-auto max-w-[1600px]">
            <p className="eyebrow">{hp?.featuredSectionEyebrow || "Selected"}</p>
            <h2 className="display mt-3 sm:mt-4 text-4xl sm:text-5xl md:text-7xl">
              {hp?.featuredSectionTitle || "Featured Photographs"}
            </h2>
          </div>
          <div className="mx-auto mt-12 sm:mt-16 max-w-[1600px]">
            <PhotoGrid
              photos={featuredPhotos}
              columns={3}
              onSelect={(i) => {
                const foundIndex = photos.findIndex((p) => p.id === featuredPhotos[i]?.id);
                setLightboxIndex(foundIndex >= 0 ? foundIndex : 0);
              }}
            />
          </div>
        </section>
      )}

      {/* CURATED COLLECTIONS (ONLY Album Covers - One tile per collection) */}
      {homepageAlbums.length > 0 && (
        <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28 md:px-12 md:py-36">
          <div className="reveal mx-auto flex max-w-[1600px] flex-col gap-5 sm:gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{hp?.latestSectionEyebrow || "Curated"}</p>
              <h2 className="display mt-3 sm:mt-4 text-4xl sm:text-5xl md:text-7xl">
                {hp?.latestSectionTitle || "Collections"}
              </h2>
            </div>

            {showViewAll && (
              <Link
                to="/archive"
                className="eyebrow w-fit border-b border-border pb-2 text-xs transition-colors hover:border-foreground hover:text-foreground min-h-[36px] flex items-center"
              >
                {viewAllText} →
              </Link>
            )}
          </div>

          <div className="mx-auto mt-12 sm:mt-16 max-w-[1600px]">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
              {homepageAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  photos={photos}
                  onClick={() => {
                    void navigate({
                      to: "/archive",
                      search: { album: album.id },
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
