// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      count: vi.fn().mockResolvedValue(5420),
    },
  },
}))

import { GET } from '@/app/llms.txt/route'

describe('GET /llms.txt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('complies with llmstxt.org and Lighthouse Agentic Browsing standards', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const contentType = response.headers.get('Content-Type')
    expect(contentType).toContain('text/markdown')

    const body = await response.text()

    // 1. Must contain an H1 header (# Title)
    expect(body.startsWith('# Preptio')).toBe(true)

    // 2. Must contain markdown links (- [Title](URL))
    const markdownLinkRegex = /- \[[^\]]+\]\([^)]+\)/
    expect(markdownLinkRegex.test(body)).toBe(true)

    // 3. Must link key public pages including institutions
    expect(body).toContain('[Homepage](https://www.preptio.com)')
    expect(body).toContain('[Institutions & Faculty](https://www.preptio.com/institutions)')
    expect(body).toContain('[About Us](https://www.preptio.com/about)')
    expect(body).toContain('[Subjects & Curriculum](https://www.preptio.com/subjects)')
    expect(body).toContain('[Blog & Study Guides](https://www.preptio.com/blog)')
  })
})
