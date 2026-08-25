import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getAdminAuthHeaders } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploaderProps {
  currentUrl?: string;
  onImageUploaded: (url: string) => void;
  label?: string;
  helperText?: string;
  aspectRatio?: "square" | "video" | "auto" | "banner";
}

export function ImageUploader({
  currentUrl,
  onImageUploaded,
  label = "Upload Image",
  helperText = "Drag & drop or click to upload (JPG, PNG, WebP up to 10MB)",
  aspectRatio = "auto",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || "");
  const [urlInput, setUrlInput] = useState(currentUrl || "");
  const [showUrlField, setShowUrlField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    const localBlob = URL.createObjectURL(file);
    setPreviewUrl(localBlob);

    try {
      // 1. Get current auth session headers
      const authHeaders = await getAdminAuthHeaders();

      // 2. Upload via server-side endpoint
      const formData = new FormData();
      formData.append("file", file);

      const uploadHeaders: Record<string, string> = {};
      if (authHeaders["Authorization"]) {
        uploadHeaders["Authorization"] = authHeaders["Authorization"];
      }

      const res = await fetch("/api/admin/upload-file", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!res.ok) {
        // Fallback: try base64 upload
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
          throw new Error("Failed to upload image to server.");
        }

        const data = await jsonRes.json();
        setPreviewUrl(data.url);
        setUrlInput(data.url);
        onImageUploaded(data.url);
        toast.success("Image uploaded successfully");
        return;
      }

      const data = await res.json();
      const finalUrl = data.url;

      // Also attempt background sync to Supabase storage if available
      try {
        const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        await supabase.storage.from("photos").upload(safeName, file);
      } catch {
        // ignore background storage mirror failure
      }

      setPreviewUrl(finalUrl);
      setUrlInput(finalUrl);
      onImageUploaded(finalUrl);
      toast.success("Image uploaded successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      toast.error(msg);
      // Keep local preview if available or revert
    } finally {
      setIsUploading(false);
    }
  }

  function handleDirectUrlApply() {
    if (!urlInput.trim()) return;
    setPreviewUrl(urlInput.trim());
    onImageUploaded(urlInput.trim());
    toast.success("Image URL updated");
  }

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[21/9]",
    auto: "min-h-[160px] max-h-[320px]",
  }[aspectRatio];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <button
          type="button"
          onClick={() => setShowUrlField(!showUrlField)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          {showUrlField ? "Use file uploader" : "Or specify direct URL"}
        </button>
      </div>

      {showUrlField ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://... or /samples/hero.jpg"
            className="flex-1 border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleDirectUrlApply}
            className="eyebrow border border-accent px-4 py-2 text-accent hover:bg-accent hover:text-accent-foreground"
          >
            Apply
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelected(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:border-accent hover:bg-secondary/50 ${aspectClasses}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />

          {previewUrl ? (
            <div className="relative h-full w-full overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover transition-opacity group-hover:opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="eyebrow text-white">Click or drag to replace</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-6 w-6 transition-transform group-hover:scale-110" />
              <p className="text-xs">{helperText}</p>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="eyebrow animate-pulse">Uploading file…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
