export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  username?: string;
  showInAbout: boolean;
  showInFooter: boolean;
}

export interface SiteCredit {
  id: string;
  role: string;
  name: string;
}

export interface SiteContent {
  brand: {
    name: string;
    tagline: string;
    copyrightText: string;
    disclaimerText: string;
  };
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    heroButtonText: string;
    heroImageUrl: string;
    heroImageAlt: string;
    featuredSectionEyebrow: string;
    featuredSectionTitle: string;
    latestSectionEyebrow: string;
    latestSectionTitle: string;
    latestSectionButtonText: string;
    showViewAllButton?: boolean;
    collectionsMaxCount?: number;
  };
  archive: {
    pageTitle: string;
    cataloguedLabel: string;
    searchPlaceholder: string;
    emptyMessage: string;
  };
  about: {
    pageTitle: string;
    displayHeading: string;
    biographyEyebrow: string;
    biographyHeadline: string;
    biographyBody: string;
    archiveSectionEyebrow: string;
    archiveSectionBody: string;
    creditsEyebrow: string;
    creditsList: SiteCredit[];
    aboutImageUrl: string;
    aboutImageAlt: string;
  };
  footer: {
    description: string;
    navigateTitle: string;
    elsewhereTitle: string;
    copyrightYear: string;
    contactInfo: string;
  };
  socialLinks: SocialLink[];
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: "AARVI",
    tagline: "Photography — 2024 to 2026",
    copyrightText: "All photographs are rights reserved.",
    disclaimerText: "Images shown are placeholders for the prototype.",
  },
  homepage: {
    heroTitle: "The Archive",
    heroSubtitle: "Photography — 2024 to 2026",
    heroDescription:
      "A permanent record of AARVI's work in front of the camera — editorial sittings, festival arrivals and quiet moments between takes.",
    heroButtonText: "Explore Archive",
    heroImageUrl: "/samples/hero.jpg",
    heroImageAlt: "AARVI photographed in a darkened studio",
    featuredSectionEyebrow: "Selected",
    featuredSectionTitle: "Featured Photographs",
    latestSectionEyebrow: "Curated",
    latestSectionTitle: "Collections",
    latestSectionButtonText: "VIEW ALL",
    showViewAllButton: true,
    collectionsMaxCount: 6,
  },
  archive: {
    pageTitle: "Archive",
    cataloguedLabel: "photographs catalogued",
    searchPlaceholder: "Search title, event or year",
    emptyMessage: "No photographs match this selection.",
  },
  about: {
    pageTitle: "About",
    displayHeading: "AARVI",
    biographyEyebrow: "Biography",
    biographyHeadline:
      "A short biography goes here — a few sentences on the work, the years covered and why this archive exists.",
    biographyBody:
      "Replace this placeholder text with the real biography. Two or three paragraphs usually reads best on an editorial page like this one: an introduction, a note on notable work, and a closing line about the archive itself.",
    archiveSectionEyebrow: "The Archive",
    archiveSectionBody:
      "Every photograph is catalogued with a title, category, event name and date. The collection is organised into four categories — Events, Photoshoots, Red Carpet and Editorial — and can also be browsed by year. New material is added by the archive curators; high-resolution originals are held in secure cloud storage separately from this website.",
    creditsEyebrow: "Credits",
    creditsList: [
      { id: "credit-1", role: "Photography", name: "individual credits per image" },
      { id: "credit-2", role: "Curation", name: "archive team" },
      { id: "credit-3", role: "Design & build", name: "placeholder credit" },
    ],
    aboutImageUrl: "",
    aboutImageAlt: "About AARVI archive",
  },
  footer: {
    description:
      "A curated photographic archive. Every frame catalogued by event, date and collection.",
    navigateTitle: "Navigate",
    elsewhereTitle: "Elsewhere",
    copyrightYear: "2026",
    contactInfo: "press@archive.com",
  },
  socialLinks: [
    {
      id: "social-instagram",
      platform: "Instagram",
      label: "Instagram",
      url: "https://instagram.com/aarvifanedits",
      username: "@aarvifanedits",
      showInAbout: true,
      showInFooter: true,
    },
    {
      id: "social-x",
      platform: "X",
      label: "X",
      url: "https://x.com",
      username: "@aarvi",
      showInAbout: true,
      showInFooter: true,
    },
    {
      id: "social-press",
      platform: "Press enquiries",
      label: "Press enquiries",
      url: "mailto:press@archive.com",
      username: "press@archive.com",
      showInAbout: true,
      showInFooter: true,
    },
  ],
};

export const siteContentQueryKey = ["site-content"] as const;

export async function fetchSiteContent(): Promise<SiteContent> {
  try {
    const res = await fetch("/api/site-content", { cache: "no-store" });
    if (!res.ok) {
      return DEFAULT_SITE_CONTENT;
    }
    const data = (await res.json()) as Partial<SiteContent>;
    return {
      ...DEFAULT_SITE_CONTENT,
      ...data,
      brand: { ...DEFAULT_SITE_CONTENT.brand, ...(data.brand || {}) },
      homepage: { ...DEFAULT_SITE_CONTENT.homepage, ...(data.homepage || {}) },
      archive: { ...DEFAULT_SITE_CONTENT.archive, ...(data.archive || {}) },
      about: {
        ...DEFAULT_SITE_CONTENT.about,
        ...(data.about || {}),
        creditsList: data.about?.creditsList || DEFAULT_SITE_CONTENT.about.creditsList,
      },
      footer: { ...DEFAULT_SITE_CONTENT.footer, ...(data.footer || {}) },
      socialLinks: data.socialLinks || DEFAULT_SITE_CONTENT.socialLinks,
    };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}
