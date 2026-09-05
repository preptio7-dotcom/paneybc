import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/admin-header', () => ({
  AdminHeader: () => <div>Admin Header</div>,
}))

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}))

import AdminBetaFeaturesPage from '@/app/admin/beta-features/page'

describe('Admin Beta Features Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads settings and saves updated beta visibility', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          testSettings: { betaFeatures: { faq: 'public' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    vi.stubGlobal('fetch', fetchMock)

    render(<AdminBetaFeaturesPage />)

    expect(await screen.findByText('Beta Features')).toBeInTheDocument()
    expect(await screen.findByText('Public')).toBeInTheDocument()

    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)
    fireEvent.click(screen.getByRole('button', { name: 'Save Beta Settings' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const postCall = fetchMock.mock.calls[1]
    expect(postCall[0]).toContain('/api/admin/system/settings')
    expect(postCall[1]?.method).toBe('POST')
    expect(postCall[1]?.body).toContain('"faq":"beta_ambassador"')
  })
})

