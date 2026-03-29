'use client'

import { useAuth } from '@/lib/auth-context'
import { Crown, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'

export function PremiumBadge() {
  const { user } = useAuth()
  const { isSubscribed, refreshStatus, isLoading } = useSubscriptionStatus()

  if (!user || user.role !== 'student') {
    return null
  }

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-xs font-semibold text-amber-900">
        <Crown className="w-4 h-4" />
        <span className="hidden sm:inline">Premium</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/buy-subscription" className="hidden sm:inline-block">
        <Button className="text-xs md:text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-3 md:px-4 py-1.5 h-auto rounded-full">
          GO AD'S FREE NOW!
        </Button>
      </Link>
      {/* Subtle refresh button for users waiting for approval */}
      <button
        onClick={() => refreshStatus()}
        disabled={isLoading}
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        title="Refresh subscription status"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

export function PremiumMobileButton() {
  const { user } = useAuth()

  if (!user || user.role !== 'student') {
    return null
  }

  const userData = user as any
  const adsFreeUntil = userData?.adsFreeUntil
  const isSubscribed = adsFreeUntil && new Date(adsFreeUntil) > new Date()

  if (isSubscribed) {
    return (
      <div className="flex md:hidden items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-xs font-semibold text-amber-900">
        <Crown className="w-4 h-4" />
        <span>Premium User</span>
      </div>
    )
  }

  return (
    <Link href="/buy-subscription" className="flex md:hidden w-full">
      <Button className="w-full text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 rounded-lg">
        ⭐ GO AD'S FREE NOW!
      </Button>
    </Link>
  )
}
