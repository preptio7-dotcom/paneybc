'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function AnalyticsTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        const logVisit = async () => {
            // Don't track admin pages or local dev if desired (uncomment if needed)
            // if (pathname.startsWith('/sKy9108-3~620_admin!')) return

            try {
                const body = {
                    path: pathname,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    // Screen info can be added here if needed
                    screenResolution: `${window.screen.width}x${window.screen.height}`,
                }

                await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
            } catch (error) {
                // Silently fail to not interrupt user experience
                console.error('Analytics logging failed:', error)
            }
        }

        logVisit()
    }, [pathname, searchParams])

    return null
}
