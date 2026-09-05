import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/navigation', () => ({
  Navigation: () => <div>Nav</div>,
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

import JoinUsPage from '@/app/join-us/page'

describe('Join Us signup guard modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows non-dismissible signup required prompt for guests', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    render(<JoinUsPage />)

    expect(await screen.findByText('Signup Required')).toBeInTheDocument()
    expect(
      screen.getByText(/Redirecting to signup in 4s/i)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
  })
})

