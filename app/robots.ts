import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://preptio.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/auth',
          '/dashboard',
          '/login',
          '/register',
          '/results',
          '/review',
          '/test',
          '/custom-test',
          '/custom-quiz',
          '/study-session',
          '/study-planner',
          '/notes',
          '/analytics',
          '/weak-area',
          '/exam-simulator',
          '/sKy9108-3~620_admin',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
