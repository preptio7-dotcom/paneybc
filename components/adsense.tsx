'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useEffect } from 'react'

export function Adsense() {
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

    const shouldShowAd = shouldLoadAdsForContext(pathname || '/', user, config)

    // ✅ FIX: useEffect is now above ALL early returns
    // Previously it was after `if (authLoading || loading) return null`
    // and `if (!shouldShowAd) return null` — causing React error #310
    useEffect(() => {
        if (authLoading || loading || !shouldShowAd) return
        try {
            // @ts-ignore
            ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch (err) {
            console.error('AdSense push error:', err)
        }
    }, [shouldShowAd, authLoading, loading])

    // Early returns AFTER all hooks
    if (authLoading || loading) return null
    if (!shouldShowAd) return null

    return (
        <div
            className="mx-auto px-4 my-8 w-full overflow-hidden text-center"
            style={{ maxWidth: '728px' }}
        >
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-5583540622875378"
                data-ad-slot="7458772554"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    )
}