'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'
 
/**
 * Centralized AdSense loader component.
 * Rendered once in the root layout.
 * Only loads the AdSense script on allowed routes for allowed users.
 *
 * FIX: Wait for both auth AND settings to finish loading before deciding.
 * Previously loaded the script while settings were still fetching,
 * which caused Google to show vignette interstitials on all pages
 * for the entire session once the script was loaded even once.
 */
export function AdsLoader() {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading } = useSystemSettings()
 
  // Wait for both to finish before making any decision
  if (authLoading || settingsLoading) return null
 
  const config = settings?.adSenseConfig || {
    globalEnabled: true,
    allowedPaths: ['/', '/blog', '/blog/*'],
    blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
    showAdsToUnpaid: true,
    showAdsToPaid: false,
    showAdsToAmbassador: false,
  }
 
  // Only load the script if ads should actually show on this page for this user
  if (!shouldLoadAdsForContext(pathname || '/', user, config)) {
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