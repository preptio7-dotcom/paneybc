// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { authDestination, authHref, safeReturnTo } from '@/lib/auth-redirect'
import { communityText, pagination } from '@/lib/community-input'
import { renderCommunityMarkdown } from '@/lib/community-markdown'

describe('authentication return destinations', () => {
  it('preserves the exact discussion and feed context through login/signup', () => {
    const destination = '/community?thread=old-post&sort=top&category=accounting&page=3#comment-12'
    for (const kind of ['login', 'signup'] as const) {
      const url = new URL(authHref(kind, destination), 'https://preptio.com')
      expect(authDestination(url.search)).toBe(destination)
    }
  })
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/%2fexample.com', '/%255cevil.test', '/%0a/evil.test', '/auth/login', '/a/../auth/signup', '/api/auth/logout', ' /community', '/%zz'])('rejects unsafe destination %s', value => {
    expect(safeReturnTo(value)).toBeNull()
    expect(authDestination(`?${new URLSearchParams({ returnTo: value })}`)).toBe('/dashboard')
  })
  it('retains established defaults without a return destination', () => {
    expect(authDestination('')).toBe('/dashboard')
    expect(authDestination('', 'admin')).toBe('/admin')
    expect(authHref('signup')).toBe('/auth/signup')
  })
})

describe('community content and pagination', () => {
  it('preserves working, paragraphs, and lists while stripping unsafe control characters', () => {
    expect(communityText('First\r\n\r\n- Second\u0000', true)).toBe('First\n\n- Second')
    expect(communityText('Title\nline')).toBe('Title line')
  })
  it.each(['page=NaN', 'page=0', 'page=1.1', 'limit=Infinity', 'limit=101', 'page=-1'])('rejects malformed pagination %s', query => expect(pagination(new URLSearchParams(query), 50, 100)).toBeNull())
  it('renders safe multiline Markdown without reprocessing generated links', () => {
    const html = renderCommunityMarkdown('# Working\n\n**Profit**\n- Revenue\n- Costs\n\n<script>alert(1)</script>\n[x](javascript:alert(1))')
    expect(html).toContain('<h2>Working</h2>')
    expect(html).toContain('<ul><li>Revenue</li><li>Costs</li></ul>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('href="javascript:')
    expect(renderCommunityMarkdown('[A & B](https://example.com/?a=1&b=2)')).toContain('href="https://example.com/?a=1&amp;b=2"')
    expect(renderCommunityMarkdown('```\n<img src=x onerror=alert(1)>\n```')).toContain('&lt;img')
  })
})
