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

    useEffect(() => {
        // Determine if ads should be shown
        let showAd = false
        
        // Fallback config if settings not loaded yet
        const config = settings?.adSenseConfig || {
          globalEnabled: true,
          allowedPaths: ['/', '/blog', '/blog/*'],
          blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
          showAdsToUnpaid: true,
          showAdsToPaid: false,
          showAdsToAmbassador: false,
        }
        
        // Debug logging
        if ((pathname === '/' || pathname?.includes('/blog')) && process.env.NODE_ENV === 'development') {
            console.log('[Adsense Debug]', {
                pathname,
                loading,
                globalEnabled: config.globalEnabled,
                userRole: user?.role,
                studentRole: user?.studentRole,
                userExists: !!user,
            })
        }
        
        if (!loading) {
            showAd = shouldLoadAdsForContext(pathname || '/', user, config)
            if ((pathname === '/' || pathname?.includes('/blog')) && process.env.NODE_ENV === 'development') {
                console.log('[Adsense Debug] shouldShowAd:', showAd)
            }
        }
        
        setShouldShowAd(showAd)
        
        // Push ad to AdSense if enabled
        if (showAd) {
            try {
                // @ts-ignore
                ; (window.adsbygoogle = window.adsbygoogle || []).push({})
            } catch (err) {
                console.error('AdSense push error:', err)
            }
        }
    }, [pathname, loading, settings, user])

    return (
        <div 
            className="max-w-7xl mx-auto px-4 my-8 w-full overflow-hidden text-center" 
            style={{ 
                minHeight: '250px',
                visibility: shouldShowAd ? 'visible' : 'hidden',
                height: shouldShowAd ? 'auto' : '0'
            }}
        >
            <ins
                className="adsbygoogle"
                style={{ display: 'block', margin: '0 auto', width: '100%', minHeight: '250px' }}
                data-ad-client="ca-pub-5583540622875378"
                data-ad-slot="7458772554"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    )
}
