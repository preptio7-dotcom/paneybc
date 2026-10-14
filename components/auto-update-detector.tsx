'use client'

import { useEffect } from 'react'

/**
 * Auto-update detector component
 * Registers service worker and checks for new builds
 * Forces refresh when a new version is detected (only after user has been on page for 10+ seconds)
 */
export function AutoUpdateDetector() {
  useEffect(() => {
    let pageLoadTime = Date.now()
    const MIN_TIME_BEFORE_RELOAD = 10000 // Wait 10 seconds before allowing reloads

    // Register service worker for cache management
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration)

          // Check for updates - but less aggressively
          const updateCheckInterval = setInterval(() => {
            registration.update().catch((error) => {
              console.error('[App] Error checking for updates:', error)
            })
          }, 60000) // Check every 60 seconds instead of 30

          return () => clearInterval(updateCheckInterval)
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error)
        })
    }

    // Check for new builds via a version endpoint (optional fallback)
    const checkBuildVersion = async () => {
      try {
        // Only attempt reload if page has been loaded for more than 10 seconds
        const timeSinceLoad = Date.now() - pageLoadTime
        if (timeSinceLoad < MIN_TIME_BEFORE_RELOAD) {
          return
        }

        const response = await fetch('/api/build-version', {
          headers: { 'Cache-Control': 'no-cache' }
        })
        const { version } = await response.json()
        const storedVersion = sessionStorage.getItem('build-version')

        if (storedVersion && storedVersion !== version) {
          console.log('[App] New build detected! Version updated in storage')
          sessionStorage.setItem('build-version', version)
        } else if (!storedVersion) {
          sessionStorage.setItem('build-version', version)
        }
      } catch (error) {
        console.error('[App] Failed to check build version:', error)
      }
    }

    checkBuildVersion()
    // Check every 3 minutes instead of 2
    const interval = setInterval(checkBuildVersion, 180000)

    return () => clearInterval(interval)
  }, [])

  return null
}
