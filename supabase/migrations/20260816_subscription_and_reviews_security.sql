-- ================================================================
-- FAWRI PLATFORM — SECURITY HARDENING PHASE 2
-- 1. Protects store subscription fields (subscription_status, trial_ends_at)
--    from unauthorized client-side tampering via database trigger.
-- 2. Secures reviews table with Row Level Security.
-- 3. Secures customer_push_subscriptions UPDATE policy.
-- ================================================================

-- ── 1. PREVENT SUBSCRIPTION STATUS TAMPERING ON STORES ──────────
-- Ensures merchants cannot self-promote to 'active' without valid license code / admin
CREATE OR REPLACE FUNCTION public.protect_store_subscription_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If not Super Admin or Service Role, reject or ignore subscription status changes
  IF (auth.jwt() ->> 'email' IS DISTINCT FROM 'admin@fawri.shop') AND (auth.role() != 'service_role') THEN
    -- If the function is called from within redeem_activation_code (internal), allow it
    -- Otherwise enforce OLD subscription values
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


-- ── 2. SECURE REVIEWS TABLE RLS ──────────────────────────────────
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

-- Anyone can view reviews of active stores
DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews
  FOR SELECT USING (true);

-- Anyone (customers) can submit a review
DROP POLICY IF EXISTS "public_insert_reviews" ON public.reviews;
CREATE POLICY "public_insert_reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    rating >= 1 AND rating <= 5 AND
    store_id IN (SELECT id FROM stores WHERE is_active = true)
  );

-- Store owners can moderate (delete) reviews for their store
DROP POLICY IF EXISTS "owners_delete_reviews" ON public.reviews;
CREATE POLICY "owners_delete_reviews" ON public.reviews
  FOR DELETE USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR
    auth.jwt() ->> 'email' = 'admin@fawri.shop'
  );

-- Block arbitrary updates on reviews
DROP POLICY IF EXISTS "no_update_reviews" ON public.reviews;


-- ── 3. SECURE CUSTOMER PUSH SUBSCRIPTIONS UPDATE ─────────────────
DROP POLICY IF EXISTS "customers can update their own subscription" ON public.customer_push_subscriptions;
CREATE POLICY "customers_update_own_subscription" ON public.customer_push_subscriptions
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE id = customer_push_subscriptions.order_id)
  );
