'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useEffect } from 'react'

export function Adsense() {
    const pathname = usePathname()
    const { user } = useAuth()
    const { settings, loading } = useSystemSettings()

    if (loading || !settings) return null
    const showAd = shouldLoadAdsForContext(pathname || '/', user, settings.adSenseConfig)

    useEffect(() => {
        if (showAd) {
            try {
                // @ts-ignore
                ; (window.adsbygoogle = window.adsbygoogle || []).push({})
            } catch (err) {
                console.error('AdSense push error:', err)
            }
        }
    }, [pathname, showAd])

    if (!showAd) return null

    return (
        <div className="max-w-7xl mx-auto px-4 my-8 overflow-hidden text-center" style={{ minHeight: '100px' }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block', margin: '0 auto', width: '100%', minWidth: '250px', minHeight: '90px' }}
                data-ad-client="ca-pub-5583540622875378"
                data-ad-slot="7458772554"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    )
}
