import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RotateCcw, Image as ImageIcon } from "lucide-react";

import { getAdminAuthHeaders } from "@/lib/admin-api";
import { type SiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";
import { ImageUploader } from "./ImageUploader";

interface HomepageEditorProps {
  content: SiteContent;
}

export function HomepageEditor({ content }: HomepageEditorProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SiteContent["homepage"]>({
    ...content.homepage,
  });

  useEffect(() => {
    setFormData({ ...content.homepage });
  }, [content.homepage]);

  const saveMutation = useMutation({
    mutationFn: async (updatedHomepage: SiteContent["homepage"]) => {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const newContent: SiteContent = {
        ...content,
        homepage: updatedHomepage,
      };

      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newContent),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save homepage content.");
      }

      return newContent;
    },
    onSuccess: () => {
      toast.success("Homepage content saved and live");
      void queryClient.invalidateQueries({ queryKey: siteContentQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleReset = () => {
    if (confirm("Reset Homepage settings to initial defaults?")) {
      setFormData(DEFAULT_SITE_CONTENT.homepage);
      saveMutation.mutate(DEFAULT_SITE_CONTENT.homepage);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-3xl">Homepage Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the cinematic hero section, headlines, descriptions, and curated gallery titles.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="eyebrow flex items-center gap-2 border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(formData)}
            className="eyebrow flex items-center gap-2 border border-accent bg-accent px-5 py-2 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Homepage"}
          </button>
        </div>
      </div>

      {/* 1. Hero Section */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          1. Hero Atmosphere &amp; Background
        </h3>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <ImageUploader
              label="Hero Background Image"
              helperText="High-resolution visual (1600x1000 recommended)"
              currentUrl={formData.heroImageUrl}
              onImageUploaded={(url) => setFormData({ ...formData, heroImageUrl: url })}
              aspectRatio="video"
            />
            <div className="mt-3">
              <span className="eyebrow">Hero Image Accessibility Alt Text</span>
              <input
                value={formData.heroImageAlt}
                onChange={(e) => setFormData({ ...formData, heroImageAlt: e.target.value })}
                placeholder="e.g. AARVI photographed in studio lighting"
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="eyebrow">Hero Main Title</span>
              <input
                value={formData.heroTitle}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <span className="eyebrow">Hero Eyebrow / Subtitle</span>
              <input
                value={formData.heroSubtitle}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <span className="eyebrow">Hero Editorial Description</span>
              <textarea
                rows={3}
                value={formData.heroDescription}
                onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <span className="eyebrow">Call to Action Button Label</span>
              <input
                value={formData.heroButtonText}
                onChange={(e) => setFormData({ ...formData, heroButtonText: e.target.value })}
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Featured Section */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          2. Featured Section Headers
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="eyebrow">Section Eyebrow</span>
            <input
              value={formData.featuredSectionEyebrow}
              onChange={(e) => setFormData({ ...formData, featuredSectionEyebrow: e.target.value })}
              placeholder="Selected"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Section Heading</span>
            <input
              value={formData.featuredSectionTitle}
              onChange={(e) => setFormData({ ...formData, featuredSectionTitle: e.target.value })}
              placeholder="Featured Photographs"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* 3. Curated Collections Section */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          3. Curated Collections Headers &amp; Display
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="eyebrow">Section Eyebrow</span>
            <input
              value={formData.latestSectionEyebrow}
              onChange={(e) => setFormData({ ...formData, latestSectionEyebrow: e.target.value })}
              placeholder="Curated"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Section Heading</span>
            <input
              value={formData.latestSectionTitle}
              onChange={(e) => setFormData({ ...formData, latestSectionTitle: e.target.value })}
              placeholder="Collections"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">"View All" Button Label</span>
            <input
              value={formData.latestSectionButtonText}
              onChange={(e) =>
                setFormData({ ...formData, latestSectionButtonText: e.target.value })
              }
              placeholder="VIEW ALL"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showViewAllBtn"
              checked={formData.showViewAllButton !== false}
              onChange={(e) => setFormData({ ...formData, showViewAllButton: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            <label
              htmlFor="showViewAllBtn"
              className="eyebrow text-xs text-foreground cursor-pointer"
            >
              Show "VIEW ALL" archive button
            </label>
          </div>

          <div>
            <span className="eyebrow">Max Collections on Homepage</span>
            <input
              type="number"
              min={1}
              max={24}
              value={formData.collectionsMaxCount || 6}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  collectionsMaxCount: Math.max(1, parseInt(e.target.value) || 6),
                })
              }
              className="mt-1 w-full max-w-[120px] border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
