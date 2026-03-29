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
  
  if (loading || !settings) return null

  const shouldLoadAdSense = shouldLoadAdsForContext(pathname || '/', user, settings.adSenseConfig)

  if (!shouldLoadAdSense) return null

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
