-- 1. Allow-list of administrator emails (exactly two accounts)
CREATE TABLE public.admin_emails (
  email text PRIMARY KEY
);

GRANT SELECT ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_emails (email) VALUES
  ('admin@archive.com'),
  ('curator@archive.com');

-- 2. Security-definer helper: is the given user one of the two admins?
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.admin_emails a ON lower(u.email) = lower(a.email)
    WHERE u.id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

CREATE POLICY "Admins can read the allow-list"
  ON public.admin_emails FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Photographs
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  category text NOT NULL DEFAULT 'Editorial',
  event_name text,
  taken_on date,
  description text,
  image_url text NOT NULL,
  width integer,
  height integer,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos are publicly viewable"
  ON public.photos FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert photos"
  ON public.photos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update photos"
  ON public.photos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete photos"
  ON public.photos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER photos_set_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Sample photographs (prototype data, safe to delete later)
INSERT INTO public.photos (title, category, event_name, taken_on, description, image_url, width, height, featured) VALUES
  ('Nocturne', 'Editorial', 'Studio Series 01', '2026-02-14', 'Single-source rim light against pure black.', '/samples/hero.jpg', 1600, 1000, true),
  ('Stillness', 'Photoshoots', 'Monochrome Sessions', '2026-01-09', 'Shot on 35mm, natural window light.', '/samples/p1.jpg', 900, 1200, true),
  ('Arrival', 'Red Carpet', 'Global Film Awards', '2026-03-22', 'Flashbulbs on the carpet.', '/samples/p2.jpg', 1200, 800, true),
  ('Concrete', 'Photoshoots', 'City Editorial', '2025-11-02', 'Hard shadows on a bare wall.', '/samples/p3.jpg', 900, 1350, false),
  ('Between Takes', 'Events', 'Charity Gala', '2025-09-18', 'A candid moment backstage.', '/samples/p4.jpg', 1200, 900, false),
  ('Silk', 'Editorial', 'Motion Study', '2025-07-30', 'Fabric caught mid-air.', '/samples/p5.jpg', 1000, 1250, true),
  ('Rainfall', 'Editorial', 'Night Series', '2025-05-11', 'Neon reflections through glass.', '/samples/p6.jpg', 1400, 800, false),
  ('Close', 'Photoshoots', 'Beauty Sitting', '2024-12-04', 'Minimal beauty portrait.', '/samples/p7.jpg', 1000, 1000, false),
  ('The Award', 'Events', 'Critics Circle Night', '2024-10-19', 'On stage under a single spotlight.', '/samples/p8.jpg', 1200, 850, false),
  ('Tailored', 'Red Carpet', 'Press Junket', '2024-06-27', 'Full-length monochrome study.', '/samples/p9.jpg', 900, 1400, false);