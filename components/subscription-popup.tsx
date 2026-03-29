'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Zap, X } from 'lucide-react'
import Link from 'next/link'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'

export function SubscriptionPopup() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { isSubscribed } = useSubscriptionStatus()
  const [isOpen, setIsOpen] = useState(false)
  const [hasChecked24h, setHasChecked24h] = useState(false)

  useEffect(() => {
    // Only show to logged-in students (not admin/super_admin)
    if (!loading && user && user.role === 'student' && !hasChecked24h) {
      // Don't show if user already has active subscription
      if (isSubscribed) {
        setHasChecked24h(true)
        return
      }
      
      // Check 24-hour dismiss time
      const lastDismissTime = localStorage.getItem('subscription_popup_last_dismiss')
      if (lastDismissTime) {
        const lastDismiss = new Date(lastDismissTime)
        const now = new Date()
        const hoursSinceDismiss = (now.getTime() - lastDismiss.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceDismiss < 24) {
          setHasChecked24h(true)
          return // Don't show within 24 hours of last dismissal
        }
      }
      
      setHasChecked24h(true)
      
      // Show popup after 3 seconds
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [user, loading, isSubscribed, hasChecked24h])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('subscription_popup_last_dismiss', new Date().toISOString())
  }

  // Close popup when user navigates to subscription page
  useEffect(() => {
    if (pathname === '/buy-subscription') {
      handleClose()
    }
  }, [pathname])

  if (!user || user.role !== 'student') {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-sm md:max-w-lg max-h-[85vh] overflow-hidden rounded-2xl p-0 gap-0 shadow-2xl border-0">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="overflow-y-auto max-h-[85vh] scrollbar-hide">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 pt-8 pb-6 text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Remove Ads & Study Freely</h2>
            <p className="text-blue-100 text-sm">Go premium for an uninterrupted learning experience</p>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <Link href={`/buy-subscription?plan=one_month`} className="block">
                <div className="relative h-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Monthly</h3>
                      <p className="text-xs text-gray-600">1 month of freedom</p>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-text-dark">PKR 200</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">Ad-free browsing</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">All features unlocked</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">Cancel anytime</span>
                      </div>
                    </div>

                    <Button className="w-full text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold group-hover:shadow-md transition-all">
                      Choose Now
                    </Button>
                  </div>
                </div>
              </Link>

              {/* Lifetime Plan */}
              <Link href={`/buy-subscription?plan=lifetime`} className="block">
                <div className="relative h-full p-4 border-2 border-emerald-500 rounded-xl bg-gradient-to-br from-emerald-50 to-transparent hover:shadow-lg transition-all cursor-pointer group">
                  <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Best
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Lifetime</h3>
                      <p className="text-xs text-gray-600">Forever ad-free</p>
                    </div>

                    <div className="border-t border-emerald-200 pt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-emerald-600">PKR 1,200</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">Lifetime access</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">All features forever</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700">One-time payment</span>
                      </div>
                    </div>

                    <Button className="w-full text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold group-hover:shadow-md transition-all">
                      Choose Now
                    </Button>
                  </div>
                </div>
              </Link>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center mb-3">
                ✓ Secure payment via Nayapay, Easypaisa, Bank Transfer
              </p>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-700 hover:bg-gray-100"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
