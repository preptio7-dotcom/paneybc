'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { authHref, safeReturnTo } from '@/lib/auth-redirect'

export function useAuthLinks() {
  const pathname = usePathname()
  const [destination, setDestination] = useState<string | null>(null)
  useEffect(() => {
    const sync = () => setDestination(
      window.location.pathname.startsWith('/community')
        ? window.location.pathname + window.location.search + window.location.hash
        : safeReturnTo(new URLSearchParams(window.location.search).get('returnTo'))
    )
    sync()
    window.addEventListener('popstate', sync)
    window.addEventListener('community:navigate', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('community:navigate', sync)
    }
  }, [pathname])
  return { loginHref: authHref('login', destination), signupHref: authHref('signup', destination) }
}
