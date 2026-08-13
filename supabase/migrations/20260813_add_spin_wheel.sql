-- إضافة إعدادات عجلة الحظ والجوائز لجدول المتاجر
-- شغّل هذا الأسلوب في Supabase -> SQL Editor

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS enable_spin_wheel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wheel_min_amount NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS wheel_prizes JSONB DEFAULT '[
  {"id": "p1", "label": "خصم 10%", "type": "percentage", "value": 10, "code": "SPIN10", "color": "#8B5CF6", "weight": 25},
  {"id": "p2", "label": "خصم 5 ₪", "type": "fixed", "value": 5, "code": "SPIN5", "color": "#10B981", "weight": 25},
  {"id": "p3", "label": "شحن مجاني 🚚", "type": "free_shipping", "value": 0, "code": "FREESHIP", "color": "#F59E0B", "weight": 15},
  {"id": "p4", "label": "هدية مع الطلب 🎁", "type": "gift", "value": 0, "code": "GIFT", "color": "#EC4899", "weight": 15},
  {"id": "p5", "label": "حظاً أوفر 🍀", "type": "no_win", "value": 0, "code": "", "color": "#6B7280", "weight": 20}
]'::jsonb;
