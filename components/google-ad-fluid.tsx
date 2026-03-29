'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'

export function GoogleAdFluid({ slot, layoutKey }: { slot: string; layoutKey: string }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { settings, loading } = useSystemSettings()

  const config = settings?.adSenseConfig || {
    globalEnabled: true,
    allowedPaths: ['/', '/blog', '/blog/*'],
    blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
    showAdsToUnpaid: true,
    showAdsToPaid: false,
    showAdsToAmbassador: false,
  }

  const shouldShowAd = !loading && shouldLoadAdsForContext(pathname || '/', user, config)

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
    <div className="my-6 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key={layoutKey}
        data-ad-client="ca-pub-5583540622875378"
        data-ad-slot={slot}
      />
    </div>
  )
}
