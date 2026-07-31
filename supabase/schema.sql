-- ================================================================
-- FAWRI / فوري — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Stores (Tenants) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  banner_url    TEXT,
  whatsapp      TEXT NOT NULL,
  country_code  TEXT DEFAULT '+972',
  currency      TEXT DEFAULT '₪',
  primary_color TEXT DEFAULT '#8B5CF6',
  accent_color  TEXT DEFAULT '#10B981',
  is_active     BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'trial',  -- trial | active | expired
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  emoji      TEXT DEFAULT '📦',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url   TEXT,
  is_available BOOLEAN DEFAULT true,
  options     JSONB DEFAULT '[]',  -- [{label: "المقاس", values: ["S","M","L"]}]
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_number    SERIAL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  customer_address TEXT,
  notes           TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT DEFAULT 'new',  -- new | preparing | out_for_delivery | done | cancelled
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activation Codes (License Keys) ─────────────────────────
CREATE TABLE IF NOT EXISTS activation_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,              -- e.g. SARE-XXXX-XXXX
  plan        TEXT NOT NULL DEFAULT 'monthly',   -- monthly | yearly
  used        BOOLEAN DEFAULT false,
  used_by     UUID REFERENCES stores(id),
  used_at     TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activation Codes RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything (service role bypasses RLS anyway)
-- Authenticated users can read codes to validate them
CREATE POLICY "auth_read_codes" ON activation_codes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can update codes (mark as used)
CREATE POLICY "auth_update_codes" ON activation_codes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Stores: Owners can manage their own store (SELECT, UPDATE, DELETE)
CREATE POLICY "owners_manage_store" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- Stores: Authenticated users can INSERT (create) their own store
CREATE POLICY "authenticated_insert_store" ON stores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Stores: Anyone can read active stores (for customer storefront)
CREATE POLICY "public_read_stores" ON stores
  FOR SELECT USING (is_active = true);

-- Categories: Store owners manage, public can read
CREATE POLICY "owners_manage_categories" ON categories
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
CREATE POLICY "public_read_categories" ON categories
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE is_active = true)
  );

-- Products: Store owners manage, public can read available
CREATE POLICY "owners_manage_products" ON products
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
CREATE POLICY "public_read_products" ON products
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE is_active = true)
  );

-- Orders: Store owners manage their orders
CREATE POLICY "owners_manage_orders" ON orders
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Public can insert orders (guest checkout)
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Public can select orders (needed for order creation returning row & tracking)
CREATE POLICY "public_select_orders" ON orders
  FOR SELECT USING (true);

-- ── Storage Bucket ────────────────────────────────────────────
-- Run this separately in Supabase dashboard → Storage:
-- Create bucket "store-assets" with public access enabled

-- ── Updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Coupons ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID REFERENCES stores(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'percentage',  -- percentage | fixed
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, code)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Drop first to avoid "already exists" errors on re-run
DROP POLICY IF EXISTS "owners_manage_coupons" ON coupons;
DROP POLICY IF EXISTS "public_read_active_coupons" ON coupons;

-- Store owners manage their coupons
CREATE POLICY "owners_manage_coupons" ON coupons
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Anyone (customers) can read active coupons to validate them at checkout
CREATE POLICY "public_read_active_coupons" ON coupons
  FOR SELECT USING (
    is_active = true AND
    store_id IN (SELECT id FROM stores WHERE is_active = true)
  );

CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(store_id, code);

-- ── Extra columns (safe to run even if already exist) ─────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS working_hours_start TEXT DEFAULT '09:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS working_hours_end TEXT DEFAULT '23:00';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS selected_theme TEXT DEFAULT 'neon';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS free_shipping_limit NUMERIC;

-- Product inventory tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT 0;

-- ── Storage Bucket Policies ───────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: "store-assets"
--   Public: YES (check the public box)
-- Then run these policies:

-- Allow authenticated users to upload product images
-- (In Supabase Dashboard → Storage → store-assets → Policies)
-- INSERT Policy: (auth.role() = 'authenticated')
-- SELECT Policy: true  (public read)
-- UPDATE Policy: (auth.uid() IS NOT NULL)
-- DELETE Policy: (auth.uid() IS NOT NULL)

-- ── Push Subscriptions (Web Push Notifications) ───────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   TEXT NOT NULL,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Disable RLS on push_subscriptions so Edge Functions can read push tokens without RLS block
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_subs_store ON push_subscriptions(store_id);
