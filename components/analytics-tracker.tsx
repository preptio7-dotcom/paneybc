'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function AnalyticsTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const lastTracked = useRef<{ path: string; time: number } | null>(null)

    useEffect(() => {
        const logVisit = async () => {
            // Skip admin and secret pages
            if (pathname.startsWith('/admin') || pathname.startsWith('/secret')) return

            // Deduplicate: don't re-track same path within 30 seconds
            if (
                lastTracked.current &&
                lastTracked.current.path === pathname &&
                Date.now() - lastTracked.current.time < 30_000
            ) return

            try {
                const body = {
                    path: pathname,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    // Screen info can be added here if needed
                    screenResolution: `${window.screen.width}x${window.screen.height}`,
                }

                const response = await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }
                lastTracked.current = { path: pathname, time: Date.now() }
            } catch (error) {
                // Silently fail to not interrupt user experience
                console.error('Analytics logging failed:', error)
            }
        }

        logVisit()
    }, [pathname, searchParams])

    return null
}
