-- جدول اشتراكات Push للزبائن (تتبع الطلبات)
-- شغّل هذا في Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS customer_push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL,
  order_number    INT,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  vapid_public_key  TEXT NOT NULL,
  vapid_private_key TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- فهرس سريع للبحث عبر order_id
CREATE INDEX IF NOT EXISTS idx_cps_order_id ON customer_push_subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_cps_store_id  ON customer_push_subscriptions(store_id);

-- صلاحيات RLS: الكل يقدر يدرج ويُحدّث لكن لا يقرأ بيانات الآخرين
ALTER TABLE customer_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers can insert their own subscription"
  ON customer_push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "customers can update their own subscription"
  ON customer_push_subscriptions FOR UPDATE
  USING (true);

-- Service role فقط يقدر يقرأ (Edge Functions)
CREATE POLICY "service role can read all"
  ON customer_push_subscriptions FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "service role can delete expired"
  ON customer_push_subscriptions FOR DELETE
  USING (auth.role() = 'service_role');
