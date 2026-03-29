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

    // Don't render anything while loading
    if (authLoading || loading) return null

    const config = settings?.adSenseConfig || {
        globalEnabled: true,
        allowedPaths: ['/', '/blog', '/blog/*'],
        blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
        showAdsToUnpaid: true,
        showAdsToPaid: false,
        showAdsToAmbassador: false,
    }

    const shouldShowAd = shouldLoadAdsForContext(pathname || '/', user, config)
    
    if (!shouldShowAd) return null

    // Inject ad into the rendered slot
    useEffect(() => {
        try {
            // @ts-ignore
            ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch (err) {
            console.error('AdSense push error:', err)
        }
    }, [shouldShowAd])

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
