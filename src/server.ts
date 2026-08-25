import "./lib/error-capture";

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  getStoredSiteContent,
  saveStoredSiteContent,
  getStoredPhotos,
  appendStoredPhoto,
  updateStoredPhoto,
  deleteStoredPhoto,
  getStoredAlbums,
  appendStoredAlbum,
  updateStoredAlbum,
  deleteStoredAlbum,
  getAlbumWithPhotos,
  verifyAdminAuth,
} from "./lib/server-storage";
import type { SiteContent } from "./lib/site-content";
import type { Photo, Album } from "./lib/archive";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const TARGET_ADMIN_UID = "eec3ccb4-bdf7-4b8c-b8a1-573047115069";
const TARGET_ADMIN_EMAIL = "aarvifanedits@gmail.com";

async function handleAdminSetPassword(request: Request): Promise<Response> {
  try {
    let body: { password?: string; serviceRoleKey?: string; email?: string; uid?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const newPassword = body.password?.trim();
    if (!newPassword || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be a valid string of at least 6 characters." }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const authHeader = request.headers.get("authorization");
    const customHeader = request.headers.get("x-supabase-service-key");
    const providedSecret = (
      customHeader ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null) ||
      body.serviceRoleKey?.trim() ||
      ""
    ).trim();

    const envSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!envSecret || !providedSecret || providedSecret !== envSecret) {
      return new Response(
        JSON.stringify({
          error:
            "Unauthorized. You must provide the Supabase secret key in the 'x-supabase-service-key' header or 'Authorization: Bearer <secret>' to authorize this password reset.",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const serviceRoleKey = envSecret;

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "https://pidrruwjgbqqvgrujylk.supabase.co";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const targetUid = body.uid?.trim() || TARGET_ADMIN_UID;
    if (targetUid !== TARGET_ADMIN_UID && body.email !== TARGET_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({
          error: `Restricted operation: can only modify authorized primary curator (${TARGET_ADMIN_EMAIL} / ${TARGET_ADMIN_UID}).`,
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(TARGET_ADMIN_UID, {
      password: newPassword,
      email_confirm: true,
    });

    if (error || !data.user) {
      return new Response(
        JSON.stringify({
          error: error?.message || "Failed to update user via Supabase Auth Admin API.",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password updated successfully via Supabase Auth Admin updateUserById() for ${data.user.email}.`,
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

// ---------------- CMS API ROUTE HANDLERS ----------------

async function handleGetSiteContent(): Promise<Response> {
  const content = getStoredSiteContent();
  return new Response(JSON.stringify(content), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache",
    },
  });
}

async function handleUpdateSiteContent(request: Request): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const newContent = (await request.json()) as SiteContent;
    saveStoredSiteContent(newContent);
    return new Response(JSON.stringify({ success: true, data: newContent }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update site content";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleGetPhotos(): Promise<Response> {
  const photos = getStoredPhotos();
  return new Response(JSON.stringify(photos), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache",
    },
  });
}

async function handleAddPhoto(request: Request): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as { photo: Photo };
    if (!body.photo || !body.photo.image_url) {
      return new Response(JSON.stringify({ error: "Invalid photo payload." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const photoToInsert: Photo = {
      id: body.photo.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: body.photo.title || "Untitled",
      category: body.photo.category || "Editorial",
      event_name: body.photo.event_name ?? null,
      taken_on: body.photo.taken_on ?? null,
      description: body.photo.description ?? null,
      image_url: body.photo.image_url,
      width: body.photo.width ?? null,
      height: body.photo.height ?? null,
      featured: Boolean(body.photo.featured),
      created_at: body.photo.created_at || new Date().toISOString(),
    };

    const updatedList = await appendStoredPhoto(photoToInsert);
    return new Response(
      JSON.stringify({ success: true, photo: photoToInsert, photos: updatedList }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add photo";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleUpdatePhoto(request: Request, id: string): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const updates = (await request.json()) as Partial<Photo>;
    const updated = await updateStoredPhoto(id, updates);
    if (!updated) {
      return new Response(JSON.stringify({ error: "Photo not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, photo: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update photo";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleDeletePhoto(request: Request, id: string): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const deleted = await deleteStoredPhoto(id);
    if (!deleted) {
      return new Response(JSON.stringify({ error: "Photo not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete photo";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleUploadFile(request: Request): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided in form data." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);

      return new Response(
        JSON.stringify({
          success: true,
          url: `/uploads/${safeName}`,
          filename: safeName,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    } else {
      // JSON base64 upload
      const body = (await request.json()) as { dataUrl?: string; filename?: string };
      if (!body.dataUrl) {
        return new Response(JSON.stringify({ error: "Missing dataUrl in payload." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext =
        body.dataUrl.substring(body.dataUrl.indexOf("/") + 1, body.dataUrl.indexOf(";")) || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);

      return new Response(
        JSON.stringify({
          success: true,
          url: `/uploads/${filename}`,
          filename,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

// ---------------- ALBUMS API ROUTE HANDLERS ----------------

async function handleGetAlbums(): Promise<Response> {
  const albums = getStoredAlbums();
  return new Response(JSON.stringify(albums), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache, no-store",
    },
  });
}

async function handleGetAlbumDetail(id: string): Promise<Response> {
  const data = getAlbumWithPhotos(id);
  if (!data) {
    return new Response(JSON.stringify({ error: "Album not found." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache, no-store",
    },
  });
}

async function handleAddAlbum(request: Request): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as { album: Partial<Album> };
    if (!body.album || !body.album.title) {
      return new Response(JSON.stringify({ error: "Album title is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const newAlbum: Album = {
      id: body.album.id || `album-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: body.album.title.trim(),
      description: body.album.description?.trim() ?? null,
      category: body.album.category || "Editorial",
      year: String(body.album.year || new Date().getFullYear()),
      date: body.album.date ?? null,
      location: body.album.location?.trim() ?? null,
      coverPhotoId: body.album.coverPhotoId || "",
      photoIds: Array.isArray(body.album.photoIds) ? body.album.photoIds : [],
      featuredOnHomepage: body.album.featuredOnHomepage !== false,
      homepageOrder:
        typeof body.album.homepageOrder === "number" ? body.album.homepageOrder : undefined,
      createdAt: body.album.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = await appendStoredAlbum(newAlbum);
    return new Response(JSON.stringify({ success: true, album: newAlbum, albums: updatedList }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add album";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleBatchUpdateAlbums(request: Request): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as { albums: Album[] };
    if (!Array.isArray(body.albums)) {
      return new Response(JSON.stringify({ error: "Expected an array of albums." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const { saveStoredAlbums } = await import("./lib/server-storage");
    await saveStoredAlbums(body.albums);
    return new Response(JSON.stringify({ success: true, albums: body.albums }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to batch update albums";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleUpdateAlbum(request: Request, id: string): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const updates = (await request.json()) as Partial<Album>;
    const updated = await updateStoredAlbum(id, updates);
    if (!updated) {
      return new Response(JSON.stringify({ error: "Album not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, album: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update album";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handleDeleteAlbum(request: Request, id: string): Promise<Response> {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin privileges required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    // IMPORTANT: Deletes the album collection only. Photo records remain untouched in photos.json.
    const deleted = await deleteStoredAlbum(id);
    if (!deleted) {
      return new Response(JSON.stringify({ error: "Album not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete album";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

// ---------------- SSR WRAPPER ----------------

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Server-side admin password update endpoint
      if (url.pathname === "/api/admin/set-password" && request.method === "POST") {
        return await handleAdminSetPassword(request);
      }

      // Site content endpoints
      if (url.pathname === "/api/site-content" && request.method === "GET") {
        return await handleGetSiteContent();
      }
      if (
        (url.pathname === "/api/admin/site-content" || url.pathname === "/api/site-content") &&
        (request.method === "POST" || request.method === "PUT")
      ) {
        return await handleUpdateSiteContent(request);
      }

      // Photos endpoints
      if (url.pathname === "/api/photos" && request.method === "GET") {
        return await handleGetPhotos();
      }
      if (url.pathname === "/api/admin/photos" && request.method === "POST") {
        return await handleAddPhoto(request);
      }
      if (
        url.pathname.startsWith("/api/admin/photos/") &&
        (request.method === "PUT" || request.method === "PATCH")
      ) {
        const id = decodeURIComponent(url.pathname.slice("/api/admin/photos/".length));
        return await handleUpdatePhoto(request, id);
      }
      if (url.pathname.startsWith("/api/admin/photos/") && request.method === "DELETE") {
        const id = decodeURIComponent(url.pathname.slice("/api/admin/photos/".length));
        return await handleDeletePhoto(request, id);
      }
      if (url.pathname === "/api/admin/photos" && request.method === "DELETE") {
        const id = decodeURIComponent(url.searchParams.get("id") || "");
        return await handleDeletePhoto(request, id);
      }

      // File upload endpoint
      if (url.pathname === "/api/admin/upload-file" && request.method === "POST") {
        return await handleUploadFile(request);
      }

      // Albums endpoints
      if (
        (url.pathname === "/api/admin/albums/batch" ||
          url.pathname === "/api/admin/albums/reorder") &&
        (request.method === "POST" || request.method === "PUT")
      ) {
        return await handleBatchUpdateAlbums(request);
      }
      if (url.pathname === "/api/albums" && request.method === "GET") {
        return await handleGetAlbums();
      }
      if (url.pathname.startsWith("/api/albums/") && request.method === "GET") {
        const id = decodeURIComponent(url.pathname.slice("/api/albums/".length));
        return await handleGetAlbumDetail(id);
      }
      if (url.pathname === "/api/admin/albums" && request.method === "POST") {
        return await handleAddAlbum(request);
      }
      if (
        url.pathname.startsWith("/api/admin/albums/") &&
        (request.method === "PUT" || request.method === "PATCH")
      ) {
        const id = decodeURIComponent(url.pathname.slice("/api/admin/albums/".length));
        return await handleUpdateAlbum(request, id);
      }
      if (url.pathname.startsWith("/api/admin/albums/") && request.method === "DELETE") {
        const id = decodeURIComponent(url.pathname.slice("/api/admin/albums/".length));
        return await handleDeleteAlbum(request, id);
      }
      if (url.pathname === "/api/admin/albums" && request.method === "DELETE") {
        const id = decodeURIComponent(url.searchParams.get("id") || "");
        return await handleDeleteAlbum(request, id);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
