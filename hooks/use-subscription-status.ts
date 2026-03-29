import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'

/**
 * Hook to periodically refresh subscription status from the server
 * and update the auth context
 */
export function useSubscriptionStatus() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const refreshStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subscription/status', {
        method: 'POST',
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
  }

  // Auto-refresh when user data changes or page becomes visible
  useEffect(() => {
    if (!user) return

    const userData = user as any
    const adsFreeUntil = userData?.adsFreeUntil
    setIsSubscribed(adsFreeUntil && new Date(adsFreeUntil) > new Date())

    // Refresh when page becomes visible (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  return { isSubscribed, refreshStatus, isLoading }
}
