import { NextResponse } from 'next/server'

function getBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://preptio.com'
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
}

export async function GET() {
  const baseUrl = getBaseUrl()

  const content = [
    '# Preptio',
    '',
    '> Public site map for LLM and crawler consumption.',
    '> Only public, non-authenticated pages should be indexed.',
    '',
    '## Public Pages',
    `${baseUrl}/`,
    `${baseUrl}/about`,
    `${baseUrl}/subjects`,
    `${baseUrl}/blog`,
    `${baseUrl}/ambassador`,
    `${baseUrl}/contact`,
    `${baseUrl}/join-us`,
    `${baseUrl}/privacy`,
    `${baseUrl}/terms`,
    '',
    '## Public Content Collections',
    `${baseUrl}/blog/[slug]`,
    '',
    '## Disallowed',
    `${baseUrl}/admin`,
    `${baseUrl}/sKy9108-3~620_admin`,
    `${baseUrl}/api`,
    `${baseUrl}/dashboard`,
    `${baseUrl}/auth`,
    `${baseUrl}/practice`,
    `${baseUrl}/results`,
    `${baseUrl}/review`,
    `${baseUrl}/study-session`,
    `${baseUrl}/study-planner`,
    `${baseUrl}/notes`,
    `${baseUrl}/analytics`,
    '',
    '## Machine-Readable Maps',
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/robots.txt`,
  ].join('\n')

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
