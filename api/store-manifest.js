import https from 'https'

// استخدام https المدمج في Node.js بدلاً من fetch لضمان التوافق
function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const SUPABASE_URL = 'aewutaqpjigaqpdnfrwu.supabase.co'
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

    const options = {
      hostname: SUPABASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve([]) }
      })
    })

    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')) })
    req.end()
  })
}

export default async function handler(req, res) {
  const { slug, dashboard, subdomain } = req.query
  const isDashboard = dashboard === '1'
  const isSubdomain = subdomain === '1'

  if (!slug) {
    return res.status(400).json({ error: 'slug is required' })
  }

  try {
    const stores = await supabaseGet(
      `/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=name,logo_url,primary_color,description&limit=1`
    )

    const store = Array.isArray(stores) ? stores[0] : null

    const storeName = store?.name || 'المتجر'
    const storeDesc = isDashboard
      ? `إدارة متجر ${storeName} — الطلبات والمنتجات والإعدادات`
      : (store?.description || `تسوق من ${storeName} واطلب منتجاتك مباشرة عبر الواتساب`)
    const themeColor = store?.primary_color || '#7c3aed'
    const iconUrl = store ? `/api/store-icon?slug=${encodeURIComponent(slug)}` : '/icon-192.png'

    // وضع لوحة التاجر: start_url = /dashboard بدلاً من صفحة المتجر
    // أما بالنسبة للمتجر على نطاق فرعي (subdomain)، الـ start_url والـ scope يكونان "/" لأن المتجر هو كامل الموقع هناك
    const startUrl = isDashboard 
      ? '/dashboard' 
      : (isSubdomain ? '/' : `/${slug}`)
      
    const scope    = isDashboard 
      ? '/' 
      : (isSubdomain ? '/' : `/${slug}`)

    const manifest = {
      name: isDashboard ? `إدارة ${storeName}` : storeName,
      short_name: isDashboard ? storeName : storeName,
      description: storeDesc,
      start_url: startUrl,
      scope: scope,
      display: 'standalone',
      background_color: themeColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      lang: 'ar',
      dir: 'rtl',
      gcm_sender_id: '103953800507',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: iconUrl, sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
        { src: iconUrl, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
      ],
    }

    res.setHeader('Content-Type', 'application/manifest+json')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(manifest)
  } catch (err) {
    console.error('Manifest error:', err.message)
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
