// ── Demo Presets — بيانات القوالب الجاهزة ──
// ثلاثة قوالب متجر كاملة جاهزة للاستخدام الفوري

export const DEMO_PRESETS = {
  clothes: {
    label: '👔 متجر ملابس',
    description: 'قمصان، بناطيل، أحذية مع مقاسات متعددة',
    color: '#7c3aed',
    store: {
      name: 'متجر الأناقة',
      description: '🛍️ أحدث صيحات الموضة والأزياء العصرية — جودة عالية بأسعار مناسبة',
      currency: 'ILS',
    },
    categories: [
      { id: 'cat-1', name: 'قمصان', emoji: '👕' },
      { id: 'cat-2', name: 'بناطيل', emoji: '👖' },
      { id: 'cat-3', name: 'أحذية', emoji: '👟' },
      { id: 'cat-4', name: 'إكسسوارات', emoji: '👜' },
    ],
    products: [
      { id: 'p-1', name: 'قميص قطني كلاسيك', category_id: 'cat-1', price: 89, description: 'قميص قطني 100% بقصة كلاسيكية مريحة', options: ['S', 'M', 'L', 'XL', 'XXL'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80' },
      { id: 'p-2', name: 'قميص أكسفورد أزرق', category_id: 'cat-1', price: 129, description: 'قميص أكسفورد رسمي مثالي للعمل', options: ['S', 'M', 'L', 'XL'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80' },
      { id: 'p-3', name: 'بنطلون جينز سليم', category_id: 'cat-2', price: 149, description: 'جينز سليم فيت بقصة عصرية ومريحة', options: ['28', '30', '32', '34', '36'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80' },
      { id: 'p-4', name: 'حذاء رياضي كاجوال', category_id: 'cat-3', price: 199, description: 'حذاء رياضي خفيف للاستخدام اليومي', options: ['40', '41', '42', '43', '44', '45'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
      { id: 'p-5', name: 'حقيبة جلدية أنيقة', category_id: 'cat-4', price: 249, description: 'حقيبة يد جلد طبيعي بتصميم عصري', options: ['بني', 'أسود', 'عسلي'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
      { id: 'p-6', name: 'حزام جلد كلاسيك', category_id: 'cat-4', price: 65, description: 'حزام جلد أصلي بإبزيم معدني فضي', options: ['S', 'M', 'L'], in_stock: false, is_featured: false, image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&q=80' },
    ],
  },

  cafe: {
    label: '☕ كافيه ومطعم',
    description: 'مشروبات، حلويات، سندويشات مع خيارات الحجم',
    color: '#92400e',
    store: {
      name: 'كافيه الذوق',
      description: '☕ قهوتنا من أجود أنواع البن — حلويات طازجة يومياً',
      currency: 'ILS',
    },
    categories: [
      { id: 'cat-1', name: 'مشروبات ساخنة', emoji: '☕' },
      { id: 'cat-2', name: 'مشروبات باردة', emoji: '🧊' },
      { id: 'cat-3', name: 'حلويات', emoji: '🍰' },
      { id: 'cat-4', name: 'وجبات خفيفة', emoji: '🥪' },
    ],
    products: [
      { id: 'p-1', name: 'قهوة أمريكانو', category_id: 'cat-1', price: 15, description: 'أمريكانو كلاسيك من بن عربي محمص طازج', options: ['صغير', 'وسط', 'كبير'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=400&q=80' },
      { id: 'p-2', name: 'كابتشينو إيطالي', category_id: 'cat-1', price: 20, description: 'كابتشينو كلاسيك بلمسة حليب', options: ['صغير', 'وسط', 'كبير'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1572286258217-215cf8e9b59b?w=400&q=80' },
      { id: 'p-3', name: 'لاتيه سكر بني', category_id: 'cat-1', price: 22, description: 'لاتيه بالحليب المبخر وسكر بني كراميلي', options: ['وسط', 'كبير'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400&q=80' },
      { id: 'p-4', name: 'فرابيه شوكولا', category_id: 'cat-2', price: 25, description: 'فرابيه ثلجي بالشوكولا الداكنة', options: ['وسط', 'كبير'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80' },
      { id: 'p-5', name: 'كيكة تشيز كيك', category_id: 'cat-3', price: 18, description: 'تشيز كيك نيويورك الأصلي بصلصة التوت', options: ['قطعة واحدة', 'قطعتان'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=400&q=80' },
      { id: 'p-6', name: 'كرواسان زبدة', category_id: 'cat-3', price: 12, description: 'كرواسان فرنسي طازج بالزبدة الأصلية', options: ['سادة', 'بالجبن', 'بالنوتيلا'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80' },
      { id: 'p-7', name: 'سندويش كلوب', category_id: 'cat-4', price: 28, description: 'سندويش كلوب ثلاثي مع دجاج مشوي وخضار', options: ['خبز أبيض', 'خبز أسمر', 'خبز توست'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&q=80' },
    ],
  },

  supermarket: {
    label: '🛒 سوبرماركت / بقالة',
    description: 'مياه، عصائر، منتجات يومية بكميات متعددة',
    color: '#065f46',
    store: {
      name: 'ميني ماركت الجوار',
      description: '🛒 كل احتياجاتك اليومية بأسعار منافسة — توصيل سريع',
      currency: 'ILS',
    },
    categories: [
      { id: 'cat-1', name: 'مياه ومشروبات', emoji: '💧' },
      { id: 'cat-2', name: 'ألبان وأجبان', emoji: '🥛' },
      { id: 'cat-3', name: 'خبز ومخبوزات', emoji: '🍞' },
      { id: 'cat-4', name: 'معلبات وجاف', emoji: '🥫' },
    ],
    products: [
      { id: 'p-1', name: 'مياه نبعية 1.5 لتر', category_id: 'cat-1', price: 4, description: 'مياه معدنية طبيعية نقية', options: ['حبة واحدة', 'كرتون 12 حبة'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&q=80' },
      { id: 'p-2', name: 'عصير برتقال طازج', category_id: 'cat-1', price: 8, description: 'عصير برتقال طازج 100% بدون إضافات', options: ['250ml', '500ml', '1 لتر'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80' },
      { id: 'p-3', name: 'حليب طازج كامل الدسم', category_id: 'cat-2', price: 7, description: 'حليب طازج مبستر يومياً', options: ['500ml', '1 لتر'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80' },
      { id: 'p-4', name: 'جبنة بيضاء طازجة', category_id: 'cat-2', price: 12, description: 'جبنة بيضاء طرية طازجة', options: ['250 جرام', '500 جرام'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80' },
      { id: 'p-5', name: 'خبز كماج بلدي', category_id: 'cat-3', price: 5, description: 'خبز بلدي طازج يومياً من الفرن', options: ['ربطة واحدة', 'ربطتان'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80' },
      { id: 'p-6', name: 'معلبة تونا', category_id: 'cat-4', price: 9, description: 'تونا معلبة بالزيت أو المياه', options: ['بالزيت', 'بالمياه'], in_stock: true, is_featured: false, image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80' },
      { id: 'p-7', name: 'أرز بسمتي 1 كيلو', category_id: 'cat-4', price: 14, description: 'أرز بسمتي طويل الحبة فاخر', options: ['1 كيلو', '2 كيلو', '5 كيلو'], in_stock: true, is_featured: true, image_url: 'https://images.unsplash.com/photo-1536304993881-ff86e0c9bf4e?w=400&q=80' },
    ],
  },
}

export const PRESET_KEYS = Object.keys(DEMO_PRESETS)

// ── Legacy exports (for stores compatibility) ──
// Using the café preset as the default demo store

export const DEMO_STORE = {
  id: 'demo-store-001',
  name: 'كافيه الذوق',
  description: '☕ قهوتنا من أجود أنواع البن — حلويات طازجة يومياً',
  slug: 'demo',
  whatsapp: '0599000000',
  country_code: '+970',
  currency: '₪',
  primary_color: '#7c3aed',
  accent_color: '#10B981',
  subscription_status: 'trial',
  trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  is_active: true,
}

export const DEMO_CATEGORIES = DEMO_PRESETS.cafe.categories.map((c, i) => ({
  ...c, store_id: 'demo-store-001', sort_order: i,
}))

export const DEMO_PRODUCTS = DEMO_PRESETS.cafe.products.map((p, i) => ({
  ...p, store_id: 'demo-store-001', is_available: p.in_stock, sort_order: i,
}))

export const DEMO_ORDERS = [
  {
    id: 'demo-order-001',
    order_number: 1001,
    store_id: 'demo-store-001',
    customer_name: 'أحمد محمد',
    customer_phone: '0599123456',
    customer_address: 'رام الله — شارع الإرسال',
    items: [
      { product: { name: 'قهوة أمريكانو', price: 15 }, quantity: 2, option: 'كبير' },
      { product: { name: 'كيكة تشيز كيك', price: 18 }, quantity: 1, option: 'قطعة واحدة' },
    ],
    total: 48,
    status: 'new',
    notes: 'بدون سكر من فضلك',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-order-002',
    order_number: 1002,
    store_id: 'demo-store-001',
    customer_name: 'سارة علي',
    customer_phone: '0598765432',
    customer_address: 'البيرة — حي البالوع',
    items: [
      { product: { name: 'كابتشينو إيطالي', price: 20 }, quantity: 1, option: 'وسط' },
      { product: { name: 'كرواسان زبدة', price: 12 }, quantity: 2, option: 'بالجبن' },
    ],
    total: 44,
    status: 'done',
    notes: '',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
]
