export function isPdfUrl(rawUrl: string | null | undefined): boolean {
  const source = String(rawUrl || '').trim()
  if (!source) return false
  if (source.startsWith('/api/pdf-proxy')) return true
  try {
    const parsed = new URL(source, 'https://dummy.local')
    const pathname = parsed.pathname.toLowerCase()
    return pathname.endsWith('.pdf') || parsed.searchParams.get('format') === 'pdf'
  } catch {
    return /\.pdf(\?|#|$)/i.test(source)
  }
}

export function getProxyPdfUrl(rawUrl: string | null | undefined): string {
  const source = String(rawUrl || '').trim()
  if (!source) return ''

  if (source.startsWith('/api/pdf-proxy?url=')) return source
  if (/^(data:|blob:)/i.test(source)) return source
  if (!/^https?:\/\//i.test(source)) return source

  return `/api/pdf-proxy?url=${encodeURIComponent(source)}`
}

export function getProxyMediaUrl(rawUrl: string | null | undefined) {
  const source = String(rawUrl || '').trim()
  if (!source) return ''

  if (source.startsWith('/api/proxy/r2-image?url=')) return source
  if (source.startsWith('/api/pdf-proxy?url=')) return source
  if (/^(data:|blob:)/i.test(source)) return source
  if (!/^https?:\/\//i.test(source)) return source

  // If the target is a PDF, use dedicated PDF proxy rather than image proxy
  if (isPdfUrl(source)) {
    return getProxyPdfUrl(source)
  }

  // Use dedicated R2 proxy for Cloudflare R2 images
  if (source.includes('r2.dev') || source.includes('pub-')) {
    return `/api/proxy/r2-image?url=${encodeURIComponent(source)}`
  }

  try {
    const parsed = new URL(source)
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'preptio.com' ||
      host === 'www.preptio.com' ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return source
    }
  } catch {
    return source
  }

  return `/api/pdf-proxy?url=${encodeURIComponent(source)}`
}

export function proxyImageSourcesInHtml(html: string) {
  return String(html || '').replace(
    /(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix: string, src: string, suffix: string) =>
      `${prefix}${getProxyMediaUrl(src)}${suffix}`
  )
}

