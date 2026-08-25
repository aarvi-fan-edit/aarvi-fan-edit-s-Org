import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "./site-content";
import { SAMPLE_PHOTOS, SAMPLE_ALBUMS, type Photo, type Album } from "./archive";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const SITE_CONTENT_FILE = path.join(DATA_DIR, "site-content.json");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");
const ALBUMS_FILE = path.join(DATA_DIR, "albums.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// ---------------- SITE CONTENT STORAGE ----------------

export function getStoredSiteContent(): SiteContent {
  ensureDirs();
  try {
    if (fs.existsSync(SITE_CONTENT_FILE)) {
      const raw = fs.readFileSync(SITE_CONTENT_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<SiteContent>;
      return {
        ...DEFAULT_SITE_CONTENT,
        ...parsed,
        brand: { ...DEFAULT_SITE_CONTENT.brand, ...(parsed.brand || {}) },
        homepage: { ...DEFAULT_SITE_CONTENT.homepage, ...(parsed.homepage || {}) },
        archive: { ...DEFAULT_SITE_CONTENT.archive, ...(parsed.archive || {}) },
        about: {
          ...DEFAULT_SITE_CONTENT.about,
          ...(parsed.about || {}),
          creditsList: parsed.about?.creditsList || DEFAULT_SITE_CONTENT.about.creditsList,
        },
        footer: { ...DEFAULT_SITE_CONTENT.footer, ...(parsed.footer || {}) },
        socialLinks: parsed.socialLinks || DEFAULT_SITE_CONTENT.socialLinks,
      };
    }
  } catch (err) {
    console.error("[Storage] Failed to read site-content.json:", err);
  }

  // Initialize with defaults if file did not exist
  saveStoredSiteContent(DEFAULT_SITE_CONTENT);
  return DEFAULT_SITE_CONTENT;
}

export function saveStoredSiteContent(content: SiteContent): void {
  ensureDirs();
  const tempPath = `${SITE_CONTENT_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(content, null, 2), "utf-8");
  fs.renameSync(tempPath, SITE_CONTENT_FILE);
}

// ---------------- PHOTO CATALOGUE STORAGE ----------------

// Async mutex to guarantee concurrent writes never overwrite each other
class AsyncLock {
  private promise: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => T | Promise<T>): Promise<T> {
    const result = this.promise.then(() => fn());
    this.promise = result.then(
      () => {},
      () => {},
    );
    return result;
  }
}

const photoStorageLock = new AsyncLock();
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function rotateBackups() {
  try {
    ensureBackupDir();
    if (fs.existsSync(PHOTOS_FILE)) {
      const content = fs.readFileSync(PHOTOS_FILE, "utf-8");
      const backupPath = path.join(BACKUP_DIR, `photos-${Date.now()}.json`);
      fs.writeFileSync(backupPath, content, "utf-8");

      // Keep only 15 most recent backups
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("photos-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (files.length > 15) {
        for (const oldFile of files.slice(15)) {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
  } catch (err) {
    console.error("[Storage] Backup rotation error:", err);
  }
}

export function getStoredPhotos(): Photo[] {
  ensureDirs();
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      const raw = fs.readFileSync(PHOTOS_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Photo[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Storage] Failed to read photos.json, checking backups:", err);
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter((f) => f.startsWith("photos-") && f.endsWith(".json"))
          .sort()
          .reverse();
        if (files.length > 0) {
          const latestBackup = path.join(BACKUP_DIR, files[0]);
          const backupRaw = fs.readFileSync(latestBackup, "utf-8");
          const backupParsed = JSON.parse(backupRaw) as Photo[];
          if (Array.isArray(backupParsed) && backupParsed.length > 0) {
            console.log(`[Storage] Restored ${backupParsed.length} photos from backup ${files[0]}`);
            saveStoredPhotosDirect(backupParsed);
            return backupParsed;
          }
        }
      }
    } catch {
      // ignore backup restore failure
    }
  }

  // Initialize with initial sample catalogue if no file and no backup exists
  const initial = [...SAMPLE_PHOTOS];
  saveStoredPhotosDirect(initial);
  return initial;
}

function saveStoredPhotosDirect(photos: Photo[]): void {
  ensureDirs();
  // Guard against accidental empty array wipe if catalogue previously had items
  if (photos.length === 0 && fs.existsSync(PHOTOS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(PHOTOS_FILE, "utf-8"));
      if (Array.isArray(existing) && existing.length > 0) {
        console.warn("[Storage] Prevented accidental wipe of photos catalogue.");
        return;
      }
    } catch {
      // proceed if existing was unreadable
    }
  }

  rotateBackups();
  const tempPath = `${PHOTOS_FILE}.tmp.${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  fs.writeFileSync(tempPath, JSON.stringify(photos, null, 2), "utf-8");
  fs.renameSync(tempPath, PHOTOS_FILE);
}

export async function saveStoredPhotos(photos: Photo[]): Promise<void> {
  await photoStorageLock.acquire(() => {
    saveStoredPhotosDirect(photos);
  });
}

export async function appendStoredPhoto(photo: Photo): Promise<Photo[]> {
  return await photoStorageLock.acquire(() => {
    const current = getStoredPhotos();
    // Verify no existing item with this ID
    const existingIndex = current.findIndex((p) => p.id === photo.id);
    let updated: Photo[];
    if (existingIndex >= 0) {
      // update existing
      updated = current.map((p) => (p.id === photo.id ? photo : p));
    } else {
      // strictly prepend/append new photo without altering or dropping any existing photos
      updated = [photo, ...current];
    }
    saveStoredPhotosDirect(updated);
    return updated;
  });
}

export async function updateStoredPhoto(
  id: string,
  updates: Partial<Photo>,
): Promise<Photo | null> {
  return await photoStorageLock.acquire(() => {
    const current = getStoredPhotos();
    const index = current.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updatedPhoto: Photo = {
      ...current[index],
      ...updates,
      id, // strictly preserve original immutable ID
    };

    const nextList = [...current];
    nextList[index] = updatedPhoto;
    saveStoredPhotosDirect(nextList);
    return updatedPhoto;
  });
}

export async function deleteStoredPhoto(id: string): Promise<boolean> {
  return await photoStorageLock.acquire(() => {
    const current = getStoredPhotos();
    const filtered = current.filter((p) => p.id !== id);
    if (filtered.length === current.length) {
      return false; // photo not found
    }
    saveStoredPhotosDirect(filtered);

    // Safely update albums so the deleted photo is cleanly removed from photoIds and coverPhotoId
    try {
      const albums = getStoredAlbums();
      let albumsChanged = false;
      const updatedAlbums = albums.map((alb) => {
        let changed = false;
        let nextPhotoIds = alb.photoIds || [];
        if (nextPhotoIds.includes(id)) {
          nextPhotoIds = nextPhotoIds.filter((pid) => pid !== id);
          changed = true;
        }
        let nextCover = alb.coverPhotoId;
        if (nextCover === id) {
          nextCover = nextPhotoIds[0] || "";
          changed = true;
        }
        if (changed) {
          albumsChanged = true;
          return {
            ...alb,
            photoIds: nextPhotoIds,
            coverPhotoId: nextCover,
            updatedAt: new Date().toISOString(),
          };
        }
        return alb;
      });
      if (albumsChanged) {
        saveStoredAlbumsDirect(updatedAlbums);
      }
    } catch (err) {
      console.error("[Storage] Failed to clean album memberships for deleted photo:", err);
    }

    return true;
  });
}

// ---------------- ALBUMS / COLLECTIONS STORAGE ----------------

const albumStorageLock = new AsyncLock();

function rotateAlbumBackups() {
  try {
    ensureBackupDir();
    if (fs.existsSync(ALBUMS_FILE)) {
      const content = fs.readFileSync(ALBUMS_FILE, "utf-8");
      const backupPath = path.join(BACKUP_DIR, `albums-${Date.now()}.json`);
      fs.writeFileSync(backupPath, content, "utf-8");

      // Keep only 15 most recent backups
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("albums-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (files.length > 15) {
        for (const oldFile of files.slice(15)) {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
  } catch (err) {
    console.error("[Storage] Album backup rotation error:", err);
  }
}

export function getStoredAlbums(): Album[] {
  ensureDirs();
  try {
    if (fs.existsSync(ALBUMS_FILE)) {
      const raw = fs.readFileSync(ALBUMS_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Album[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Storage] Failed to read albums.json, checking backups:", err);
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter((f) => f.startsWith("albums-") && f.endsWith(".json"))
          .sort()
          .reverse();
        if (files.length > 0) {
          const latestBackup = path.join(BACKUP_DIR, files[0]);
          const backupRaw = fs.readFileSync(latestBackup, "utf-8");
          const backupParsed = JSON.parse(backupRaw) as Album[];
          if (Array.isArray(backupParsed) && backupParsed.length > 0) {
            console.log(`[Storage] Restored ${backupParsed.length} albums from backup ${files[0]}`);
            saveStoredAlbumsDirect(backupParsed);
            return backupParsed;
          }
        }
      }
    } catch {
      // ignore backup restore failure
    }
  }

  // Initialize with initial sample albums if no file exists
  const initial = [...SAMPLE_ALBUMS];
  saveStoredAlbumsDirect(initial);
  return initial;
}

function saveStoredAlbumsDirect(albums: Album[]): void {
  ensureDirs();
  // Guard against accidental empty array wipe if catalogue previously had items
  if (albums.length === 0 && fs.existsSync(ALBUMS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(ALBUMS_FILE, "utf-8"));
      if (Array.isArray(existing) && existing.length > 0) {
        console.warn("[Storage] Prevented accidental wipe of albums catalogue.");
        return;
      }
    } catch {
      // proceed if existing was unreadable
    }
  }

  rotateAlbumBackups();
  const tempPath = `${ALBUMS_FILE}.tmp.${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  fs.writeFileSync(tempPath, JSON.stringify(albums, null, 2), "utf-8");
  fs.renameSync(tempPath, ALBUMS_FILE);
}

export async function saveStoredAlbums(albums: Album[]): Promise<void> {
  await albumStorageLock.acquire(() => {
    saveStoredAlbumsDirect(albums);
  });
}

export async function appendStoredAlbum(album: Album): Promise<Album[]> {
  return await albumStorageLock.acquire(() => {
    const current = getStoredAlbums();
    const existingIndex = current.findIndex((a) => a.id === album.id);
    let updated: Album[];
    if (existingIndex >= 0) {
      updated = current.map((a) => (a.id === album.id ? album : a));
    } else {
      updated = [album, ...current];
    }
    saveStoredAlbumsDirect(updated);
    return updated;
  });
}

export async function updateStoredAlbum(
  id: string,
  updates: Partial<Album>,
): Promise<Album | null> {
  return await albumStorageLock.acquire(() => {
    const current = getStoredAlbums();
    const index = current.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const updatedAlbum: Album = {
      ...current[index],
      ...updates,
      id, // strictly preserve original immutable ID
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...current];
    nextList[index] = updatedAlbum;
    saveStoredAlbumsDirect(nextList);
    return updatedAlbum;
  });
}

export async function deleteStoredAlbum(id: string): Promise<boolean> {
  return await albumStorageLock.acquire(() => {
    const current = getStoredAlbums();
    const filtered = current.filter((a) => a.id !== id);
    if (filtered.length === current.length) {
      return false; // album not found
    }
    // IMPORTANT: Deleting an album deletes ONLY the album record.
    // The photo records remain completely intact in photos.json.
    saveStoredAlbumsDirect(filtered);
    return true;
  });
}

export function getAlbumWithPhotos(albumId: string): { album: Album; photos: Photo[] } | null {
  const albums = getStoredAlbums();
  const album = albums.find((a) => a.id === albumId);
  if (!album) return null;

  const allPhotos = getStoredPhotos();
  // Map ordered photoIds to Photo objects, plus any photo marked with album_id === album.id
  const orderedPhotos: Photo[] = [];
  const photoMap = new Map(allPhotos.map((p) => [p.id, p]));

  for (const pid of album.photoIds || []) {
    const photo = photoMap.get(pid);
    if (photo) {
      orderedPhotos.push(photo);
      photoMap.delete(pid);
    }
  }

  // Include photos that have album_id === album.id but weren't explicitly in photoIds
  for (const photo of photoMap.values()) {
    if (photo.album_id === album.id) {
      orderedPhotos.push(photo);
    }
  }

  return { album, photos: orderedPhotos };
}

// ---------------- ADMIN AUTH VERIFICATION ----------------

const TARGET_ADMIN_UID = "eec3ccb4-bdf7-4b8c-b8a1-573047115069";
const TARGET_ADMIN_EMAIL = "aarvifanedits@gmail.com";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifyAdminAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  const customHeader = request.headers.get("x-supabase-service-key") || "";
  const envSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  // 1. Direct service key check
  if (customHeader && envSecret && customHeader === envSecret) {
    return true;
  }

  // 2. Bearer token check
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (envSecret && token === envSecret) {
      return true;
    }

    // 2a. Direct JWT inspection
    const payload = decodeJwtPayload(token);
    if (payload) {
      const email = (payload.email || payload.user_metadata?.email || "").toLowerCase();
      const sub = payload.sub;
      if (sub === TARGET_ADMIN_UID || email === TARGET_ADMIN_EMAIL.toLowerCase()) {
        return true;
      }
    }

    // 2b. Check user JWT against Supabase Auth
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "https://pidrruwjgbqqvgrujylk.supabase.co";
    const publishableKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_R76l9L99SUAaDivYMImekQ_7GrCHrQw";

    try {
      const client = createClient(supabaseUrl, publishableKey, {
        global: {
          fetch: createSupabaseFetch(publishableKey),
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: userData, error: userError } = await client.auth.getUser(token);
      if (!userError && userData?.user) {
        const user = userData.user;
        if (
          user.id === TARGET_ADMIN_UID ||
          (user.email && user.email.toLowerCase() === TARGET_ADMIN_EMAIL.toLowerCase())
        ) {
          return true;
        }

        // Check has_role RPC
        const { data: roleResult } = await client.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (roleResult === true) {
          return true;
        }
      }
    } catch (err) {
      console.error("[Storage] Error verifying token:", err);
    }
  }

  return false;
}
