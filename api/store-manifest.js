// Vercel Serverless Function - Dynamic Store Manifest
// يُولِّد manifest خاص بكل متجر بدون data: URI لضمان تثبيت PWA بدون شارة Chrome

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(400).json({ error: 'slug is required' })
  }

  try {
    // جلب بيانات المتجر من Supabase (anon key عام ومحمي بـ RLS)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aewutaqpjigaqpdnfrwu.supabase.co'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

    const response = await fetch(
      `${supabaseUrl}/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=name,logo_url,primary_color,slug,description&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    const stores = await response.json()
    const store = stores?.[0]

    const storeName = store?.name || 'المتجر'
    const storeDesc = store?.description || `تسوق من ${storeName} واطلب منتجاتك مباشرة عبر الواتساب`
    const themeColor = store?.primary_color || '#7c3aed'
    // نستخدم الـ store-icon endpoint من نفس الدومين بدلاً من URL خارجي
    const iconUrl = store ? `/api/store-icon?slug=${encodeURIComponent(slug)}` : '/icon-192.png'

    const manifest = {
      name: storeName,
      short_name: storeName,
      description: storeDesc,
      start_url: `/${slug}`,
      scope: `/${slug}`,
      display: 'standalone',
      background_color: '#0d0d12',
      theme_color: themeColor,
      orientation: 'portrait-primary',
      lang: 'ar',
      dir: 'rtl',
      gcm_sender_id: '103953800507',
      icons: [
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    }

    res.setHeader('Content-Type', 'application/manifest+json')
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(manifest)
  } catch (err) {
    console.error('Manifest generation error:', err)
    // Fallback manifest
    return res.status(200).json({
      name: 'المتجر',
      short_name: 'المتجر',
      start_url: `/${slug}`,
      scope: `/${slug}`,
      display: 'standalone',
      background_color: '#0d0d12',
      theme_color: '#7c3aed',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }],
    })
  }
}
