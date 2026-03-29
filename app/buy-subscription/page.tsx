'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import Link from 'next/link'
import { ActiveSubscriptionUI } from '@/components/active-subscription-ui'

type PaymentMethodInfo = {
  id: string
  type: string
  displayName: string
  accountTitle?: string
  accountNumberOrId?: string
  additionalInfo?: any
}

type SubscriptionFormData = {
  plan: 'one_month' | 'lifetime'
  paymentMethodId: string
  paymentProofFile: File | null
  paymentDetails: string
}

// Inner component that uses useSearchParams
function BuySubscriptionContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([])
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PaymentMethodInfo | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [formData, setFormData] = useState<SubscriptionFormData>({
    plan: 'one_month',
    paymentMethodId: '',
    paymentProofFile: null,
    paymentDetails: '',
  })

  // Update plan from search params when component mounts
  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan === 'one_month' || plan === 'lifetime') {
      setFormData(prev => ({ ...prev, plan }))
    }
  }, [searchParams])

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/subscription/payment-methods')
        if (!response.ok) throw new Error('Failed to load payment methods')
        const data = await response.json()
        setPaymentMethods(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, paymentMethodId: data[0].id }))
          setSelectedPaymentDetails(data[0])
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load payment methods',
          variant: 'destructive',
        })
      }
    }

    fetchPaymentMethods()
  }, [toast])

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/auth/login')
    }
    
    // Check if user has active subscription
    const userData = user as any
    if (userData && userData.adsFreeUntil) {
      const adsFreeUntilDate = new Date(userData.adsFreeUntil)
      if (adsFreeUntilDate > new Date()) {
        setHasActiveSubscription(true)
        toast({
          title: '✅ You Already Have an Active Subscription!',
          description: 'Ads are disabled on your account. Enjoy!',
        })
      }
    }
  }, [user, loading, router, toast])

  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId)
    setFormData(prev => ({ ...prev, paymentMethodId: methodId }))
    setSelectedPaymentDetails(method || null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB',
          variant: 'destructive',
        })
        return
      }

      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image (JPG, PNG, WebP) or PDF',
          variant: 'destructive',
        })
        return
      }

      setFormData(prev => ({ ...prev, paymentProofFile: file }))

      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPaymentProofPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPaymentProofPreview(`📄 ${file.name}`)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.paymentMethodId) {
      toast({
        title: 'Missing field',
        description: 'Please select a payment method',
        variant: 'destructive',
      })
      return
    }

    if (!formData.paymentProofFile) {
      toast({
        title: 'Missing file',
        description: 'Please upload proof of payment',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Upload file and create subscription request
      const formDataToSend = new FormData()
      formDataToSend.append('plan', formData.plan)
      formDataToSend.append('paymentMethodId', formData.paymentMethodId)
      formDataToSend.append('paymentProofFile', formData.paymentProofFile)
      formDataToSend.append('paymentDetails', formData.paymentDetails)

      const response = await fetch('/api/subscription/request', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit subscription request')
      }

      toast({
        title: 'Success',
        description: 'Your subscription request has been submitted. Our team will review it shortly.',
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit subscription request',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-light">Loading...</p>
        </div>
      </main>
    )
  }

  if (!user || user.role !== 'student') {
    return null
  }

  const planPrice = formData.plan === 'one_month' ? '200' : '1,200'
  const planDuration = formData.plan === 'one_month' ? '1 Month' : 'Lifetime'

  return (
    <main className="min-h-screen bg-background-light py-6 md:py-12">
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Active Subscription */}
        {hasActiveSubscription && (
          <ActiveSubscriptionUI
            adsFreeUntil={(user as any).adsFreeUntil}
            plan={formData.plan}
            onCancel={() => setHasActiveSubscription(false)}
          />
        )}

        {/* Only show form if no active subscription */}
        {!hasActiveSubscription && (
          <>
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-text-dark mt-4 mb-2">Remove Ads</h1>
              <p className="text-text-light text-sm md:text-base">Complete your subscription to enjoy an ad-free experience</p>
            </div>

        {/* Plan Summary */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <p className="text-sm text-text-light mb-1">Selected Plan</p>
                <h2 className="text-xl md:text-2xl font-bold text-text-dark">
                  {planDuration === 'Lifetime' ? 'Lifetime Premium' : 'Monthly Premium'}
                </h2>
              </div>
              <div className="md:text-right">
                <p className="text-3xl md:text-4xl font-bold text-blue-600">PKR {planPrice}</p>
                <p className="text-xs text-text-light mt-1">{planDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Details</CardTitle>
            <CardDescription>Your information is pre-filled from your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Information - Read Only */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-text-dark mb-4">Your Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-text-light mb-1 block">Username</Label>
                    <Input
                      type="text"
                      value={user.name || ''}
                      disabled
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-text-light mb-1 block">Email</Label>
                    <Input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <Label className="text-base font-semibold text-text-dark mb-4 block">Subscription Duration</Label>
                <RadioGroup value={formData.plan} onValueChange={(value: any) => setFormData(prev => ({ ...prev, plan: value }))}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="one_month" id="plan-monthly" />
                      <Label htmlFor="plan-monthly" className="cursor-pointer flex-1 mb-0">
                        <div className="font-semibold text-text-dark">Monthly (PKR 200)</div>
                        <div className="text-xs text-text-light">Ad-free for 1 month</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border border-emerald-200 rounded-lg hover:bg-emerald-50 cursor-pointer bg-emerald-50">
                      <RadioGroupItem value="lifetime" id="plan-lifetime" />
                      <Label htmlFor="plan-lifetime" className="cursor-pointer flex-1 mb-0">
                        <div className="font-semibold text-text-dark">Lifetime (PKR 1,200)</div>
                        <div className="text-xs text-text-light">Permanent ad-free access</div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Method Selection */}
              <div>
                <Label htmlFor="payment-method" className="text-base font-semibold text-text-dark mb-2 block">
                  Select Payment Method
                </Label>
                <Select value={formData.paymentMethodId} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Choose a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Details */}
              {selectedPaymentDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-text-dark mb-3">Payment Details for {selectedPaymentDetails.displayName}</h4>
                  
                  {selectedPaymentDetails.type === 'nayapay' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Method:</span> Nayapay</p>
                      {selectedPaymentDetails.accountTitle && (
                        <p><span className="font-semibold">Account:</span> {selectedPaymentDetails.accountTitle}</p>
                      )}
                      {selectedPaymentDetails.additionalInfo?.nayapayId && (
                        <p><span className="font-semibold">ID:</span> {selectedPaymentDetails.additionalInfo.nayapayId}</p>
                      )}
                    </div>
                  )}

                  {selectedPaymentDetails.type === 'easypaisa' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Method:</span> Easypaisa</p>
                      {selectedPaymentDetails.accountTitle && (
                        <p><span className="font-semibold">Account:</span> {selectedPaymentDetails.accountTitle}</p>
                      )}
                      {selectedPaymentDetails.accountNumberOrId && (
                        <p><span className="font-semibold">Account Number:</span> {selectedPaymentDetails.accountNumberOrId}</p>
                      )}
                    </div>
                  )}

                  {selectedPaymentDetails.type === 'bank_account' && (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Method:</span> Bank Transfer</p>
                      {selectedPaymentDetails.accountTitle && (
                        <p><span className="font-semibold">Account Title:</span> {selectedPaymentDetails.accountTitle}</p>
                      )}
                      {selectedPaymentDetails.accountNumberOrId && (
                        <p><span className="font-semibold">Account Number:</span> {selectedPaymentDetails.accountNumberOrId}</p>
                      )}
                      {selectedPaymentDetails.additionalInfo?.bankName && (
                        <p><span className="font-semibold">Bank:</span> {selectedPaymentDetails.additionalInfo.bankName}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              <div>
                <Label className="text-base font-semibold text-text-dark mb-2 block">
                  Upload Proof of Payment <span className="text-red-600">*</span>
                </Label>
                <p className="text-xs text-text-light mb-3">
                  Upload a screenshot showing your payment (JPG, PNG, WebP, or PDF). Max 10MB.
                </p>

                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="payment-proof"
                      required
                    />
                    <label htmlFor="payment-proof" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-semibold text-text-dark">Click to upload</p>
                      <p className="text-xs text-text-light">or drag and drop</p>
                    </label>
                  </div>

                  {paymentProofPreview && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {paymentProofPreview.startsWith('data:') ? (
                            <img src={paymentProofPreview} alt="Preview" className="max-w-full h-auto rounded" />
                          ) : (
                            <p className="text-sm text-green-800">{paymentProofPreview}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Details */}
              <div>
                <Label htmlFor="payment-details" className="text-sm font-medium text-text-dark mb-2 block">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="payment-details"
                  placeholder="Any additional details about your payment (reference number, transaction ID, etc.)"
                  value={formData.paymentDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDetails: e.target.value }))}
                  className="min-h-24"
                />
              </div>

              {/* Info Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Verification Required</p>
                  <p>Our admin team will verify your payment and approve your request. You'll be notified once your subscription is active.</p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !formData.paymentProofFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Subscription Request'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-text-light mt-6">
          By submitting, you agree to our terms. Your information is secure and will only be used for subscription verification.
        </p>
          </>
        )}
      </div>
    </main>
  )
}

// Wrapper component with Suspense boundary for useSearchParams
export default function BuySubscriptionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-light">Loading subscription form...</p>
        </div>
      </main>
    }>
      <BuySubscriptionContent />
    </Suspense>
  )
}
