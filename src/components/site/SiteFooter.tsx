import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ARCHIVE_NAME } from "@/lib/archive";
import { fetchSiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";

export function SiteFooter() {
  const { data: siteContent = DEFAULT_SITE_CONTENT } = useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContent,
  });

  const ft = siteContent.footer;
  const brand = siteContent.brand;
  const footerSocials = siteContent.socialLinks.filter((s) => s.showInFooter !== false);

  return (
    <footer className="border-t border-border px-6 py-20 md:px-12">
      <div className="mx-auto grid max-w-[1600px] gap-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl tracking-[0.3em]">{brand.name || ARCHIVE_NAME}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {ft.description ||
              "A curated photographic archive. Every frame catalogued by event, date and collection."}
          </p>
        </div>

        <div>
          <p className="eyebrow">{ft.navigateTitle || "Navigate"}</p>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <Link to="/archive" className="transition-colors hover:text-foreground">
                Archive
              </Link>
            </li>
            <li>
              <Link to="/about" className="transition-colors hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link to="/auth" className="transition-colors hover:text-foreground">
                Admin Access
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">{ft.elsewhereTitle || "Elsewhere"}</p>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            {footerSocials.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label || link.platform}
                  {link.username && (
                    <span className="ml-2 text-xs text-muted-foreground/80">({link.username})</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-20 flex max-w-[1600px] flex-col gap-3 border-t border-border pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          © {ft.copyrightYear || new Date().getFullYear()} {brand.name || ARCHIVE_NAME}.{" "}
          {brand.copyrightText || "All photographs are rights reserved."}
        </p>
        <p>{brand.disclaimerText || "Images shown are placeholders for the prototype."}</p>
      </div>
    </footer>
  );
}
