/*
# GuardPay AI — Settings, Merchants, and Purchase Proposals

1. New Tables
- `guardpay_settings` (single row): `max_budget` numeric, `updated_at` timestamptz
- `allowed_merchants`: `id`, `name` (text, unique), `category` (text), `created_at`
- `purchase_proposals`: `id`, `item` (text), `price` (numeric), `merchant` (text),
  `status` (text: Approved/Blocked/Pending), `created_at`, `reason` (text nullable)

2. Security
- All tables are single-tenant (no auth requested). Enable RLS and grant CRUD to anon + authenticated.
- Policies allow anon + authenticated full CRUD since the data is intentionally shared/public.
*/

CREATE TABLE IF NOT EXISTS guardpay_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_budget numeric NOT NULL DEFAULT 5000,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guardpay_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON guardpay_settings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_settings" ON guardpay_settings;
CREATE POLICY "anon_select_settings" ON guardpay_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON guardpay_settings;
CREATE POLICY "anon_insert_settings" ON guardpay_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON guardpay_settings;
CREATE POLICY "anon_update_settings" ON guardpay_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON guardpay_settings;
CREATE POLICY "anon_delete_settings" ON guardpay_settings FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS allowed_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allowed_merchants ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON allowed_merchants TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_merchants" ON allowed_merchants;
CREATE POLICY "anon_select_merchants" ON allowed_merchants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_merchants" ON allowed_merchants;
CREATE POLICY "anon_insert_merchants" ON allowed_merchants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_merchants" ON allowed_merchants;
CREATE POLICY "anon_update_merchants" ON allowed_merchants FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_merchants" ON allowed_merchants;
CREATE POLICY "anon_delete_merchants" ON allowed_merchants FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS purchase_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  price numeric NOT NULL,
  merchant text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_proposals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_proposals TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_proposals" ON purchase_proposals;
CREATE POLICY "anon_select_proposals" ON purchase_proposals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_proposals" ON purchase_proposals;
CREATE POLICY "anon_insert_proposals" ON purchase_proposals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_proposals" ON purchase_proposals;
CREATE POLICY "anon_update_proposals" ON purchase_proposals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_proposals" ON purchase_proposals;
CREATE POLICY "anon_delete_proposals" ON purchase_proposals FOR DELETE
  TO anon, authenticated USING (true);

-- Seed single settings row
INSERT INTO guardpay_settings (max_budget)
SELECT 5000
WHERE NOT EXISTS (SELECT 1 FROM guardpay_settings);

-- Seed allowed merchants
INSERT INTO allowed_merchants (name, category)
VALUES
  ('Amazon', 'General'),
  ('Staples', 'Office'),
  ('Best Buy', 'Electronics'),
  ('Newegg', 'Electronics'),
  ('Uline', 'Office')
ON CONFLICT (name) DO NOTHING;

-- Seed sample purchase proposals
INSERT INTO purchase_proposals (item, price, merchant, status, reason)
VALUES
  ('Dell UltraSharp 27" Monitor', 549.99, 'Best Buy', 'Approved', 'Within budget and from allowed merchant'),
  ('Logitech MX Master 3S Mouse', 99.99, 'Amazon', 'Approved', 'Within budget and from allowed merchant'),
  ('Office Chair - Ergonomic', 389.00, 'Staples', 'Pending', NULL),
  ('NVIDIA RTX 4090 GPU', 1599.99, 'Newegg', 'Blocked', 'Exceeds per-item budget threshold'),
  ('A4 Paper Box (5000 sheets)', 44.99, 'Uline', 'Approved', 'Within budget and from allowed merchant'),
  ('iPhone 15 Pro', 1099.00, 'Amazon', 'Pending', NULL),
  ('Standing Desk Converter', 219.00, 'Staples', 'Approved', 'Within budget and from allowed merchant'),
  ('Server Rack 12U', 699.00, 'Uline', 'Blocked', 'Merchant not in allowed list'),
  ('Wireless Keyboard', 59.99, 'Amazon', 'Pending', NULL),
  ('4K Webcam', 129.99, 'Best Buy', 'Approved', 'Within budget and from allowed merchant')
ON CONFLICT DO NOTHING;
