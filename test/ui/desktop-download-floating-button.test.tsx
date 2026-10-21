import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DesktopDownloadFloatingButton } from '@/components/desktop-download-floating-button'

describe('DesktopDownloadFloatingButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders floating pill for web browser visitors', () => {
    render(<DesktopDownloadFloatingButton />)
    const button = screen.getByRole('button', { name: /download desktop app/i })
    expect(button).toBeInTheDocument()
    expect(screen.getByText('Download Windows App')).toBeInTheDocument()
  })

  it('expands card on click and displays Microsoft Store links', () => {
    render(<DesktopDownloadFloatingButton />)
    const button = screen.getByRole('button', { name: /download desktop app/i })
    fireEvent.click(button)

    expect(screen.getByText('Get Preptio on Windows')).toBeInTheDocument()
    expect(screen.getByText('Native Windows push notifications')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /microsoft store/i })).toBeInTheDocument()
  })

  it('shows badge on mobile device with PWA standalone mode enabled', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<DesktopDownloadFloatingButton />)
    expect(screen.getByRole('button', { name: /download desktop app/i })).toBeInTheDocument()
  })

  it('automatically hides if user is already running inside Windows desktop app', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { container } = render(<DesktopDownloadFloatingButton />)
    expect(container.firstChild).toBeNull()
  })
})
