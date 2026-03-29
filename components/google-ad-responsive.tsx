'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'

export function GoogleAdResponsive({ slot }: { slot: string }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { settings, loading } = useSystemSettings()

  const config = settings?.adSenseConfig || {
    globalEnabled: true,
    allowedPaths: ['/', '/blog', '/blog/*'],
    blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
    showAdsToUnpaid: true,
    showAdsToPaid: false,
    showAdsToAmbassador: false,
  }

  const shouldShowAd = !loading && !authLoading && shouldLoadAdsForContext(pathname || '/', user, config)

  useEffect(() => {
    if (!shouldShowAd) {
      return
    }

    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [pathname, user, loading, shouldShowAd])

  if (!shouldShowAd) {
    return null
  }

  return (
    <div className="my-6 w-full flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5583540622875378"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
