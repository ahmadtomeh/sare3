import https from 'https'

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const SUPABASE_URL = 'aewutaqpjigaqpdnfrwu.supabase.co'
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

    const options = {
      hostname: SUPABASE_URL,
      path,
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

// إنشاء SVG يحتوي خلفية ملونة + صورة المتجر — بدون أي library خارجية
function buildIconSvg(base64Image, bgColor, mimeType) {
  const size = 512
  const padding = Math.round(size * 0.1) // 10% padding للـ maskable safe area
  const imgSize = size - padding * 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="0" ry="0"/>
  <image x="${padding}" y="${padding}" width="${imgSize}" height="${imgSize}"
         xlink:href="data:${mimeType};base64,${base64Image}"
         preserveAspectRatio="xMidYMid meet"/>
</svg>`
}

export default async function handler(req, res) {
  const { slug, bg } = req.query

  if (!slug) {
    return res.status(400).send('slug is required')
  }

  try {
    const stores = await supabaseGet(
      `/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=logo_url,primary_color&limit=1`
    )

    const store = Array.isArray(stores) ? stores[0] : null
    const logoUrl = store?.logo_url
    const bgColor = bg || store?.primary_color || '#7c3aed'

    if (!logoUrl) {
      return res.redirect(302, '/icon-192.png')
    }

    // معالجة صورة base64
    if (logoUrl.startsWith('data:')) {
      const [header, base64Data] = logoUrl.split(',')
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png'

      // إنشاء SVG يدمج الخلفية الملونة مع الصورة
      const svg = buildIconSvg(base64Data, bgColor, mimeType)

      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.status(200).send(svg)
    }

    // صورة URL خارجية → إعادة توجيه مباشر
    return res.redirect(302, logoUrl)
  } catch (err) {
    console.error('Store icon error:', err.message)
    return res.redirect(302, '/icon-192.png')
  }
}
