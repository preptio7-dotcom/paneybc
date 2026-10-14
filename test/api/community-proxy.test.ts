// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/lib/security-headers', () => ({ applySecurityHeaders: (response: unknown) => response }))
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn() }))
import proxy from '@/proxy'
describe('authentication proxy navigation', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => Response.json({ isMaintenanceMode: false }))))
  afterEach(() => vi.unstubAllGlobals())
  it.each(['login', 'signup'])('lets %s validate an existing cookie instead of forcing the dashboard', async kind => {
    const response = await proxy(new NextRequest(`http://localhost/auth/${kind}?returnTo=%2Fcommunity%3Fthread%3Dold-post`, { headers: { cookie: 'token=possibly-expired' } }))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
  it('preserves the original protected route when authentication is required', async () => {
    const response = await proxy(new NextRequest('http://localhost/dashboard/settings?tab=profile'))
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/auth/login')
    expect(location.searchParams.get('returnTo')).toBe('/dashboard/settings?tab=profile')
  })
})
