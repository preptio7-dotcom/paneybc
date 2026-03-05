import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://preptio.com'
  const baseUrl = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Private or internal routes.
          '/admin',
          '/admin/*',
          '/sKy9108-3~620_admin',
          '/sKy9108-3~620_admin/*',
          '/api',
          '/api/*',
          '/dashboard',
          '/dashboard/*',
          '/auth',
          '/auth/*',
          '/login',
          '/register',
          '/results',
          '/results/*',
          '/review',
          '/review/*',
          '/test',
          '/test/*',
          '/custom-test',
          '/custom-test/*',
          '/custom-quiz',
          '/custom-quiz/*',
          '/study-session',
          '/study-planner',
          '/notes',
          '/analytics',
          '/weak-area',
          '/exam-simulator',
          '/financial-statements',
          '/financial-statements/*',
          '/practice',
          '/practice/*',
          '/subjects/*/practice',
          '/subjects/*/test',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
