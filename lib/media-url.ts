export function getProxyMediaUrl(rawUrl: string | null | undefined) {
  const source = String(rawUrl || '').trim()
  if (!source) return ''

  if (source.startsWith('/api/proxy/r2-image?url=')) return source
  if (source.startsWith('/api/pdf-proxy?url=')) return source
  if (/^(data:|blob:)/i.test(source)) return source
  if (!/^https?:\/\//i.test(source)) return source

  // Use dedicated R2 proxy for Cloudflare R2 URLs
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

