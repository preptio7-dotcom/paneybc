'use client'

import { useEffect } from 'react'

export function PWARegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        navigator.serviceWorker.register('/sw.js').then(
            async (registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope)

                // Register Background Sync if supported
                if ('sync' in registration) {
                    try {
                        await (registration as any).sync.register('preptio-sync')
                    } catch {
                        // Background sync registration not granted/supported in current context
                    }
                }

                // Register Periodic Background Sync if supported
                if ('periodicSync' in registration) {
                    try {
                        const status = await (navigator as any).permissions?.query({
                            name: 'periodic-background-sync',
                        })
                        if (status?.state === 'granted') {
                            await (registration as any).periodicSync.register('preptio-daily-sync', {
                                minInterval: 24 * 60 * 60 * 1000,
                            })
                        }
                    } catch {
                        // Periodic sync not granted or unsupported
                    }
                }
            },
            (err) => {
                console.log('ServiceWorker registration failed: ', err)
            }
        )
    }, [])

    return null
}
