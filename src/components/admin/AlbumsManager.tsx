import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type Album,
  type Photo,
  CATEGORIES,
  albumsQueryKey,
  photosQueryKey,
  formatDate,
} from "@/lib/archive";
import { getAdminAuthHeaders } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import {
  FolderPlus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Tag,
  Star,
  Plus,
  Upload,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface AlbumsManagerProps {
  albums: Album[];
  photos: Photo[];
}

export function AlbumsManager({ albums, photos }: AlbumsManagerProps) {
  const queryClient = useQueryClient();
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<string>("Editorial");
  const [formYear, setFormYear] = useState<string>(String(new Date().getFullYear()));
  const [formDate, setFormDate] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formCoverPhotoId, setFormCoverPhotoId] = useState<string>("");
  const [formPhotoIds, setFormPhotoIds] = useState<string[]>([]);
  const [formFeaturedOnHomepage, setFormFeaturedOnHomepage] = useState(true);
  const [formHomepageOrder, setFormHomepageOrder] = useState<string>("1");

  // Picker & Uploader Tabs
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Existing Photos Picker Filters
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("All");
  const [pickerYear, setPickerYear] = useState("All");
  const [pickerFeaturedFilter, setPickerFeaturedFilter] = useState<
    "All" | "Featured" | "Non-Featured"
  >("All");

  // Local Computer Uploader State within Album
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAlsoFeatured, setUploadAlsoFeatured] = useState(false);
  const [uploadSetAsCover, setUploadSetAsCover] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Editorial");
    setFormYear(String(new Date().getFullYear()));
    setFormDate("");
    setFormLocation("");
    setFormCoverPhotoId("");
    setFormPhotoIds([]);
    setFormFeaturedOnHomepage(true);
    setFormHomepageOrder(String(albums.length + 1));
    setEditingAlbum(null);
    setIsCreating(false);
    setIsPhotoPickerOpen(false);
    setIsUploaderOpen(false);
    setUploadFiles([]);
    setUploadAlsoFeatured(false);
  }

  function startCreate() {
    resetForm();
    setIsCreating(true);
  }

  function startEdit(album: Album) {
    setEditingAlbum(album);
    setFormTitle(album.title);
    setFormDescription(album.description || "");
    setFormCategory(album.category || "Editorial");
    setFormYear(String(album.year || new Date().getFullYear()));
    setFormDate(album.date || "");
    setFormLocation(album.location || "");
    setFormCoverPhotoId(album.coverPhotoId || "");
    setFormPhotoIds(album.photoIds ? [...album.photoIds] : []);
    setFormFeaturedOnHomepage(album.featuredOnHomepage !== false);
    setFormHomepageOrder(String(typeof album.homepageOrder === "number" ? album.homepageOrder : 1));
    setIsCreating(false);
    setIsPhotoPickerOpen(false);
    setIsUploaderOpen(false);
    setUploadFiles([]);
  }

  // Helper map for quick photo lookups
  const photoMap = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  // Dynamic available years from photos catalogue
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of photos) {
      if (p.taken_on) {
        const y = p.taken_on.slice(0, 4);
        if (y && y.length === 4) years.add(y);
      }
    }
    return Array.from(years).sort().reverse();
  }, [photos]);

  // Filtered photos for the Add Existing Photos picker
  const filteredCataloguePhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Category filter
      if (pickerCategory !== "All" && photo.category !== pickerCategory) {
        return false;
      }
      // Year filter
      if (pickerYear !== "All") {
        const y = photo.taken_on ? photo.taken_on.slice(0, 4) : "";
        if (y !== pickerYear) return false;
      }
      // Featured filter
      if (pickerFeaturedFilter === "Featured" && !photo.featured) return false;
      if (pickerFeaturedFilter === "Non-Featured" && photo.featured) return false;

      // Text search
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase().trim();
        const textToSearch = [
          photo.title,
          photo.category,
          photo.event_name,
          photo.description,
          photo.taken_on,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [photos, pickerCategory, pickerYear, pickerFeaturedFilter, pickerSearch]);

  // Handle reordering within album
  function movePhotoUp(index: number) {
    if (index <= 0) return;
    const next = [...formPhotoIds];
    const temp = next[index - 1];
    next[index - 1] = next[index]!;
    next[index] = temp!;
    setFormPhotoIds(next);
  }

  function movePhotoDown(index: number) {
    if (index >= formPhotoIds.length - 1) return;
    const next = [...formPhotoIds];
    const temp = next[index + 1];
    next[index + 1] = next[index]!;
    next[index] = temp!;
    setFormPhotoIds(next);
  }

  function removePhotoFromAlbum(id: string) {
    const next = formPhotoIds.filter((pid) => pid !== id);
    setFormPhotoIds(next);
    if (formCoverPhotoId === id) {
      setFormCoverPhotoId(next[0] || "");
    }
    toast.info("Removed photograph from this collection (retained in catalogue).");
  }

  function togglePhotoSelection(id: string) {
    if (formPhotoIds.includes(id)) {
      removePhotoFromAlbum(id);
    } else {
      const next = [...formPhotoIds, id];
      setFormPhotoIds(next);
      if (!formCoverPhotoId) {
        setFormCoverPhotoId(id);
      }
    }
  }

  // Toggle Featured status directly on a photo
  async function togglePhotoFeatured(photo: Photo) {
    try {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const updatedPhoto: Photo = { ...photo, featured: !photo.featured };
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(photo.id)}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedPhoto),
      });

      if (!res.ok) {
        throw new Error("Failed to update featured status.");
      }

      toast.success(
        updatedPhoto.featured
          ? `"${photo.title}" marked as Featured on Homepage.`
          : `"${photo.title}" removed from Featured (retained in catalogue & collection).`,
      );
      await queryClient.invalidateQueries({ queryKey: photosQueryKey });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle featured status";
      toast.error(msg);
    }
  }

  // Upload local computer photos directly to this album
  async function handleUploadFilesToAlbum() {
    if (uploadFiles.length === 0) {
      toast.error("Please select one or more image files from your computer.");
      return;
    }

    setUploading(true);
    const newlyAddedIds: string[] = [];

    try {
      const authHeaders = await getAdminAuthHeaders();

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]!;
        let imageUrl = "";

        // 1. Upload via server-side file endpoint
        const formData = new FormData();
        formData.append("file", file);

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
          // Fallback via base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const dataUrl = await base64Promise;

          const jsonRes = await fetch("/api/admin/upload-file", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({ dataUrl, filename: file.name }),
          });

          if (!jsonRes.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
          const jData = await jsonRes.json();
          imageUrl = jData.url;
        }

        // 2. Create catalogue photo record
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const cleanTitle = file.name.replace(/\.[^.]+$/, "");
        const photoRecord: Photo = {
          id: photoId,
          title: cleanTitle || `Photograph ${photos.length + i + 1}`,
          category: formCategory || "Editorial",
          event_name: formTitle || null,
          taken_on: formDate || `${formYear}-01-01`,
          description: `Part of ${formTitle || "curated collection"}`,
          image_url: imageUrl,
          width: null,
          height: null,
          featured: uploadAlsoFeatured,
          created_at: new Date().toISOString(),
        };

        const postRes = await fetch("/api/admin/photos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ photo: photoRecord }),
        });

        if (!postRes.ok) {
          const err = await postRes.json().catch(() => ({}));
          throw new Error(err.error || `Failed to create photo record for ${file.name}`);
        }

        newlyAddedIds.push(photoId);

        // Optional non-blocking Supabase mirror
        try {
          void supabase.from("photos").insert({
            title: photoRecord.title,
            category: photoRecord.category,
            event_name: photoRecord.event_name,
            taken_on: photoRecord.taken_on,
            description: photoRecord.description,
            featured: photoRecord.featured,
            image_url: photoRecord.image_url,
          });
        } catch {
          // ignore
        }
      }

      // Immediately append newly created photos to current album
      const updatedPhotoIds = [...formPhotoIds, ...newlyAddedIds];
      setFormPhotoIds(updatedPhotoIds);

      // Set cover photo if requested or if no cover photo exists
      if (uploadSetAsCover && newlyAddedIds.length > 0) {
        setFormCoverPhotoId(newlyAddedIds[0]!);
      } else if (!formCoverPhotoId && updatedPhotoIds.length > 0) {
        setFormCoverPhotoId(updatedPhotoIds[0]!);
      }

      await queryClient.invalidateQueries({ queryKey: photosQueryKey });
      toast.success(
        `Successfully uploaded ${newlyAddedIds.length} photograph${newlyAddedIds.length > 1 ? "s" : ""} and added to collection!`,
      );

      // Reset upload fields
      setUploadFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploaderOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      toast.error("Please provide an album title.");
      return;
    }

    setSaving(true);
    try {
      const authHeaders = await getAdminAuthHeaders();
      const payload: Partial<Album> = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        year: formYear.trim() || String(new Date().getFullYear()),
        date: formDate || null,
        location: formLocation.trim() || null,
        coverPhotoId: formCoverPhotoId || formPhotoIds[0] || "",
        photoIds: formPhotoIds,
        featuredOnHomepage: formFeaturedOnHomepage,
        homepageOrder: parseInt(formHomepageOrder) || 1,
      };

      if (isCreating) {
        const res = await fetch("/api/admin/albums", {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ album: payload }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server returned status ${res.status}`);
        }

        toast.success(`Created collection "${payload.title}" successfully.`);
      } else if (editingAlbum) {
        const res = await fetch(`/api/admin/albums/${encodeURIComponent(editingAlbum.id)}`, {
          method: "PUT",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server returned status ${res.status}`);
        }

        toast.success(`Updated collection "${payload.title}".`);
      }

      await queryClient.invalidateQueries({ queryKey: albumsQueryKey });
      await queryClient.invalidateQueries({ queryKey: photosQueryKey });
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save album";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // Quick toggle featured on homepage from collection card
  async function toggleAlbumHomepage(album: Album) {
    try {
      const newFeatured = album.featuredOnHomepage === false ? true : false;
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const res = await fetch(`/api/admin/albums/${encodeURIComponent(album.id)}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ featuredOnHomepage: newFeatured }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update homepage status");
      }

      await queryClient.invalidateQueries({ queryKey: albumsQueryKey });
      toast.success(
        newFeatured
          ? `"${album.title}" is now featured on the homepage.`
          : `"${album.title}" removed from homepage (still in archive).`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    }
  }

  // Quick reorder homepage collections
  async function moveHomepageOrder(album: Album, direction: "up" | "down") {
    try {
      const sorted = [...albums]
        .filter((a) => a.featuredOnHomepage !== false)
        .sort((a, b) => {
          const ordA = typeof a.homepageOrder === "number" ? a.homepageOrder : 999;
          const ordB = typeof b.homepageOrder === "number" ? b.homepageOrder : 999;
          return ordA - ordB;
        });

      const currentIndex = sorted.findIndex((a) => a.id === album.id);
      if (currentIndex === -1) return;
      if (direction === "up" && currentIndex === 0) return;
      if (direction === "down" && currentIndex === sorted.length - 1) return;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      const targetAlbum = sorted[targetIndex];
      if (!targetAlbum) return;

      // Swap orders
      const currentOrder =
        typeof album.homepageOrder === "number" ? album.homepageOrder : currentIndex + 1;
      const targetOrder =
        typeof targetAlbum.homepageOrder === "number" ? targetAlbum.homepageOrder : targetIndex + 1;

      const authHeaders = await getAdminAuthHeaders({ "Content-Type": "application/json" });

      await Promise.all([
        fetch(`/api/admin/albums/${encodeURIComponent(album.id)}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ homepageOrder: targetOrder }),
        }),
        fetch(`/api/admin/albums/${encodeURIComponent(targetAlbum.id)}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ homepageOrder: currentOrder }),
        }),
      ]);

      await queryClient.invalidateQueries({ queryKey: albumsQueryKey });
      toast.success("Homepage collection display order updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reorder failed";
      toast.error(msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      const authHeaders = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/albums/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete album (HTTP ${res.status})`);
      }

      toast.success("Collection removed. Photographs remain preserved in the catalogue.");
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: albumsQueryKey });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-12">
      {/* Header & New Collection Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div>
          <h2 className="display text-3xl text-foreground">Albums & Collections</h2>
          <p className="eyebrow text-xs text-muted-foreground mt-1">
            Organize catalogued photographs into curated, thematic public collections. Featured
            status and album membership are fully independent.
          </p>
        </div>

        {!isCreating && !editingAlbum && (
          <button
            type="button"
            onClick={startCreate}
            className="eyebrow flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs text-background font-semibold transition-opacity hover:opacity-90 self-start sm:self-auto"
          >
            <FolderPlus className="h-4 w-4" />
            Create Collection
          </button>
        )}
      </div>

      {/* CREATE / EDIT FORM */}
      {(isCreating || editingAlbum) && (
        <div className="border border-border/80 bg-secondary/15 p-6 md:p-8 space-y-8 animate-fade">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="display text-2xl text-accent">
                {isCreating ? "New Collection" : `Edit: ${editingAlbum?.title}`}
              </h3>
              <p className="eyebrow text-xs text-muted-foreground mt-0.5">
                Add existing catalogue photos or upload new photos directly from your local
                computer.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="eyebrow block text-xs text-muted-foreground mb-2">
                Collection Title *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Cannes Film Festival 2026"
                className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="eyebrow block text-xs text-muted-foreground mb-2">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Year & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block text-xs text-muted-foreground mb-2">Year</label>
                <input
                  type="text"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  placeholder="2026"
                  className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="eyebrow block text-xs text-muted-foreground mb-2">
                  Exact Date (Optional)
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="eyebrow block text-xs text-muted-foreground mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Paris, France or Studio 01"
                className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="eyebrow block text-xs text-muted-foreground mb-2">
                Editorial Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Brief narrative or context for this collection..."
                className="w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            {/* Homepage Curation Controls */}
            <div className="md:col-span-2 border border-border/60 bg-background/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="albumFeaturedOnHomepage"
                  checked={formFeaturedOnHomepage}
                  onChange={(e) => setFormFeaturedOnHomepage(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <label
                  htmlFor="albumFeaturedOnHomepage"
                  className="eyebrow text-xs text-foreground cursor-pointer"
                >
                  Feature this Collection on Homepage (Cover Card)
                </label>
              </div>

              {formFeaturedOnHomepage && (
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-xs text-muted-foreground">Homepage Order:</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formHomepageOrder}
                    onChange={(e) => setFormHomepageOrder(e.target.value)}
                    className="w-16 border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Photos Management within Album */}
          <div className="border-t border-border/40 pt-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="eyebrow text-xs text-foreground font-semibold uppercase tracking-wider">
                  Photographs in this Collection ({formPhotoIds.length})
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reorder using arrows, choose a cover photo, or toggle Featured status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* UPLOAD LOCAL FILES DIRECTLY TO ALBUM BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUploaderOpen(!isUploaderOpen);
                    setIsPhotoPickerOpen(false);
                  }}
                  className={`eyebrow flex items-center gap-1.5 px-3.5 py-2 text-xs transition-colors ${
                    isUploaderOpen
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploaderOpen ? "Close Uploader" : "Upload Local Photos"}
                </button>

                {/* SELECT EXISTING CATALOGUE PHOTOS BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoPickerOpen(!isPhotoPickerOpen);
                    setIsUploaderOpen(false);
                  }}
                  className={`eyebrow flex items-center gap-1.5 border px-3.5 py-2 text-xs transition-colors ${
                    isPhotoPickerOpen
                      ? "border-accent bg-accent/15 text-accent font-semibold"
                      : "border-border bg-background text-foreground hover:border-foreground"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isPhotoPickerOpen ? "Close Photo Picker" : "Add Existing Photos"}
                </button>
              </div>
            </div>

            {/* ---------------- SECTION 1: UPLOAD LOCAL PHOTOS DIRECTLY ---------------- */}
            {isUploaderOpen && (
              <div className="border-2 border-accent/60 bg-background p-5 space-y-4 animate-fade">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2 text-accent">
                    <Upload className="h-4 w-4" />
                    <span className="eyebrow text-xs font-semibold uppercase tracking-wider">
                      Upload Photos from Local Computer to Collection
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUploaderOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Select one or more photographs from your computer. Files are securely uploaded
                    to the catalogue and assigned to this collection immediately.
                  </p>

                  <div className="border border-dashed border-border p-6 text-center bg-secondary/20 hover:bg-secondary/30 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="album-local-upload-input"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setUploadFiles(files);
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="album-local-upload-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="h-7 w-7 text-accent" />
                      <span className="text-sm font-medium text-foreground">
                        {uploadFiles.length === 0
                          ? "Click to browse or drop local images here"
                          : `${uploadFiles.length} file(s) selected`}
                      </span>
                      <span className="eyebrow text-[11px] text-muted-foreground">
                        Supports JPG, PNG, WEBP (up to 10MB each)
                      </span>
                    </label>
                  </div>

                  {uploadFiles.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {uploadFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square border border-border overflow-hidden bg-muted"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white p-0.5 truncate text-center">
                              {file.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Upload Options */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-secondary/30 p-3 border border-border/60">
                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadSetAsCover}
                            onChange={(e) => setUploadSetAsCover(e.target.checked)}
                            className="accent-accent"
                          />
                          <span>Set first uploaded photograph as Album Cover</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadAlsoFeatured}
                            onChange={(e) => setUploadAlsoFeatured(e.target.checked)}
                            className="accent-accent"
                          />
                          <span className="flex items-center gap-1 text-accent font-medium">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Also mark as Featured (Homepage)
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFiles([]);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="eyebrow border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear Selection
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadFilesToAlbum}
                          disabled={uploading}
                          className="eyebrow flex items-center gap-2 bg-accent px-5 py-2 text-xs text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploading
                            ? `Uploading ${uploadFiles.length} photo(s)…`
                            : `Upload & Add ${uploadFiles.length} Photo(s)`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------- SECTION 2: ADD EXISTING PHOTOS PICKER (SEARCH + FILTER + MULTI-SELECT) ---------------- */}
            {isPhotoPickerOpen && (
              <div className="border border-border/90 bg-background p-5 rounded-none space-y-4 animate-fade">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <span className="eyebrow text-xs font-semibold text-foreground uppercase tracking-wider">
                      Add Existing Photographs from Catalogue
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select any photograph from your entire archive. Both Featured and Non-Featured
                      photos are selectable.
                    </p>
                  </div>
                  <span className="eyebrow text-xs bg-accent/20 text-accent px-2.5 py-1 border border-accent/40 font-semibold">
                    {formPhotoIds.length} in Collection
                  </span>
                </div>

                {/* Filter Controls: Search + Category + Year + Featured Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-secondary/20 p-3 border border-border/60">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search title, event, description…"
                      className="w-full border border-border bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={pickerCategory}
                      onChange={(e) => setPickerCategory(e.target.value)}
                      className="w-full border border-border bg-background py-1.5 px-2 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="All">All Categories</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div>
                    <select
                      value={pickerYear}
                      onChange={(e) => setPickerYear(e.target.value)}
                      className="w-full border border-border bg-background py-1.5 px-2 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="All">All Years</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          Year: {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Featured Status Filter */}
                  <div>
                    <select
                      value={pickerFeaturedFilter}
                      onChange={(e) =>
                        setPickerFeaturedFilter(
                          e.target.value as "All" | "Featured" | "Non-Featured",
                        )
                      }
                      className="w-full border border-border bg-background py-1.5 px-2 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="All">All Photos</option>
                      <option value="Non-Featured">Non-Featured Only</option>
                      <option value="Featured">Featured Only</option>
                    </select>
                  </div>
                </div>

                {/* Photo Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-1 border border-border/40">
                  {filteredCataloguePhotos.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                      No photographs match the current search or filters.
                    </div>
                  ) : (
                    filteredCataloguePhotos.map((photo) => {
                      const isSelected = formPhotoIds.includes(photo.id);
                      const isCover = formCoverPhotoId === photo.id;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => togglePhotoSelection(photo.id)}
                          className={`relative aspect-square cursor-pointer overflow-hidden border-2 transition-all select-none group ${
                            isSelected
                              ? "border-accent ring-2 ring-accent/40 shadow-sm"
                              : "border-border/60 opacity-70 hover:opacity-100 hover:border-foreground/40"
                          }`}
                        >
                          <img
                            src={photo.image_url}
                            alt={photo.title}
                            className="h-full w-full object-cover"
                          />

                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-accent text-background p-1 shadow">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Featured Tag Indicator */}
                          {photo.featured && (
                            <div
                              className="absolute top-1.5 left-1.5 bg-black/80 text-accent p-1"
                              title="Featured Photo"
                            >
                              <Star className="h-3 w-3 fill-current" />
                            </div>
                          )}

                          {/* Title & Category Overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-background/90 p-1.5 backdrop-blur-xs">
                            <p className="text-[11px] font-medium truncate text-foreground">
                              {photo.title}
                            </p>
                            <p className="eyebrow text-[9px] text-muted-foreground truncate">
                              {photo.category} • {photo.taken_on ? photo.taken_on.slice(0, 4) : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>
                    Showing {filteredCataloguePhotos.length} of {photos.length} photos in archive
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch("");
                      setPickerCategory("All");
                      setPickerYear("All");
                      setPickerFeaturedFilter("All");
                    }}
                    className="underline hover:text-foreground"
                  >
                    Reset Picker Filters
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- SECTION 3: SELECTED ALBUM PHOTOS LIST ---------------- */}
            {formPhotoIds.length === 0 ? (
              <div className="p-10 border border-dashed border-border/60 text-center text-muted-foreground space-y-2">
                <p className="display text-lg text-foreground">
                  No photographs in this collection yet
                </p>
                <p className="text-xs">
                  Click &quot;Upload Local Photos&quot; to upload files from your computer, or
                  &quot;Add Existing Photos&quot; to select from your archive catalogue.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {formPhotoIds.map((photoId, idx) => {
                  const photo = photoMap.get(photoId);
                  const isCover = formCoverPhotoId === photoId || (!formCoverPhotoId && idx === 0);

                  return (
                    <div
                      key={photoId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border/70 bg-background p-3 sm:px-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="eyebrow text-xs text-muted-foreground w-6 shrink-0 text-center font-mono">
                          {idx + 1}
                        </span>

                        {photo ? (
                          <img
                            src={photo.image_url}
                            alt={photo.title}
                            className="h-12 w-12 shrink-0 object-cover border border-border"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted flex items-center justify-center border border-border">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-foreground font-semibold truncate">
                              {photo?.title || photoId}
                            </p>
                            {isCover && (
                              <span className="eyebrow bg-accent text-background px-2 py-0.5 text-[9px] font-bold">
                                COVER
                              </span>
                            )}
                          </div>
                          <p className="eyebrow text-[10px] text-muted-foreground mt-0.5">
                            {photo?.category} •{" "}
                            {photo?.taken_on ? photo.taken_on.slice(0, 4) : "Undated"}
                            {photo?.event_name ? ` • ${photo.event_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Independent Featured Toggle */}
                        {photo && (
                          <button
                            type="button"
                            onClick={() => togglePhotoFeatured(photo)}
                            title={
                              photo.featured
                                ? "Featured on Homepage (Click to unfeature)"
                                : "Not Featured (Click to feature on Homepage)"
                            }
                            className={`eyebrow flex items-center gap-1 px-2.5 py-1 text-[10px] transition-colors border ${
                              photo.featured
                                ? "bg-accent/15 border-accent text-accent font-semibold"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Star className={`h-3 w-3 ${photo.featured ? "fill-current" : ""}`} />
                            {photo.featured ? "Featured" : "Non-Featured"}
                          </button>
                        )}

                        {/* Cover Selector */}
                        <button
                          type="button"
                          onClick={() => setFormCoverPhotoId(photoId)}
                          className={`eyebrow flex items-center gap-1 px-2.5 py-1 text-[10px] transition-colors border ${
                            isCover
                              ? "bg-foreground text-background border-foreground font-semibold"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {isCover ? "Current Cover" : "Set Cover"}
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => movePhotoUp(idx)}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25"
                          title="Move earlier in album"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => movePhotoDown(idx)}
                          disabled={idx === formPhotoIds.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25"
                          title="Move later in album"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>

                        {/* Remove from Album */}
                        <button
                          type="button"
                          onClick={() => removePhotoFromAlbum(photoId)}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                          title="Remove photograph from album (keeps photo in catalogue)"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-border/40 pt-6">
            <button
              type="button"
              onClick={resetForm}
              className="eyebrow border border-border px-5 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="eyebrow flex items-center gap-2 bg-foreground px-6 py-2.5 text-xs text-background font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isCreating ? "Create Collection" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ALBUMS CATALOGUE LIST */}
      <div className="space-y-4">
        {albums.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-muted-foreground">
            <p className="display text-xl">No collections exist yet</p>
            <p className="eyebrow text-xs mt-2">
              Click &quot;Create Collection&quot; above to organize your catalogued photos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => {
              const coverPhoto =
                photoMap.get(album.coverPhotoId) ||
                (album.photoIds && photoMap.get(album.photoIds[0])) ||
                null;
              const count = album.photoIds ? album.photoIds.length : 0;

              return (
                <div
                  key={album.id}
                  className="border border-border/60 bg-secondary/10 flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Thumbnail */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                      {coverPhoto ? (
                        <img
                          src={coverPhoto.image_url}
                          alt={album.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className="eyebrow bg-background/90 px-2 py-0.5 text-[10px] text-foreground">
                          {album.category}
                        </span>
                        <span className="eyebrow bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {album.year}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-0.5 text-[10px] eyebrow text-accent">
                        {count} {count === 1 ? "Photo" : "Photos"}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="display text-xl text-foreground truncate">{album.title}</h3>
                        {album.featuredOnHomepage !== false ? (
                          <span className="eyebrow bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 text-[10px] shrink-0 font-medium">
                            ★ Homepage #{album.homepageOrder || 1}
                          </span>
                        ) : (
                          <span className="eyebrow bg-secondary text-muted-foreground border border-border px-2 py-0.5 text-[10px] shrink-0">
                            Archive Only
                          </span>
                        )}
                      </div>

                      {album.location && (
                        <p className="eyebrow text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {album.location}
                        </p>
                      )}
                      {album.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Homepage Curation Bar */}
                  <div className="border-t border-border/40 p-4 space-y-3 bg-background/30">
                    {/* Homepage controls row */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2.5">
                      <button
                        type="button"
                        onClick={() => toggleAlbumHomepage(album)}
                        className={`eyebrow flex items-center gap-1.5 text-[11px] transition-colors ${
                          album.featuredOnHomepage !== false
                            ? "text-accent hover:text-accent/80 font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={
                          album.featuredOnHomepage !== false
                            ? "Click to remove from homepage (remains in archive)"
                            : "Click to feature this collection on homepage"
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {album.featuredOnHomepage !== false
                          ? "Featured on Homepage"
                          : "Add to Homepage"}
                      </button>

                      {album.featuredOnHomepage !== false && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveHomepageOrder(album, "up")}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Move earlier on homepage"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveHomepageOrder(album, "down")}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Move later on homepage"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => startEdit(album)}
                        className="eyebrow flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Collection
                      </button>

                      {deletingId === album.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(album.id)}
                            className="eyebrow bg-red-600 px-2.5 py-1 text-[11px] text-white font-semibold hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="eyebrow text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(album.id)}
                          className="p-1 text-muted-foreground hover:text-red-400"
                          title="Delete collection (retains photos in catalogue)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
