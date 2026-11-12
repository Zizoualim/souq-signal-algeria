/*
# Create products and reports tables (single-tenant, no auth)

1. New Tables
- `products`: catalog of goods users can report on
  - `id` (uuid, primary key)
  - `name` (text, unique, not null)
  - `icon` (text, emoji shown on the map)
  - `sort_order` (integer, ordering in the picker)
- `reports`: community reports about product availability
  - `id` (uuid, primary key)
  - `product_id` (uuid, references products)
  - `product_name` (text, denormalized for display)
  - `shop_name` (text)
  - `price` (numeric, nullable, in DZD)
  - `status` (text: available | queue | empty)
  - `latitude`, `longitude` (double precision)
  - `upvotes`, `downvotes` (integer, vote counters)
  - `created_at` (timestamptz)
2. Functions
- `vote_report(report_id, kind)`: atomically increments upvotes/downvotes and
  returns the new counters; rejects invalid kinds.
3. Security
- Enable RLS on both tables.
- Grant SELECT on products; SELECT/INSERT on reports; both to anon + authenticated
  (no sign-in in this app, data is intentionally public/shared).
- Policies: public read on both, public insert on reports. Vote counters are only
  mutated through the vote_report RPC, never direct UPDATE.
4. Realtime
- Add products and reports to the supabase_realtime publication so map clients
  receive live INSERT/UPDATE/DELETE events.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '🛒',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  shop_name text NOT NULL,
  price numeric(10, 2),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'queue', 'empty')),
  latitude double precision NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude double precision NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_product_id_idx ON reports (product_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON products TO anon, authenticated;

GRANT SELECT, INSERT ON reports TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_reports" ON reports;
CREATE POLICY "public_read_reports" ON reports
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_reports" ON reports;
CREATE POLICY "public_insert_reports" ON reports
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION vote_report(_report_id uuid, _kind text)
RETURNS reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated reports;
BEGIN
  IF _kind NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'invalid vote kind';
  END IF;

  UPDATE reports
  SET upvotes = upvotes + CASE WHEN _kind = 'up' THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN _kind = 'down' THEN 1 ELSE 0 END
  WHERE id = _report_id
  RETURNING * INTO updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found';
  END IF;

  RETURN updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION vote_report(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION vote_report(uuid, text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
