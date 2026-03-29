'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useEffect } from 'react'

/**
 * Google AdSense Ad Unit 1 - Auto Format
 * Responsive ad that adapts to container width
 */
export function GoogleAdUnit1() {
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
    if (!shouldShowAd) return
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [shouldShowAd])

  if (!shouldShowAd) {
    return null
  }

  return (
    <div className="my-6 w-full">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5583540622875378"
        data-ad-slot="7458772554"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  )
}

/**
 * Google AdSense Ad Unit 2 - Fluid Format
 * More vertical/flexible layout
 */
export function GoogleAdUnit2() {
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
    if (!shouldShowAd) return
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [shouldShowAd])

  if (!shouldShowAd) {
    return null
  }

  return (
    <div className="my-6">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-5583540622875378"
        data-ad-slot="8411378687"
      ></ins>
    </div>
  )
}

/**
 * Google AdSense Ad Unit 3 - Auto Format (Duplicate setup for multiple placements)
 */
export function GoogleAdUnit3() {
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
    if (!shouldShowAd) return
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [shouldShowAd])

  if (!shouldShowAd) {
    return null
  }

  return (
    <div className="my-6">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5583540622875378"
        data-ad-slot="7458772554"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  )
}
