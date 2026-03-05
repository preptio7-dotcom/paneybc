import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.preptio.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/subjects',
          '/blog',
          '/blog/',
          '/ambassador',
          '/contact',
          '/login',
          '/register',
          '/join-us',
          '/privacy',
          '/terms',
        ],
        disallow: [
          // Admin / superadmin routes
          '/admin',
          '/admin/',
          '/admin/*',
          '/superadmin',
          '/superadmin/',
          '/superadmin/*',
          '/sKy9108-3~620_admin',
          '/sKy9108-3~620_admin/',
          '/sKy9108-3~620_admin/*',

          // Internal/authenticated areas
          '/dashboard',
          '/dashboard/',
          '/dashboard/*',
          '/settings',
          '/settings/',
          '/settings/*',
          '/profile',
          '/profile/',
          '/profile/*',

          // API / internal tools
          '/api',
          '/api/',
          '/api/*',
          '/cron',
          '/cron/',
          '/cron/*',

          // Auth callback/internal auth paths
          '/auth',
          '/auth/',
          '/auth/*',

          // Practice/test internal flows
          '/practice',
          '/practice/',
          '/practice/*',
          '/results',
          '/results/',
          '/results/*',
          '/review',
          '/review/',
          '/review/*',
          '/study-session',
          '/study-session/*',
          '/study-planner',
          '/study-planner/*',
          '/notes',
          '/notes/*',
          '/analytics',
          '/analytics/*',
          '/weak-area',
          '/weak-area/*',
          '/exam-simulator',
          '/exam-simulator/*',
          '/financial-statements',
          '/financial-statements/*',
          '/custom-test',
          '/custom-test/*',
          '/custom-quiz',
          '/custom-quiz/*',
          '/test',
          '/test/*',

          // Staging / test routes
          '/staging',
          '/staging/*',
          '/dev',
          '/dev/*',
        ],
      },
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'BLEXBot', 'DataForSeoBot'],
        disallow: ['/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'cohere-ai',
          'PerplexityBot',
          'Omgilibot',
          'FacebookBot',
          'Diffbot',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
