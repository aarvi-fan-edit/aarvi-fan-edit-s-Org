/**
 * Shared data helpers for the public archive.
 *
 * Photographs live in the `photos` table in Lovable Cloud.
 * Everyone may READ them; only the two administrator accounts may write
 * (that rule is enforced by the database, not by the UI).
 */
import { supabase } from "@/integrations/supabase/client";

export type Photo = {
  id: string;
  title: string;
  category: string;
  event_name: string | null;
  taken_on: string | null;
  description: string | null;
  image_url: string;
  thumbnail_url?: string | null;
  width: number | null;
  height: number | null;
  featured: boolean;
  album_id?: string | null;
  created_at: string;
};

export type Album = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  year: string;
  date: string | null;
  location: string | null;
  coverPhotoId: string;
  photoIds: string[];
  featuredOnHomepage?: boolean;
  homepageOrder?: number;
  createdAt: string;
  updatedAt: string;
};

/** The name shown across the site. Change it in this one place. */
export const ARCHIVE_NAME = "AARVI";

/** Categories offered in the admin form and as gallery filters. */
export const CATEGORIES = ["Events", "Photoshoots", "Red Carpet", "Editorial"] as const;

/** Sample photographs shown as fallback or default content. */
export const SAMPLE_PHOTOS: Photo[] = [
  {
    id: "sample-hero",
    title: "Nocturne",
    category: "Editorial",
    event_name: "Studio Series 01",
    taken_on: "2026-02-14",
    description: "Single-source rim light against pure black.",
    image_url: "/samples/hero.jpg",
    width: 1600,
    height: 1000,
    featured: true,
    created_at: "2026-02-14T00:00:00.000Z",
  },
  {
    id: "sample-p1",
    title: "Stillness",
    category: "Photoshoots",
    event_name: "Monochrome Sessions",
    taken_on: "2026-01-09",
    description: "Shot on 35mm, natural window light.",
    image_url: "/samples/p1.jpg",
    width: 900,
    height: 1200,
    featured: true,
    created_at: "2026-01-09T00:00:00.000Z",
  },
  {
    id: "sample-p2",
    title: "Arrival",
    category: "Red Carpet",
    event_name: "Global Film Awards",
    taken_on: "2026-03-22",
    description: "Flashbulbs on the carpet.",
    image_url: "/samples/p2.jpg",
    width: 1200,
    height: 800,
    featured: true,
    created_at: "2026-03-22T00:00:00.000Z",
  },
  {
    id: "sample-p3",
    title: "Concrete",
    category: "Photoshoots",
    event_name: "City Editorial",
    taken_on: "2025-11-02",
    description: "Hard shadows on a bare wall.",
    image_url: "/samples/p3.jpg",
    width: 900,
    height: 1350,
    featured: false,
    created_at: "2025-11-02T00:00:00.000Z",
  },
  {
    id: "sample-p4",
    title: "Between Takes",
    category: "Events",
    event_name: "Charity Gala",
    taken_on: "2025-09-18",
    description: "A candid moment backstage.",
    image_url: "/samples/p4.jpg",
    width: 1200,
    height: 900,
    featured: false,
    created_at: "2025-09-18T00:00:00.000Z",
  },
  {
    id: "sample-p5",
    title: "Silk",
    category: "Editorial",
    event_name: "Motion Study",
    taken_on: "2025-07-30",
    description: "Fabric caught mid-air.",
    image_url: "/samples/p5.jpg",
    width: 1000,
    height: 1250,
    featured: true,
    created_at: "2025-07-30T00:00:00.000Z",
  },
  {
    id: "sample-p6",
    title: "Rainfall",
    category: "Editorial",
    event_name: "Night Series",
    taken_on: "2025-05-11",
    description: "Neon reflections through glass.",
    image_url: "/samples/p6.jpg",
    width: 1400,
    height: 800,
    featured: false,
    created_at: "2025-05-11T00:00:00.000Z",
  },
  {
    id: "sample-p7",
    title: "Close",
    category: "Photoshoots",
    event_name: "Beauty Sitting",
    taken_on: "2024-12-04",
    description: "Minimal beauty portrait.",
    image_url: "/samples/p7.jpg",
    width: 1000,
    height: 1000,
    featured: false,
    created_at: "2024-12-04T00:00:00.000Z",
  },
  {
    id: "sample-p8",
    title: "The Award",
    category: "Events",
    event_name: "Critics Circle Night",
    taken_on: "2024-10-19",
    description: "On stage under a single spotlight.",
    image_url: "/samples/p8.jpg",
    width: 1200,
    height: 850,
    featured: false,
    created_at: "2024-10-19T00:00:00.000Z",
  },
  {
    id: "sample-p9",
    title: "Tailored",
    category: "Red Carpet",
    event_name: "Press Junket",
    taken_on: "2024-06-27",
    description: "Full-length monochrome study.",
    image_url: "/samples/p9.jpg",
    width: 900,
    height: 1400,
    featured: false,
    created_at: "2024-06-27T00:00:00.000Z",
  },
];

/** Fetch every photograph, newest / featured first. */
export async function fetchPhotos(): Promise<Photo[]> {
  try {
    // 1. Fetch from authoritative persistent catalogue
    const res = await fetch("/api/photos", { cache: "no-store" });
    if (res.ok) {
      const list = (await res.json()) as Photo[];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch {
    // Fall back to Supabase or sample list if network call fails
  }

  try {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      // Merge with sample photos if not already present to prevent data loss
      const dbPhotos = data as Photo[];
      const combined = [...dbPhotos];
      for (const sample of SAMPLE_PHOTOS) {
        if (!combined.some((p) => p.id === sample.id || p.image_url === sample.image_url)) {
          combined.push(sample);
        }
      }
      return combined;
    }
    return SAMPLE_PHOTOS;
  } catch (err) {
    console.warn(
      "[Archive] Failed to fetch photos from Supabase, using sample archive photos:",
      err,
    );
    return SAMPLE_PHOTOS;
  }
}

/** Query key used by TanStack Query so admin edits can refresh the gallery. */
export const photosQueryKey = ["photos"] as const;

/** "2026-03-22" -> "22 March 2026" */
export function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function yearOf(photo: Photo): string {
  return photo.taken_on ? photo.taken_on.slice(0, 4) : "";
}

/** Filter chips shown above the gallery: categories + the years we actually have. */
export function buildFilters(photos: Photo[]): string[] {
  const years = Array.from(new Set(photos.map(yearOf).filter(Boolean)))
    .sort()
    .reverse();
  return ["All", ...CATEGORIES, ...years];
}

export function matchesFilter(photo: Photo, filter: string): boolean {
  if (filter === "All") return true;
  if (/^\d{4}$/.test(filter)) return yearOf(photo) === filter;
  return photo.category === filter;
}

export function matchesSearch(photo: Photo, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [photo.title, photo.category, photo.event_name, photo.description]
    .filter(Boolean)
    .some((field) => (field as string).toLowerCase().includes(q));
}

// ---------------- ALBUMS / COLLECTIONS ----------------

export const SAMPLE_ALBUMS: Album[] = [
  {
    id: "album-cannes-2026",
    title: "Cannes Film Festival 2026",
    description: "Grand Palais arrivals, evening gala, and press photocall on the French Riviera.",
    category: "Red Carpet",
    year: "2026",
    date: "2026-05-18",
    location: "Cannes, France",
    coverPhotoId: "sample-p2",
    photoIds: ["sample-p2", "sample-p9", "sample-p8"],
    featuredOnHomepage: true,
    homepageOrder: 1,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
  },
  {
    id: "album-editorial-noir",
    title: "Editorial — Noir & Silk",
    description:
      "High-contrast monochrome studio sitting focusing on movement, silhouette and rim light.",
    category: "Editorial",
    year: "2026",
    date: "2026-02-14",
    location: "Studio 01, London",
    coverPhotoId: "sample-hero",
    photoIds: ["sample-hero", "sample-p5", "sample-p6"],
    featuredOnHomepage: true,
    homepageOrder: 2,
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z",
  },
  {
    id: "album-monochrome-sessions",
    title: "Monochrome Sessions",
    description:
      "Intimate portrait studies captured on 35mm film in natural window light and city architecture.",
    category: "Photoshoots",
    year: "2025",
    date: "2025-11-02",
    location: "Mumbai",
    coverPhotoId: "sample-p1",
    photoIds: ["sample-p1", "sample-p3", "sample-p7"],
    featuredOnHomepage: true,
    homepageOrder: 3,
    createdAt: "2025-11-02T00:00:00.000Z",
    updatedAt: "2025-11-02T00:00:00.000Z",
  },
  {
    id: "album-gala-evenings",
    title: "Gala Evenings & Backstage",
    description: "Candid moments between takes, award presentations, and backstage atmosphere.",
    category: "Events",
    year: "2025",
    date: "2025-09-18",
    location: "Met Gala & Charity Gala",
    coverPhotoId: "sample-p4",
    photoIds: ["sample-p4", "sample-p8"],
    featuredOnHomepage: true,
    homepageOrder: 4,
    createdAt: "2025-09-18T00:00:00.000Z",
    updatedAt: "2025-09-18T00:00:00.000Z",
  },
];

export const albumsQueryKey = ["albums"] as const;

/** Fetch all albums with safe fallback */
export async function fetchAlbums(): Promise<Album[]> {
  try {
    const res = await fetch("/api/albums", { cache: "no-store" });
    if (res.ok) {
      const list = (await res.json()) as Album[];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch {
    // Fall back to sample albums if network call fails
  }
  return SAMPLE_ALBUMS;
}

export function buildAlbumFilters(albums: Album[]): string[] {
  const years = Array.from(new Set(albums.map((a) => String(a.year)).filter(Boolean)))
    .sort()
    .reverse();
  return ["All", ...CATEGORIES, ...years];
}

export function matchesAlbumFilter(album: Album, filter: string): boolean {
  if (filter === "All") return true;
  if (/^\d{4}$/.test(filter)) return String(album.year) === filter;
  return album.category === filter;
}

export function matchesAlbumSearch(album: Album, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [album.title, album.category, album.description, album.location, String(album.year)]
    .filter(Boolean)
    .some((field) => (field as string).toLowerCase().includes(q));
}
