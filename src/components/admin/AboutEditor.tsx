import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RotateCcw, Plus, Trash2 } from "lucide-react";

import { getAdminAuthHeaders } from "@/lib/admin-api";
import {
  type SiteContent,
  type SiteCredit,
  siteContentQueryKey,
  DEFAULT_SITE_CONTENT,
} from "@/lib/site-content";
import { ImageUploader } from "./ImageUploader";

interface AboutEditorProps {
  content: SiteContent;
}

export function AboutEditor({ content }: AboutEditorProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SiteContent["about"]>({
    ...content.about,
    creditsList: content.about.creditsList || DEFAULT_SITE_CONTENT.about.creditsList,
  });

  useEffect(() => {
    setFormData({
      ...content.about,
      creditsList: content.about.creditsList || DEFAULT_SITE_CONTENT.about.creditsList,
    });
  }, [content.about]);

  const saveMutation = useMutation({
    mutationFn: async (updatedAbout: SiteContent["about"]) => {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const newContent: SiteContent = {
        ...content,
        about: updatedAbout,
      };

      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newContent),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save About page content.");
      }

      return newContent;
    },
    onSuccess: () => {
      toast.success("About page content saved");
      void queryClient.invalidateQueries({ queryKey: siteContentQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddCredit = () => {
    const newCredit: SiteCredit = {
      id: `credit-${Date.now()}`,
      role: "Photography",
      name: "Artist name",
    };
    setFormData({
      ...formData,
      creditsList: [...(formData.creditsList || []), newCredit],
    });
  };

  const handleUpdateCredit = (index: number, updates: Partial<SiteCredit>) => {
    const list = [...(formData.creditsList || [])];
    list[index] = { ...list[index], ...updates };
    setFormData({ ...formData, creditsList: list });
  };

  const handleRemoveCredit = (index: number) => {
    const list = (formData.creditsList || []).filter((_, i) => i !== index);
    setFormData({ ...formData, creditsList: list });
  };

  const handleReset = () => {
    if (confirm("Reset About page settings to default?")) {
      setFormData(DEFAULT_SITE_CONTENT.about);
      saveMutation.mutate(DEFAULT_SITE_CONTENT.about);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-3xl">About &amp; Biography Editorial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the artist biography, archive description statement, and team credits.
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
            {saveMutation.isPending ? "Saving…" : "Save About Content"}
          </button>
        </div>
      </div>

      {/* 1. Header & Display */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          1. Header &amp; Visual Banner
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="eyebrow">Page Eyebrow Label</span>
            <input
              value={formData.pageTitle}
              onChange={(e) => setFormData({ ...formData, pageTitle: e.target.value })}
              placeholder="About"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Main Display Heading</span>
            <input
              value={formData.displayHeading}
              onChange={(e) => setFormData({ ...formData, displayHeading: e.target.value })}
              placeholder="AARVI"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <ImageUploader
            label="Optional About Editorial Banner Image"
            helperText="Add an optional wide banner for the about page"
            currentUrl={formData.aboutImageUrl}
            onImageUploaded={(url) => setFormData({ ...formData, aboutImageUrl: url })}
            aspectRatio="banner"
          />
        </div>
      </div>

      {/* 2. Biography Section */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          2. Biography Section
        </h3>

        <div>
          <span className="eyebrow">Biography Eyebrow</span>
          <input
            value={formData.biographyEyebrow}
            onChange={(e) => setFormData({ ...formData, biographyEyebrow: e.target.value })}
            placeholder="Biography"
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <span className="eyebrow">Biography Featured Headline</span>
          <textarea
            rows={2}
            value={formData.biographyHeadline}
            onChange={(e) => setFormData({ ...formData, biographyHeadline: e.target.value })}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <span className="eyebrow">Biography Full Body (Supports Paragraphs)</span>
          <textarea
            rows={5}
            value={formData.biographyBody}
            onChange={(e) => setFormData({ ...formData, biographyBody: e.target.value })}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent font-mono text-xs"
          />
        </div>
      </div>

      {/* 3. The Archive Section */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          3. "The Archive" Statement
        </h3>

        <div>
          <span className="eyebrow">Archive Section Eyebrow</span>
          <input
            value={formData.archiveSectionEyebrow}
            onChange={(e) => setFormData({ ...formData, archiveSectionEyebrow: e.target.value })}
            placeholder="The Archive"
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <span className="eyebrow">Archive Explanatory Text</span>
          <textarea
            rows={4}
            value={formData.archiveSectionBody}
            onChange={(e) => setFormData({ ...formData, archiveSectionBody: e.target.value })}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* 4. Credits Section */}
      <div className="border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
            4. Credits &amp; Attribution
          </h3>
          <button
            type="button"
            onClick={handleAddCredit}
            className="eyebrow flex items-center gap-1 border border-border px-3 py-1 text-xs hover:border-foreground"
          >
            <Plus className="h-3 w-3" />
            Add Credit
          </button>
        </div>

        <div>
          <span className="eyebrow">Credits Section Title</span>
          <input
            value={formData.creditsEyebrow}
            onChange={(e) => setFormData({ ...formData, creditsEyebrow: e.target.value })}
            placeholder="Credits"
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-3">
          {(formData.creditsList || []).map((credit, idx) => (
            <div
              key={credit.id || idx}
              className="flex items-center gap-3 border border-border p-3"
            >
              <input
                value={credit.role}
                onChange={(e) => handleUpdateCredit(idx, { role: e.target.value })}
                placeholder="Role (e.g. Photography)"
                className="w-1/3 border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
              <span className="text-muted-foreground">—</span>
              <input
                value={credit.name}
                onChange={(e) => handleUpdateCredit(idx, { name: e.target.value })}
                placeholder="Name or Attribution"
                className="flex-1 border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => handleRemoveCredit(idx)}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Remove credit"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
