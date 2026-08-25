import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Star,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  Layers,
} from "lucide-react";

import { getAdminAuthHeaders } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, formatDate, photosQueryKey, type Photo } from "@/lib/archive";
import { ImageUploader } from "./ImageUploader";

interface PhotosManagerProps {
  photos: Photo[];
}

type PhotoDraft = {
  title: string;
  category: string;
  event_name: string;
  taken_on: string;
  description: string;
  featured: boolean;
};

const emptyDraft: PhotoDraft = {
  title: "",
  category: CATEGORIES[0],
  event_name: "",
  taken_on: "",
  description: "",
  featured: false,
};

export function PhotosManager({ photos }: PhotosManagerProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload Form State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDraft, setUploadDraft] = useState<PhotoDraft>(emptyDraft);
  const [directImageUrl, setDirectImageUrl] = useState("");

  const refreshPhotos = () => {
    void queryClient.invalidateQueries({ queryKey: photosQueryKey });
  };

  // Add / Upload Mutation (Safe Append)
  const addMutation = useMutation({
    mutationFn: async () => {
      const authHeaders = await getAdminAuthHeaders();

      if (uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          // 1. Upload file
          const formData = new FormData();
          formData.append("file", file);

          let imageUrl = "";
          const uploadHeaders: Record<string, string> = {};
          if (authHeaders["Authorization"]) {
            uploadHeaders["Authorization"] = authHeaders["Authorization"];
          }

          const uploadRes = await fetch("/api/admin/upload-file", {
            method: "POST",
            headers: uploadHeaders,
            body: formData,
          });

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            imageUrl = data.url;
          } else {
            // fallback: Supabase storage
            const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^\w.-]/g, "_")}`;
            const { error: sbError } = await supabase.storage.from("photos").upload(path, file);
            if (sbError) throw sbError;
            const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(path);
            imageUrl = publicUrlData.publicUrl;
          }

          // 2. Append photo record
          const photoToInsert: Photo = {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: uploadDraft.title || file.name.replace(/\.[^.]+$/, ""),
            category: uploadDraft.category,
            event_name: uploadDraft.event_name || null,
            taken_on: uploadDraft.taken_on || null,
            description: uploadDraft.description || null,
            image_url: imageUrl,
            width: null,
            height: null,
            featured: uploadDraft.featured,
            created_at: new Date().toISOString(),
          };

          const postRes = await fetch("/api/admin/photos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({ photo: photoToInsert }),
          });

          if (!postRes.ok) {
            const errData = await postRes.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to append photo to server catalogue.");
          }

          // Optional secondary cloud mirror (non-blocking)
          try {
            void supabase.from("photos").insert({
              title: photoToInsert.title,
              category: photoToInsert.category,
              event_name: photoToInsert.event_name,
              taken_on: photoToInsert.taken_on,
              description: photoToInsert.description,
              featured: photoToInsert.featured,
              image_url: photoToInsert.image_url,
            });
          } catch {
            // non-blocking
          }
        }
      } else if (directImageUrl.trim()) {
        const photoToInsert: Photo = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: uploadDraft.title || "Untitled Photograph",
          category: uploadDraft.category,
          event_name: uploadDraft.event_name || null,
          taken_on: uploadDraft.taken_on || null,
          description: uploadDraft.description || null,
          image_url: directImageUrl.trim(),
          width: null,
          height: null,
          featured: uploadDraft.featured,
          created_at: new Date().toISOString(),
        };

        const postRes = await fetch("/api/admin/photos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ photo: photoToInsert }),
        });

        if (!postRes.ok) {
          const errData = await postRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to add photo to server catalogue.");
        }

        // Optional secondary cloud mirror (non-blocking)
        try {
          void supabase.from("photos").insert({
            title: photoToInsert.title,
            category: photoToInsert.category,
            event_name: photoToInsert.event_name,
            taken_on: photoToInsert.taken_on,
            description: photoToInsert.description,
            featured: photoToInsert.featured,
            image_url: photoToInsert.image_url,
          });
        } catch {
          // non-blocking
        }
      } else {
        throw new Error("Please select a file or provide an image URL.");
      }
    },
    onSuccess: () => {
      toast.success("Photographs added to archive catalogue");
      setUploadFiles([]);
      setDirectImageUrl("");
      setUploadDraft(emptyDraft);
      setShowUploadModal(false);
      refreshPhotos();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to upload");
    },
  });

  // Edit / Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (photo: Photo) => {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const res = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(photo),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update photograph in server catalogue.");
      }

      // Optional secondary cloud mirror (non-blocking)
      try {
        void supabase
          .from("photos")
          .update({
            title: photo.title,
            category: photo.category,
            event_name: photo.event_name,
            taken_on: photo.taken_on || null,
            description: photo.description,
            featured: photo.featured,
            image_url: photo.image_url,
          })
          .eq("id", photo.id);
      } catch {
        // non-blocking
      }
    },
    onSuccess: () => {
      toast.success("Photograph metadata updated");
      setEditingPhoto(null);
      refreshPhotos();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const authHeaders = await getAdminAuthHeaders();

      const res = await fetch(`/api/admin/photos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete photograph from server catalogue.");
      }

      // Optional secondary cloud mirror (non-blocking)
      try {
        void supabase.from("photos").delete().eq("id", id);
      } catch {
        // non-blocking
      }
    },
    onSuccess: () => {
      toast.success("Photograph removed from archive");
      setDeleteConfirmId(null);
      refreshPhotos();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle Featured Quick Action
  const toggleFeatured = async (photo: Photo) => {
    const updated = { ...photo, featured: !photo.featured };
    updateMutation.mutate(updated);
    toast.success(
      updated.featured
        ? `"${photo.title}" marked as Featured on Homepage`
        : `"${photo.title}" removed from Featured (retained in catalogue)`,
    );
  };

  // Filtered and searched list
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchesCat =
        selectedCategory === "All"
          ? true
          : selectedCategory === "Featured"
            ? p.featured
            : p.category === selectedCategory;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        [p.title, p.category, p.event_name, p.description, p.taken_on]
          .filter(Boolean)
          .some((val) => (val as string).toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [photos, selectedCategory, search]);

  const stats = useMemo(() => {
    return {
      total: photos.length,
      featured: photos.filter((p) => p.featured).length,
      categories: CATEGORIES.map((c) => ({
        name: c,
        count: photos.filter((p) => p.category === c).length,
      })),
    };
  }, [photos]);

  return (
    <div className="space-y-8">
      {/* Top Header & Stats */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="display text-3xl">Photograph Catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your photographic archive. All records are safely persisted and never
            overwritten.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="eyebrow flex items-center justify-center gap-2 border border-accent bg-accent px-5 py-3 text-accent-foreground transition-all hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Photographs
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 gap-4 border border-border p-4 sm:grid-cols-4 lg:grid-cols-6">
        <div>
          <span className="eyebrow text-muted-foreground">Total Works</span>
          <p className="font-display text-2xl">{stats.total}</p>
        </div>
        <div>
          <span className="eyebrow text-muted-foreground">Featured (Home)</span>
          <p className="font-display text-2xl text-accent">{stats.featured}</p>
        </div>
        {stats.categories.map((cat) => (
          <div key={cat.name}>
            <span className="eyebrow text-muted-foreground">{cat.name}</span>
            <p className="font-display text-2xl">{cat.count}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 border-y border-border py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {["All", "Featured", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`eyebrow px-3 py-1.5 transition-colors ${
                selectedCategory === cat
                  ? "border border-accent bg-accent/10 text-accent"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, event or year…"
            className="w-full border border-border bg-transparent py-2 pl-9 pr-3 text-xs outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Photographs Grid / List */}
      {filteredPhotos.length === 0 ? (
        <div className="border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl text-muted-foreground">
            No photographs match this filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("All");
            }}
            className="eyebrow mt-4 border border-border px-4 py-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative flex flex-col justify-between border border-border bg-secondary/10 transition-colors hover:border-foreground/40"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFeatured(photo)}
                    title={photo.featured ? "Remove from Featured" : "Mark as Featured"}
                    className={`rounded-full p-2 backdrop-blur-md transition-colors ${
                      photo.featured
                        ? "bg-accent text-accent-foreground"
                        : "bg-black/60 text-white/70 hover:text-white"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                  {photo.category}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-medium text-foreground">{photo.title}</h3>
                  {photo.taken_on && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {photo.taken_on.slice(0, 4)}
                    </span>
                  )}
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {photo.event_name || photo.description || "No event details"}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(photo.taken_on) || "Undated"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPhoto(photo)}
                      className="eyebrow flex items-center gap-1 border border-border px-2.5 py-1 text-xs hover:border-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(photo.id)}
                      className="eyebrow flex items-center gap-1 border border-border px-2.5 py-1 text-xs text-destructive hover:border-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Upload Modal ---------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-border bg-background p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-display text-2xl">Add Photographs to Catalogue</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <span className="eyebrow">Select Photo Files</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const chosen = Array.from(e.target.files ?? []);
                    setUploadFiles(chosen);
                    if (chosen.length > 0 && !uploadDraft.title) {
                      setUploadDraft({
                        ...uploadDraft,
                        title: chosen[0].name.replace(/\.[^.]+$/, ""),
                      });
                    }
                  }}
                  className="mt-2 w-full text-xs file:mr-3 file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-xs"
                />
              </div>

              {uploadFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadFiles.map((file) => (
                    <img
                      key={file.name}
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="aspect-square w-full object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-3">
                <span className="eyebrow text-muted-foreground">Or Direct Image URL</span>
                <input
                  type="url"
                  value={directImageUrl}
                  onChange={(e) => setDirectImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or /samples/..."
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="eyebrow">Title</span>
                  <input
                    value={uploadDraft.title}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, title: e.target.value })}
                    placeholder="e.g. Nocturne"
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <span className="eyebrow">Category</span>
                  <select
                    value={uploadDraft.category}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, category: e.target.value })}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-background">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="eyebrow">Event / Series</span>
                  <input
                    value={uploadDraft.event_name}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, event_name: e.target.value })}
                    placeholder="e.g. Venice Biennale"
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <span className="eyebrow">Date Taken</span>
                  <input
                    type="date"
                    value={uploadDraft.taken_on}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, taken_on: e.target.value })}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <span className="eyebrow">Description / Notes</span>
                <textarea
                  rows={2}
                  value={uploadDraft.description}
                  onChange={(e) => setUploadDraft({ ...uploadDraft, description: e.target.value })}
                  placeholder="Notes on lighting, format or sitters…"
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={uploadDraft.featured}
                  onChange={(e) => setUploadDraft({ ...uploadDraft, featured: e.target.checked })}
                />
                Feature in Selected section on Homepage
              </label>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="eyebrow border border-border px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    (uploadFiles.length === 0 && !directImageUrl.trim()) || addMutation.isPending
                  }
                  onClick={() => addMutation.mutate()}
                  className="eyebrow border border-accent bg-accent px-5 py-2 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                >
                  {addMutation.isPending ? "Adding…" : "Append to Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Edit Modal ---------------- */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-border bg-background p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-display text-2xl">Edit Photograph Details</h3>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Image Preview & Replacement */}
              <ImageUploader
                label="Photograph Image"
                currentUrl={editingPhoto.image_url}
                onImageUploaded={(url) => setEditingPhoto({ ...editingPhoto, image_url: url })}
                aspectRatio="video"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="eyebrow">Title</span>
                  <input
                    value={editingPhoto.title}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <span className="eyebrow">Category</span>
                  <select
                    value={editingPhoto.category}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, category: e.target.value })}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-background">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="eyebrow">Event Name</span>
                  <input
                    value={editingPhoto.event_name ?? ""}
                    onChange={(e) =>
                      setEditingPhoto({ ...editingPhoto, event_name: e.target.value })
                    }
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <span className="eyebrow">Date Taken</span>
                  <input
                    type="date"
                    value={editingPhoto.taken_on ?? ""}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, taken_on: e.target.value })}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <span className="eyebrow">Description</span>
                <textarea
                  rows={2}
                  value={editingPhoto.description ?? ""}
                  onChange={(e) =>
                    setEditingPhoto({ ...editingPhoto, description: e.target.value })
                  }
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editingPhoto.featured}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, featured: e.target.checked })}
                />
                Feature in Selected section on Homepage
              </label>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="eyebrow border border-border px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate(editingPhoto)}
                  className="eyebrow border border-accent bg-accent px-5 py-2 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Delete Confirmation Modal ---------------- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border bg-background p-6">
            <h3 className="font-display text-xl text-destructive">Delete Photograph?</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to remove this photograph from the archive? This action cannot
              be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="eyebrow border border-border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="eyebrow border border-destructive bg-destructive/10 px-4 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
