import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // For HTML pages, prevent caching to ensure latest version is always fetched
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.endsWith('.html')) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  } else if (request.nextUrl.pathname.startsWith('/api/')) {
    // API responses shouldn't be cached
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  } else {
    // Static assets can be cached with long TTL (they have hash in filename)
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except these
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
