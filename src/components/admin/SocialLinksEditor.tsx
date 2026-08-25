import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, RotateCcw, Globe, ExternalLink } from "lucide-react";

import { getAdminAuthHeaders } from "@/lib/admin-api";
import {
  type SiteContent,
  type SocialLink,
  siteContentQueryKey,
  DEFAULT_SITE_CONTENT,
} from "@/lib/site-content";

interface SocialLinksEditorProps {
  content: SiteContent;
}

export function SocialLinksEditor({ content }: SocialLinksEditorProps) {
  const queryClient = useQueryClient();
  const [links, setLinks] = useState<SocialLink[]>(
    content.socialLinks || DEFAULT_SITE_CONTENT.socialLinks,
  );

  useEffect(() => {
    setLinks(content.socialLinks || DEFAULT_SITE_CONTENT.socialLinks);
  }, [content.socialLinks]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const authHeaders = await getAdminAuthHeaders({
        "Content-Type": "application/json",
      });

      const newContent: SiteContent = {
        ...content,
        socialLinks: links,
      };

      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newContent),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save social links.");
      }

      return newContent;
    },
    onSuccess: () => {
      toast.success("Social links updated and published");
      void queryClient.invalidateQueries({ queryKey: siteContentQueryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddLink = () => {
    const newLink: SocialLink = {
      id: `social-${Date.now()}`,
      platform: "Custom Link",
      label: "Profile Link",
      url: "https://",
      username: "",
      showInAbout: true,
      showInFooter: true,
    };
    setLinks([...links, newLink]);
  };

  const handleUpdateLink = (index: number, updates: Partial<SocialLink>) => {
    const copy = [...links];
    copy[index] = { ...copy[index], ...updates };
    setLinks(copy);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    if (confirm("Reset social links to defaults?")) {
      setLinks(DEFAULT_SITE_CONTENT.socialLinks);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-3xl">Social Channels &amp; Press Links</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage links shown in the About section and Footer Elsewhere columns.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAddLink}
            className="eyebrow flex items-center gap-1.5 border border-border px-4 py-2 text-xs hover:border-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Channel
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="eyebrow flex items-center gap-1.5 border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="eyebrow flex items-center gap-2 border border-accent bg-accent px-5 py-2 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Links"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {links.map((link, idx) => (
          <div
            key={link.id || idx}
            className="border border-border bg-secondary/10 p-5 space-y-4 transition-colors hover:border-foreground/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent" />
                <span className="font-medium text-sm">{link.platform || "Social Link"}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLink(idx)}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Remove link"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="eyebrow">Display Label</span>
                <input
                  value={link.label}
                  onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                  placeholder="e.g. Instagram"
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <span className="eyebrow">Destination URL</span>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                  placeholder="https://instagram.com/aarvi"
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <span className="eyebrow">Handle / Username (Optional)</span>
                <input
                  value={link.username ?? ""}
                  onChange={(e) => handleUpdateLink(idx, { username: e.target.value })}
                  placeholder="@aarvifanedits"
                  className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 border-t border-border pt-3 text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={link.showInAbout !== false}
                  onChange={(e) => handleUpdateLink(idx, { showInAbout: e.target.checked })}
                />
                Show on About Page
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={link.showInFooter !== false}
                  onChange={(e) => handleUpdateLink(idx, { showInFooter: e.target.checked })}
                />
                Show on Site Footer
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
