'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Zap } from 'lucide-react'
import Link from 'next/link'

export function SubscriptionPopup() {
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [hasSeenPopup, setHasSeenPopup] = useState(false)

  useEffect(() => {
    // Only show to registered users (not admin/super_admin)
    if (!loading && user && user.role === 'student' && !hasSeenPopup) {
      // Check if they already have ads disabled
      const adsFreeUntil = (user as any).adsFreeUntil
      if (adsFreeUntil && new Date(adsFreeUntil) > new Date()) {
        return // Don't show if they already have subscription
      }
      
      // Check if they've dismissed this session
      const sessionDismissed = sessionStorage.getItem('subscription_popup_dismissed')
      if (!sessionDismissed) {
        // Show popup after 5 seconds
        const timer = setTimeout(() => {
          setIsOpen(true)
          setHasSeenPopup(true)
        }, 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [user, loading, hasSeenPopup])

  const handleClose = () => {
    setIsOpen(false)
    sessionStorage.setItem('subscription_popup_dismissed', 'true')
  }

  if (!user || user.role !== 'student') {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Go Ad-Free with Premium</DialogTitle>
          <DialogDescription>
            Choose your preferred subscription plan and enjoy an uninterrupted learning experience
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Monthly Plan */}
          <Card className="relative p-6 border-2 hover:border-blue-500 transition-colors">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text-dark">Monthly Plan</h3>
                <p className="text-sm text-text-light mt-1">One month of ad-free learning</p>
              </div>

              <div className="py-4 border-y">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-dark">PKR 200</span>
                  <span className="text-text-light">/month</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Ad-free for 1 month</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Full access to all features</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Cancel anytime</span>
                </div>
              </div>

              <Link href={`/buy-subscription?plan=one_month`} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Choose Plan
                </Button>
              </Link>
            </div>
          </Card>

          {/* Lifetime Plan */}
          <Card className="relative p-6 border-2 border-emerald-500 hover:border-emerald-600 transition-colors bg-gradient-to-br from-emerald-50 to-transparent">
            <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Best Value
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text-dark">Lifetime Plan</h3>
                <p className="text-sm text-text-light mt-1">Permanent ad-free access</p>
              </div>

              <div className="py-4 border-y">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-emerald-600">PKR 1,200</span>
                  <span className="text-text-light text-sm">/one-time</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Lifetime ad-free access</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Full access to all features</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">One-time payment, never expires</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-dark">Save PKR 2,400+ over time</span>
                </div>
              </div>

              <Link href={`/buy-subscription?plan=lifetime`} className="block">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Choose Plan
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-text-light">
            Secure payment via Nayapay, Easypaisa, or Bank Transfer
          </p>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-text-light hover:text-text-dark"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
