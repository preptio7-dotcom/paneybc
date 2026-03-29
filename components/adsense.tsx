'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import Script from 'next/script'
import { useEffect } from 'react'

export function Adsense() {
    const pathname = usePathname()
    const { user } = useAuth()

    const showAd = shouldLoadAdsForContext(pathname || '/', user)

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
            <Script
                id="adsense-loader"
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
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
