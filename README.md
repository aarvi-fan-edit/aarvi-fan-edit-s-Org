# The Archive — a celebrity photography archive

A dark, cinematic photography archive website with a public gallery and a private
admin area for exactly two curators.

---

## How to run it

The project runs automatically in Lovable's preview. To run it on your own machine:

```bash
bun install     # or: npm install
bun run dev     # or: npm run dev
```

Then open http://localhost:8080

---

## What each part does

| Path                                  | What it is                                                |
| ------------------------------------- | --------------------------------------------------------- |
| `src/routes/index.tsx`                | Home page — hero, featured photographs, latest collection |
| `src/routes/archive.tsx`              | Masonry gallery with category/year filters and search     |
| `src/routes/about.tsx`                | Editorial About page (biography placeholder, credits)     |
| `src/routes/auth.tsx`                 | Private sign-in page for curators                         |
| `src/routes/_authenticated/route.tsx` | Gate — anything inside requires a signed-in user          |
| `src/routes/_authenticated/admin.tsx` | `/admin` dashboard: upload, edit, delete photographs      |
| `src/components/site/`                | Reusable pieces: header, footer, photo grid, lightbox     |
| `src/lib/archive.ts`                  | Data types, category list, database queries, helpers      |
| `src/styles.css`                      | The entire design system (colours, fonts, motion)         |

### Design system

All colours, typography and animation live in `src/styles.css` as tokens.
Components never hard-code colours — they use `bg-background`, `text-accent`,
`font-display`, and so on. Change the look of the whole site by editing that
one file.

---

## The backend (Lovable Cloud)

**`photos` table** — one row per photograph: title, category, event name, date,
description, image URL, featured flag.

**`admin_emails` table** — the allow-list of administrator email addresses. It
currently contains two placeholder addresses:

- `admin@archive.com`
- `curator@archive.com`

**Change these to your real addresses**, then create those two accounts in the
Users section of the Cloud dashboard. Nobody else can manage the archive.

**Storage** — a private `photos` bucket holds uploaded image files. Only
administrators can write to it.

### Security model

Security does **not** rely on hiding the `/admin` page:

- Row-level security on `photos` allows everyone to _read_, but only accounts on
  the allow-list to insert, update or delete — enforced by the database, so
  calling the API directly from outside the site changes nothing.
- Storage upload/delete is restricted the same way.
- No secret keys exist in the frontend code. The only key shipped to the browser
  is the public/publishable key, which is designed to be public.

---

## Prototype vs production-ready

**Production-ready**

- Authentication and authorisation (database-enforced)
- Database schema, filters, search, lightbox, responsive layout
- Upload / edit / delete flow, storage bucket

**Prototype / to replace later**

- The ten sample photographs in `public/samples/` (delete them and the matching
  rows once you upload real work)
- Placeholder biography, credits and social links on the About page
- Uploaded files are displayed through long-lived signed URLs. For a large
  production archive, put a CDN in front of storage and generate a smaller
  thumbnail alongside each original.

---

## Performance notes

- Gallery images are lazy-loaded (`loading="lazy"`), except the first few.
- `sizes` hints let the browser pick an appropriate image width.
- Animations are pure CSS transitions triggered by an IntersectionObserver — no
  animation library, very little JavaScript.
- The masonry layout uses CSS columns, so there is no layout maths at runtime.
