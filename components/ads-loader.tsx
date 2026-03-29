'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'

import { useSystemSettings } from '@/hooks/use-system-settings'

/**
 * Centatized AdSense loader component.
 * This should be rendered once in the root layout.
 * It dynamically loads the AdSense library only on allowed routes.
 */
export function AdsLoader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { settings, loading } = useSystemSettings()
  
  // Fallback config if settings not loaded yet
  const config = settings?.adSenseConfig || {
    globalEnabled: true,
    allowedPaths: ['/', '/blog', '/blog/*'],
    blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
    showAdsToUnpaid: true,
    showAdsToPaid: false,
    showAdsToAmbassador: false,
  }
  
  // Load script by default - let ad context logic handle visibility
  // Only skip if we explicitly know settings are loaded and ads are disabled
  if (!loading && !shouldLoadAdsForContext(pathname || '/', user, config)) {
    return null
  }

  return (
    <Script
      id="adsense-loader"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
