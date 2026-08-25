import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useReveal } from "@/hooks/use-reveal";
import { ARCHIVE_NAME } from "@/lib/archive";
import { fetchSiteContent, siteContentQueryKey, DEFAULT_SITE_CONTENT } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${ARCHIVE_NAME}` },
      {
        name: "description",
        content: `About the ${ARCHIVE_NAME} photographic archive: how it is curated, catalogued and credited.`,
      },
      { property: "og:title", content: `About — ${ARCHIVE_NAME}` },
      {
        property: "og:description",
        content: `How the ${ARCHIVE_NAME} archive is curated and catalogued.`,
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: siteContent = DEFAULT_SITE_CONTENT } = useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContent,
  });

  useReveal();

  const ab = siteContent.about;
  const brandName = siteContent.brand.name || ARCHIVE_NAME;
  const aboutSocials = siteContent.socialLinks.filter((s) => s.showInAbout !== false);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="px-6 pt-36 md:px-12 md:pt-48">
        <div className="mx-auto max-w-[1600px]">
          <p className="eyebrow animate-fade">{ab.pageTitle || "About"}</p>
          <h1 className="display animate-rise mt-5 text-[clamp(3rem,10vw,8rem)]">
            {ab.displayHeading || brandName}
          </h1>
        </div>
      </section>

      {/* Optional About image banner */}
      {ab.aboutImageUrl && (
        <section className="px-6 pt-12 md:px-12">
          <div className="mx-auto max-w-[1100px] overflow-hidden rounded border border-border">
            <img
              src={ab.aboutImageUrl}
              alt={ab.aboutImageAlt || `${brandName} about portrait`}
              className="h-[400px] w-full object-cover md:h-[500px]"
            />
          </div>
        </section>
      )}

      <section className="px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto grid max-w-[1100px] gap-20">
          <div className="reveal">
            <p className="eyebrow">{ab.biographyEyebrow || "Biography"}</p>
            <p className="mt-6 font-display text-3xl leading-snug md:text-[2.6rem]">
              {ab.biographyHeadline ||
                "A short biography goes here — a few sentences on the work, the years covered and why this archive exists."}
            </p>
            <div className="mt-8 max-w-2xl whitespace-pre-line text-sm leading-loose text-muted-foreground">
              {ab.biographyBody ||
                "Replace this placeholder text with the real biography. Two or three paragraphs usually reads best on an editorial page like this one."}
            </div>
          </div>

          <div className="reveal border-t border-border pt-14">
            <p className="eyebrow">{ab.archiveSectionEyebrow || "The Archive"}</p>
            <div className="mt-6 max-w-2xl whitespace-pre-line text-sm leading-loose text-muted-foreground">
              {ab.archiveSectionBody ||
                "Every photograph is catalogued with a title, category, event name and date. The collection is organised into four categories — Events, Photoshoots, Red Carpet and Editorial — and can also be browsed by year. New material is added by the archive curators; high-resolution originals are held in secure cloud storage separately from this website."}
            </div>
          </div>

          <div className="reveal grid gap-12 border-t border-border pt-14 md:grid-cols-2">
            <div>
              <p className="eyebrow">{ab.creditsEyebrow || "Credits"}</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {ab.creditsList && ab.creditsList.length > 0 ? (
                  ab.creditsList.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium text-foreground">{item.role}</span> — {item.name}
                    </li>
                  ))
                ) : (
                  <>
                    <li>Photography — individual credits per image</li>
                    <li>Curation — archive team</li>
                    <li>Design &amp; build — archive credit</li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <p className="eyebrow">{siteContent.footer.elsewhereTitle || "Elsewhere"}</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {aboutSocials.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target={link.url.startsWith("http") ? "_blank" : undefined}
                      rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="transition-colors hover:text-foreground"
                    >
                      {link.label || link.platform}
                      {link.username && (
                        <span className="ml-2 text-xs text-muted-foreground/80">
                          ({link.username})
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
