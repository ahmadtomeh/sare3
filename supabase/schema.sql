-- ================================================================
-- SARE3 / سريع — Supabase Database Schema
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

-- ── Subscriptions / License Keys ──────────────────────────────
CREATE TABLE IF NOT EXISTS license_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL,  -- monthly | yearly
  duration_days INTEGER NOT NULL,
  used_by     UUID REFERENCES stores(id),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

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

-- Stores: Owners can manage their own store
CREATE POLICY "owners_manage_store" ON stores
  FOR ALL USING (owner_id = auth.uid());

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
