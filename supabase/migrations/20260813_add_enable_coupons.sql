-- إضافة خيار تفعيل أو إخفاء خانة الكوبون في سلة الشراء
-- شغّل هذا الأسلوب في Supabase -> SQL Editor

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS enable_coupons BOOLEAN DEFAULT true;
