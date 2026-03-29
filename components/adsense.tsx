'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useEffect, useState } from 'react'

export function Adsense() {
    const pathname = usePathname()
    const { user } = useAuth()
    const { settings, loading } = useSystemSettings()
    const [shouldShowAd, setShouldShowAd] = useState(false)
    const [adPushed, setAdPushed] = useState(false)

    // Stage 1: Determine eligibility
    useEffect(() => {
        if (loading) return

        const config = settings?.adSenseConfig || {
            globalEnabled: true,
            allowedPaths: ['/', '/blog', '/blog/*'],
            blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
            showAdsToUnpaid: true,
            showAdsToPaid: false,
            showAdsToAmbassador: false,
        }

        const isEligible = shouldLoadAdsForContext(pathname || '/', user, config)
        setShouldShowAd(isEligible)
        
        // Reset push state if path changes
        setAdPushed(false)
    }, [pathname, loading, settings, user])

    // Stage 2: Inject ad into the rendered slot
    useEffect(() => {
        if (shouldShowAd && !adPushed) {
            try {
                // We use a small timeout to ensure the DOM has actually updated 
                // and the container has non-zero width before AdSense tries to measure it.
                setTimeout(() => {
                    // @ts-ignore
                    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
                    setAdPushed(true)
                }, 100)
            } catch (err) {
                console.error('AdSense push error:', err)
            }
        }
    }, [shouldShowAd, adPushed])

    if (!shouldShowAd) return null

    return (
        <div 
            className="max-w-7xl mx-auto px-4 my-8 w-full overflow-hidden text-center"
        >
            <ins
                className="adsbygoogle"
                data-ad-client="ca-pub-5583540622875378"
                data-ad-slot="7458772554"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    )
}
