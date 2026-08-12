-- إضافة خيار تحويل الطلبات لواتساب أو إتمامها مباشرة في الموقع
-- شغّل هذا في Supabase -> SQL Editor

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS enable_whatsapp_redirect BOOLEAN DEFAULT true;
