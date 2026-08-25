import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Camera,
  FolderKanban,
  Home,
  FileText,
  Settings,
  Share2,
  Shield,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  ARCHIVE_NAME,
  fetchPhotos,
  photosQueryKey,
  fetchAlbums,
  albumsQueryKey,
} from "@/lib/archive";
import { fetchSiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";

import { PhotosManager } from "@/components/admin/PhotosManager";
import { AlbumsManager } from "@/components/admin/AlbumsManager";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { AboutEditor } from "@/components/admin/AboutEditor";
import { SiteSettingsEditor } from "@/components/admin/SiteSettingsEditor";
import { SocialLinksEditor } from "@/components/admin/SocialLinksEditor";
import { SecuritySettings } from "@/components/admin/SecuritySettings";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: `Admin Portal — ${ARCHIVE_NAME}` },
      { name: "description", content: "Comprehensive archive content management system." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Admin Portal — ${ARCHIVE_NAME}` },
      { property: "og:description", content: "Archive content management system." },
    ],
  }),
  component: AdminPage,
});

type AdminTab = "albums" | "photos" | "homepage" | "about" | "settings" | "socials" | "security";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("albums");

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: photosQueryKey,
    queryFn: fetchPhotos,
  });

  const { data: albums = [], isLoading: albumsLoading } = useQuery({
    queryKey: albumsQueryKey,
    queryFn: fetchAlbums,
  });

  const { data: siteContent = DEFAULT_SITE_CONTENT, isLoading: contentLoading } = useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContent,
  });

  /**
   * Verify authenticated user admin status.
   */
  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return false;

      // Check via has_role RPC
      const { data: hasRoleResult, error: rpcError } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });

      if (!rpcError && typeof hasRoleResult === "boolean") {
        return hasRoleResult;
      }

      // Fallback query directly on user_roles
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !data) {
        // Double check target UID for primary curator fallback
        if (userData.user.email === "aarvifanedits@gmail.com") return true;
        return false;
      }
      return true;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  if (checkingRole || photosLoading || contentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow animate-pulse">Loading Admin Portal…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="mx-auto max-w-md border border-border p-8 text-center">
          <h1 className="font-display text-3xl">Restricted Access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account is not on the authorized curator list.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="eyebrow mt-6 border border-border px-5 py-2 hover:border-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const brandName = siteContent.brand.name || ARCHIVE_NAME;

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "albums",
      label: "Collections / Albums",
      icon: <FolderKanban className="h-4 w-4" />,
      badge: albums.length,
    },
    {
      id: "photos",
      label: "Photographs",
      icon: <Camera className="h-4 w-4" />,
      badge: photos.length,
    },
    { id: "homepage", label: "Homepage", icon: <Home className="h-4 w-4" /> },
    { id: "about", label: "About & Bio", icon: <FileText className="h-4 w-4" /> },
    { id: "settings", label: "Site Settings", icon: <Settings className="h-4 w-4" /> },
    { id: "socials", label: "Social Links", icon: <Share2 className="h-4 w-4" /> },
    { id: "security", label: "Security & DB", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 md:px-12">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-xl tracking-[0.3em]">
              {brandName}
            </Link>
            <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              CMS Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow hidden items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              View Live Website
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={signOut}
              className="eyebrow flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-[1600px] overflow-x-auto px-6 md:px-12 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`eyebrow flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-xs transition-colors ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {typeof tab.badge === "number" && (
                  <span
                    className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === tab.id
                        ? "bg-accent/20 text-accent"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-12 md:py-12">
        {activeTab === "albums" && <AlbumsManager albums={albums} photos={photos} />}
        {activeTab === "photos" && <PhotosManager photos={photos} />}
        {activeTab === "homepage" && <HomepageEditor content={siteContent} />}
        {activeTab === "about" && <AboutEditor content={siteContent} />}
        {activeTab === "settings" && <SiteSettingsEditor content={siteContent} />}
        {activeTab === "socials" && <SocialLinksEditor content={siteContent} />}
        {activeTab === "security" && <SecuritySettings />}
      </main>
    </div>
  );
}
