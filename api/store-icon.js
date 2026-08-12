// Vercel Serverless Function - Store Icon Proxy
// يُقدِّم أيقونة المتجر كصورة حقيقية من نفس الدومين لاستخدامها في الـ PWA manifest

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(400).send('slug is required')
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aewutaqpjigaqpdnfrwu.supabase.co'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

    // جلب الـ logo من قاعدة البيانات
    const response = await fetch(
      `${supabaseUrl}/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=logo_url&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    const stores = await response.json()
    const logoUrl = stores?.[0]?.logo_url

    if (!logoUrl) {
      // إرجاع الأيقونة الافتراضية
      return res.redirect(302, '/icon-192.png')
    }

    // إذا كانت الصورة base64
    if (logoUrl.startsWith('data:')) {
      const [header, base64Data] = logoUrl.split(',')
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png'
      const buffer = Buffer.from(base64Data, 'base64')

      res.setHeader('Content-Type', mimeType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.status(200).send(buffer)
    }

    // إذا كانت URL خارجية (Supabase Storage) → نعيد التوجيه
    return res.redirect(302, logoUrl)
  } catch (err) {
    console.error('Store icon error:', err)
    return res.redirect(302, '/icon-192.png')
  }
}
