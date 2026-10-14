import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

import { HomeFaqSection } from '@/components/home-faq-section'

describe('Home FAQ visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides beta FAQ for non-ambassador users', async () => {
    mockUseAuth.mockReturnValue({
      user: { studentRole: 'unpaid' },
      loading: false,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          testSettings: {
            betaFeatures: { faq: 'beta_ambassador' },
            faq: {
              items: [],
            },
          },
        }),
      })
    )

    render(<HomeFaqSection />)

    await waitFor(() => {
      expect(screen.queryByText('Frequently Asked Questions')).not.toBeInTheDocument()
    })
  })

  it('shows beta FAQ for ambassadors', async () => {
    mockUseAuth.mockReturnValue({
      user: { studentRole: 'ambassador' },
      loading: false,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          testSettings: {
            betaFeatures: { faq: 'beta_ambassador' },
            faq: {
              items: [{ question: 'What is Preptio?', answer: 'Practice platform.' }],
            },
          },
        }),
      })
    )

    render(<HomeFaqSection />)

    expect(await screen.findByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(await screen.findByText('Beta')).toBeInTheDocument()
  })
})

