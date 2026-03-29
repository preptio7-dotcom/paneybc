import { useEffect } from 'react'

/**
 * Auto-update detector component
 * Registers service worker and checks for new builds
 * Forces refresh when a new version is detected
 */
export function AutoUpdateDetector() {
  useEffect(() => {
    // Register service worker for cache management
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration)

          // Check for updates every 30 seconds
          setInterval(() => {
            registration.update()
          }, 30000)

          // When a new service worker becomes active, reload the page
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                console.log('[App] New build detected! Reloading...')
                // Reload silently without notifying the user
                window.location.reload()
              }
            })
          })
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error)
        })
    }

    // Also check for new builds via a version endpoint (optional fallback)
    const checkBuildVersion = async () => {
      try {
        const response = await fetch('/api/build-version', {
          headers: { 'Cache-Control': 'no-cache' }
        })
        const { version } = await response.json()
        const storedVersion = sessionStorage.getItem('build-version')

        if (storedVersion && storedVersion !== version) {
          console.log('[App] New build detected via version check! Reloading...')
          window.location.reload()
        }

        sessionStorage.setItem('build-version', version)
      } catch (error) {
        console.error('[App] Failed to check build version:', error)
      }
    }

    checkBuildVersion()
    // Check every 2 minutes
    const interval = setInterval(checkBuildVersion, 120000)

    return () => clearInterval(interval)
  }, [])

  return null
}
