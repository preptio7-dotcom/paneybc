'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface ActiveSubscriptionUIProps {
  adsFreeUntil: string | Date
  plan: 'one_month' | 'lifetime'
  onCancel?: () => void
}

export function ActiveSubscriptionUI({ adsFreeUntil, plan, onCancel }: ActiveSubscriptionUIProps) {
  const { toast } = useToast()
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? Ads will show again.')) {
      return
    }

    try {
      setIsCancelling(true)
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled. You can resubscribe anytime.',
      })

      onCancel?.()
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const adsFreeDate = new Date(adsFreeUntil)
  const daysLeft = Math.ceil((adsFreeDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const planLabel = plan === 'one_month' ? 'Monthly' : 'Lifetime'

  return (
    <div className="space-y-6">
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">
                ✅ Active Subscription
              </h2>
              <p className="text-sm text-green-800 mb-4">
                You have an active {planLabel} subscription. Ads are disabled on your account.
              </p>

              <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Plan:</span>
                  <span className="text-sm font-bold text-gray-900">{planLabel}</span>
                </div>
                {plan === 'one_month' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Days Remaining:</span>
                    <span className="text-sm font-bold text-gray-900">{Math.max(0, daysLeft)} days</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Expires:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {adsFreeDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCancel}
                disabled={isCancelling}
                variant="destructive"
                className="w-full md:w-auto"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
