-- ================================================================
-- FAWRI PLATFORM — MASTER SECURITY HARDENING SCRIPT
-- All typecasts (UUID / TEXT) are explicitly resolved.
-- ================================================================

-- ── 1. ACTIVATION CODES SECURITY & RPC ────────────────────────────
DROP POLICY IF EXISTS "auth_read_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "auth_update_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "admin_read_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "admin_manage_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "admin_insert_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "admin_delete_codes" ON public.activation_codes;
DROP POLICY IF EXISTS "admin_all_codes" ON public.activation_codes;

-- Only Super Admins can SELECT / INSERT / UPDATE / DELETE directly on table
CREATE POLICY "admin_all_codes" ON public.activation_codes
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@fawri.shop'
  );

-- Atomic RPC function to redeem license codes safely
CREATE OR REPLACE FUNCTION public.redeem_activation_code(
  input_code TEXT,
  target_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_store_owner UUID;
  v_duration_days INT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  SELECT owner_id INTO v_store_owner FROM stores WHERE id::text = target_store_id::text;
  IF v_store_owner IS NULL OR v_store_owner != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتفعيل هذا المتجر');
  END IF;

  SELECT * INTO v_code_record FROM activation_codes 
  WHERE code = TRIM(input_code) 
  FOR UPDATE;

  IF v_code_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'كود التفعيل غير صحيح — تأكد من كتابته بدقة');
  END IF;

  IF v_code_record.used THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود تم استخدامه مسبقاً');
  END IF;

  IF v_code_record.plan = 'yearly' THEN
    v_duration_days := 365;
  ELSE
    v_duration_days := 30;
  END IF;
  
  v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;

  UPDATE stores 
  SET 
    subscription_status = 'active',
    trial_ends_at = v_expires_at,
    updated_at = NOW()
  WHERE id::text = target_store_id::text;

  UPDATE activation_codes 
  SET 
    used = true,
    used_by = target_store_id,
    used_at = NOW()
  WHERE id = v_code_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'plan', v_code_record.plan,
    'expires_at', v_expires_at
  );
END;
$$;


-- ── 2. PROTECT STORES SUBSCRIPTION FROM CLIENT TAMPERING ─────────
CREATE OR REPLACE FUNCTION public.protect_store_subscription_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() ->> 'email' IS DISTINCT FROM 'admin@fawri.shop') AND (auth.role() != 'service_role') THEN
    IF pg_trigger_depth() <= 1 THEN
      NEW.subscription_status := OLD.subscription_status;
      NEW.trial_ends_at := OLD.trial_ends_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_store_subscription ON public.stores;
CREATE TRIGGER trg_protect_store_subscription
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_subscription_fields();


-- ── 3. ORDERS PRIVACY & DATA LEAK PROTECTION ──────────────────────
DROP POLICY IF EXISTS "public_select_orders" ON public.orders;
DROP POLICY IF EXISTS "owners_manage_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_manage_orders" ON public.orders;
DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "customer_track_order_by_number" ON public.orders;

-- Owners can view & manage their store's orders
CREATE POLICY "owners_manage_orders" ON public.orders
  FOR ALL USING (
    store_id::text IN (SELECT id::text FROM public.stores WHERE owner_id = auth.uid())
  );

-- Super admin can view & manage all orders
CREATE POLICY "admin_manage_orders" ON public.orders
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@fawri.shop'
  );

-- Anyone can insert a new order (guest checkout)
CREATE POLICY "public_insert_orders" ON public.orders
  FOR INSERT WITH CHECK (true);


-- ── 4. MERCHANT PUSH SUBSCRIPTIONS RLS ───────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_push_subs" ON public.push_subscriptions;
CREATE POLICY "public_insert_push_subs" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "owners_manage_push_subs" ON public.push_subscriptions;
CREATE POLICY "owners_manage_push_subs" ON public.push_subscriptions
  FOR ALL USING (
    store_id::text IN (SELECT id::text FROM public.stores WHERE owner_id = auth.uid())
    OR auth.jwt() ->> 'email' = 'admin@fawri.shop'
  );


-- ── 5. REVIEWS TABLE CREATION & RLS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating        INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_insert_reviews" ON public.reviews;
CREATE POLICY "public_insert_reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    rating >= 1 AND rating <= 5 AND
    store_id::text IN (SELECT id::text FROM public.stores WHERE is_active = true)
  );

DROP POLICY IF EXISTS "owners_delete_reviews" ON public.reviews;
CREATE POLICY "owners_delete_reviews" ON public.reviews
  FOR DELETE USING (
    store_id::text IN (SELECT id::text FROM public.stores WHERE owner_id = auth.uid()) OR
    auth.jwt() ->> 'email' = 'admin@fawri.shop'
  );


-- ── 6. CUSTOMER PUSH SUBSCRIPTIONS RLS ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_push_subscriptions') THEN
    ALTER TABLE public.customer_push_subscriptions ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'DROP POLICY IF EXISTS "customers can update their own subscription" ON public.customer_push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "customers_update_own_subscription" ON public.customer_push_subscriptions';
    
    EXECUTE 'CREATE POLICY "customers_update_own_subscription" ON public.customer_push_subscriptions
      FOR UPDATE USING (
        order_id::text IN (SELECT id::text FROM public.orders)
      )';
  END IF;
END $$;
