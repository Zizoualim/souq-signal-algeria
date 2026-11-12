CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '🛒',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are public" ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  shop_name text NOT NULL,
  price numeric(10,2),
  status text NOT NULL CHECK (status IN ('available','queue','empty')),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  upvotes int NOT NULL DEFAULT 0,
  downvotes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_name_len CHECK (char_length(shop_name) BETWEEN 2 AND 120),
  CONSTRAINT price_positive CHECK (price IS NULL OR (price >= 0 AND price < 10000000))
);
CREATE INDEX reports_created_at_idx ON public.reports (created_at DESC);
GRANT SELECT, INSERT ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are public" ON public.reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add a report" ON public.reports FOR INSERT TO anon, authenticated
  WITH CHECK (upvotes = 0 AND downvotes = 0);

CREATE OR REPLACE FUNCTION public.vote_report(_report_id uuid, _kind text)
RETURNS public.reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.reports;
BEGIN
  IF _kind = 'up' THEN
    UPDATE public.reports SET upvotes = upvotes + 1 WHERE id = _report_id RETURNING * INTO r;
  ELSIF _kind = 'down' THEN
    UPDATE public.reports SET downvotes = downvotes + 1 WHERE id = _report_id RETURNING * INTO r;
  ELSE
    RAISE EXCEPTION 'invalid vote kind';
  END IF;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.vote_report(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_report(uuid, text) TO anon, authenticated;

INSERT INTO public.products (name, icon, sort_order) VALUES
  ('بطاطا', '🥔', 1),
  ('زيت المائدة', '🫒', 2),
  ('حليب الأكياس', '🥛', 3),
  ('سميد', '🌾', 4),
  ('سيولة بريدية', '💵', 5),
  ('دواء مفقود', '💊', 6);

INSERT INTO public.reports (product_id, product_name, shop_name, price, status, latitude, longitude, upvotes, downvotes, created_at)
SELECT p.id, p.name, v.shop, v.price, v.status, v.lat, v.lng, v.up, v.down, now() - (v.mins || ' minutes')::interval
FROM (VALUES
  ('بطاطا', 'سوق باب الواد', 85, 'available', 36.7900, 3.0480, 12, 1, 25),
  ('بطاطا', 'خضار حي بلوزداد', 95, 'queue', 36.7495, 3.0700, 4, 0, 70),
  ('زيت المائدة', 'سوبيرات القبة', 650, 'empty', 36.7270, 3.0820, 2, 6, 15),
  ('زيت المائدة', 'مغازة ديدوش مراد', 640, 'available', 36.7670, 3.0520, 9, 0, 40),
  ('حليب الأكياس', 'حانوت الأبيار', 25, 'queue', 36.7590, 3.0300, 15, 2, 10),
  ('حليب الأكياس', 'عطار حسين داي', 25, 'empty', 36.7380, 3.1000, 1, 8, 120),
  ('سميد', 'مطحنة الحراش', 1100, 'available', 36.7200, 3.1350, 7, 1, 55),
  ('سيولة بريدية', 'مكتب بريد البريد المركزي', NULL, 'queue', 36.7731, 3.0590, 22, 3, 5),
  ('سيولة بريدية', 'مكتب بريد بن عكنون', NULL, 'empty', 36.7560, 3.0050, 3, 11, 30),
  ('دواء مفقود', 'صيدلية ساحة أول ماي', 450, 'available', 36.7600, 3.0610, 6, 0, 90)
) AS v(product, shop, price, status, lat, lng, up, down, mins)
JOIN public.products p ON p.name = v.product;