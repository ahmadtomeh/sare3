-- ================================================================
-- FAWRI PLATFORM — ENABLE COMPLETE SUPABASE REALTIME
-- Enables instantaneous WebSocket broadcast on all key tables
-- ================================================================

-- 1. Set replica identity full (needed for update/delete payloads)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.stores REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE public.reviews REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 2. Add all key tables to supabase_realtime publication
DO $$
BEGIN
  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- products
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  -- stores
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  END IF;

  -- categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;

  -- reviews
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reviews'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    END IF;
  END IF;
END $$;
