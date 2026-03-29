/**
 * Transform image URLs in HTML content to use the R2 proxy endpoint
 * This allows images from Cloudflare R2 to load even without CORS configured
 */
export function transformImagesToUseProxy(htmlContent: string): string {
  if (!htmlContent) return htmlContent

  // Replace all image src attributes that point to R2 or other HTTPS URLs with proxy URLs
  // Pattern matches: src="https://..." 
  return htmlContent.replace(
    /src="(https:\/\/[^"]+)"/g,
    (match, url) => {
      // Only proxy R2 URLs to avoid unnecessary proxying
      if (url.includes('r2.dev') || url.includes('pub-')) {
        const proxyUrl = `/api/proxy/r2-image?url=${encodeURIComponent(url)}`
        return `src="${proxyUrl}"`
      }
      return match
    }
  )
}
