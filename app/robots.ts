import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.preptio.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/signup',
          '/auth/login',
          '/auth/signup',
          '/ambassador',
          '/subjects/BAEIVII',
          '/subjects/BAEIV2E',
          '/subjects/QAFB',
          '/subjects/FOA',
          '/feedback',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
