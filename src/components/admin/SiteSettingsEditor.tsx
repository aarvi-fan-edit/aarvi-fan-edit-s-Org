import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RotateCcw, ShieldCheck } from "lucide-react";

import { getAdminAuthHeaders } from "@/lib/admin-api";
import { type SiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";

interface SiteSettingsEditorProps {
  content: SiteContent;
}

export function SiteSettingsEditor({ content }: SiteSettingsEditorProps) {
  const queryClient = useQueryClient();

  const [brand, setBrand] = useState<SiteContent["brand"]>({ ...content.brand });
  const [archive, setArchive] = useState<SiteContent["archive"]>({ ...content.archive });
  const [footer, setFooter] = useState<SiteContent["footer"]>({ ...content.footer });

  useEffect(() => {
    setBrand({ ...content.brand });
    setArchive({ ...content.archive });
    setFooter({ ...content.footer });
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const newContent: SiteContent = {
        ...content,
        brand,
        archive,
        footer,
      };

      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newContent),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save site settings.");
      }

      return newContent;
    },
    onSuccess: () => {
      toast.success("Site settings & brand configuration saved");
      void queryClient.invalidateQueries({ queryKey: siteContentQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleReset = () => {
    if (confirm("Reset Site Settings to initial defaults?")) {
      setBrand(DEFAULT_SITE_CONTENT.brand);
      setArchive(DEFAULT_SITE_CONTENT.archive);
      setFooter(DEFAULT_SITE_CONTENT.footer);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-3xl">Brand &amp; Site Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage global branding, archive search labels, footer copy, and legal statements.
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
            onClick={() => saveMutation.mutate()}
            className="eyebrow flex items-center gap-2 border border-accent bg-accent px-5 py-2 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Site Settings"}
          </button>
        </div>
      </div>

      {/* 1. Global Brand & Identity */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          1. Brand Identity
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="eyebrow">Brand Name (Navigation &amp; Footer Logo)</span>
            <input
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
              placeholder="AARVI"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Brand Tagline / Period Covered</span>
            <input
              value={brand.tagline}
              onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
              placeholder="Photography — 2024 to 2026"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Copyright Notice</span>
            <input
              value={brand.copyrightText}
              onChange={(e) => setBrand({ ...brand, copyrightText: e.target.value })}
              placeholder="All photographs are rights reserved."
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Legal / Prototype Disclaimer</span>
            <input
              value={brand.disclaimerText}
              onChange={(e) => setBrand({ ...brand, disclaimerText: e.target.value })}
              placeholder="Images shown are placeholders for the prototype."
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* 2. Archive Page Configuration */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          2. Archive Page Controls
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="eyebrow">Archive Heading</span>
            <input
              value={archive.pageTitle}
              onChange={(e) => setArchive({ ...archive, pageTitle: e.target.value })}
              placeholder="Archive"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Count Eyebrow Suffix</span>
            <input
              value={archive.cataloguedLabel}
              onChange={(e) => setArchive({ ...archive, cataloguedLabel: e.target.value })}
              placeholder="photographs catalogued"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Search Bar Placeholder</span>
            <input
              value={archive.searchPlaceholder}
              onChange={(e) => setArchive({ ...archive, searchPlaceholder: e.target.value })}
              placeholder="Search title, event or year"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Empty Results Message</span>
            <input
              value={archive.emptyMessage}
              onChange={(e) => setArchive({ ...archive, emptyMessage: e.target.value })}
              placeholder="No photographs match this selection."
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* 3. Footer Layout & Text */}
      <div className="border border-border p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-accent">
          3. Footer Statements &amp; Column Headings
        </h3>

        <div>
          <span className="eyebrow">Footer Short Description</span>
          <textarea
            rows={2}
            value={footer.description}
            onChange={(e) => setFooter({ ...footer, description: e.target.value })}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="eyebrow">Navigate Column Heading</span>
            <input
              value={footer.navigateTitle}
              onChange={(e) => setFooter({ ...footer, navigateTitle: e.target.value })}
              placeholder="Navigate"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Elsewhere Column Heading</span>
            <input
              value={footer.elsewhereTitle}
              onChange={(e) => setFooter({ ...footer, elsewhereTitle: e.target.value })}
              placeholder="Elsewhere"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <span className="eyebrow">Copyright Year</span>
            <input
              value={footer.copyrightYear}
              onChange={(e) => setFooter({ ...footer, copyrightYear: e.target.value })}
              placeholder="2026"
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
