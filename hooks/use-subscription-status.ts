import { useAuth } from '@/lib/auth-context'
import { useEffect, useState, useCallback } from 'react'

/**
 * Hook to track and refresh subscription status from the server
 * Auto-refreshes when page becomes visible (tab focus)
 */
export function useSubscriptionStatus() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subscription/status', {
        method: 'POST',
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        setIsSubscribed(data.isSubscribed)
        return data
      }
    } catch (error) {
      console.error('Failed to refresh subscription status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set initial state from user data
  useEffect(() => {
    if (!user) {
      setIsSubscribed(false)
      return
    }

    const userData = user as any
    const adsFreeUntil = userData?.adsFreeUntil
    const hasSubscription = adsFreeUntil && new Date(adsFreeUntil) > new Date()
    setIsSubscribed(hasSubscription)
  }, [user])

  // Auto-refresh when page becomes visible (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus()
      }
    }

    // Also refresh on mount to get fresh data
    refreshStatus()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshStatus])

  return { isSubscribed, refreshStatus, isLoading }
}
