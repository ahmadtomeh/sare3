/**
 * توليد رابط المتجر الرسمي المعتمد (Subdomain)
 * يضمن إرجاع https://store-slug.fawri.shop بدلاً من المسار القديم
 */
export function getStoreUrl(slug) {
  if (!slug) return ''

  if (typeof window === 'undefined') {
    return `https://${slug}.fawri.shop`
  }

  const hostname = window.location.hostname

  // إذا كنا على بيئة تطوير محلية (localhost)
  if (hostname.includes('localhost')) {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${window.location.protocol}//${slug}.localhost${port}`
  }

  // إذا كنا على بيئة فحص Vercel Preview
  if (hostname.includes('vercel.app')) {
    return `${window.location.origin}/${slug}`
  }

  // في الإنتاج على النطاق الرسمي فوري
  return `https://${slug}.fawri.shop`
}
