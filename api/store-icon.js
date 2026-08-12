import https from 'https'

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
  const { slug } = req.query

  if (!slug) {
    return res.status(400).send('slug is required')
  }

  try {
    const stores = await supabaseGet(
      `/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=logo_url&limit=1`
    )

    const logoUrl = Array.isArray(stores) ? stores[0]?.logo_url : null

    if (!logoUrl) {
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

    // إذا كانت URL خارجية → إعادة توجيه
    return res.redirect(302, logoUrl)
  } catch (err) {
    console.error('Store icon error:', err.message)
    return res.redirect(302, '/icon-192.png')
  }
}
