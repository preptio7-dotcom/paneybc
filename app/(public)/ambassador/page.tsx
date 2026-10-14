'use client'

import React, { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

type AmbassadorForm = {
  name: string
  email: string
  phone: string
  institute: string
  socialMediaPresence: string
  studentGroups: string
  personalReferrals: string
  whyAmbassador: string
  promotionPlan: string
  expectedReturn: string
  agreeProfessional: boolean
  agreeRemovalPolicy: boolean
}

const initialForm: AmbassadorForm = {
  name: '',
  email: '',
  phone: '',
  institute: '',
  socialMediaPresence: '',
  studentGroups: '',
  personalReferrals: '',
  whyAmbassador: '',
  promotionPlan: '',
  expectedReturn: '',
  agreeProfessional: false,
  agreeRemovalPolicy: false,
}

export default function JoinUsPage() {
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const [formData, setFormData] = useState<AmbassadorForm>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [showAlreadyAmbassadorPrompt, setShowAlreadyAmbassadorPrompt] = useState(false)
  const [redirectInSeconds, setRedirectInSeconds] = useState(4)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setShowSignupPrompt(true)
      setShowAlreadyAmbassadorPrompt(false)
      setRedirectInSeconds(4)
      return
    }

    if (user.studentRole === 'ambassador') {
      setShowSignupPrompt(false)
      setShowAlreadyAmbassadorPrompt(true)
      return
    }

    setShowSignupPrompt(false)
    setShowAlreadyAmbassadorPrompt(false)
  }, [loading, user])

  useEffect(() => {
    if (loading || user || !showSignupPrompt) {
      if (showSignupPrompt && user) {
        setShowSignupPrompt(false)
      }
      return
    }

    const countdown = window.setInterval(() => {
      setRedirectInSeconds((prev) => (prev > 1 ? prev - 1 : 1))
    }, 1000)

    const redirectTimer = window.setTimeout(() => {
      window.location.href = '/auth/signup?next=/ambassador'
    }, 4000)

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(redirectTimer)
    }
  }, [loading, user, showSignupPrompt])

  useEffect(() => {
    if (!user) return

    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
    }))

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) return
        const data = await response.json()
        const profile = data?.user || {}
        setFormData((prev) => ({
          ...prev,
          name: prev.name || String(profile.name || user.name || '').trim(),
          email: prev.email || String(profile.email || user.email || '').trim(),
          phone: prev.phone || String(profile.phone || '').trim(),
          institute: prev.institute || String(profile.institute || '').trim(),
        }))
      } catch {
        // ignore, keep auth defaults
      }
    }

    loadProfile()
  }, [user])

  const handleFieldChange = (name: keyof AmbassadorForm, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = () => {
    const requiredTextFields: Array<keyof AmbassadorForm> = [
      'name',
      'email',
      'phone',
      'institute',
      'socialMediaPresence',
      'studentGroups',
      'personalReferrals',
      'whyAmbassador',
      'promotionPlan',
      'expectedReturn',
    ]

    const missingField = requiredTextFields.find((field) => !String(formData[field]).trim())
    if (missingField) {
      toast({
        title: 'Missing info',
        description: 'Please answer all required questions before submitting.',
        variant: 'destructive',
      })
      return false
    }

    if (!formData.agreeProfessional || !formData.agreeRemovalPolicy) {
      toast({
        title: 'Agreement required',
        description: 'Please accept both agreement checkboxes to continue.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const detailedMessage = [
        'Ambassador Application Details:',
        `Do you have any social media presence? ${formData.socialMediaPresence.trim()}`,
        `Are you part of CA student WhatsApp/Facebook groups? ${formData.studentGroups.trim()}`,
        `Do you know other CA students personally for referrals? ${formData.personalReferrals.trim()}`,
        `Why do you want to become a Preptio Ambassador? ${formData.whyAmbassador.trim()}`,
        `How do you plan to promote Preptio? ${formData.promotionPlan.trim()}`,
        `What do you expect in return? ${formData.expectedReturn.trim()}`,
        `Agreement - represent professionally and honestly: ${formData.agreeProfessional ? 'Yes' : 'No'}`,
        `Agreement - removal if guidelines not followed: ${formData.agreeRemovalPolicy ? 'Yes' : 'No'}`,
      ].join('\n\n')

      const response = await fetch('/api/join-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ambassador',
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          institute: formData.institute.trim(),
          role: formData.socialMediaPresence.trim(),
          experience: formData.studentGroups.trim(),
          message: detailedMessage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit')

      toast({ title: 'Application submitted', description: 'Thanks! We will review and contact you soon.' })
      setFormData((prev) => ({
        ...initialForm,
        name: user?.name || '',
        email: user?.email || '',
        phone: prev.phone,
        institute: prev.institute,
      }))
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Submission failed.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light">
        <Navigation />
        <div className="pt-24 pb-16 px-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-green" size={32} />
        </div>
      </div>
    )
  }

  const isAlreadyAmbassador = Boolean(user && user.studentRole === 'ambassador')
  const isBlocked = !user || isAlreadyAmbassador

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-bold text-text-dark">Ambassador</h1>
          <p className="text-text-light max-w-3xl">
            Earn rewards by spreading the word - Join the Preptio Ambassador Program
          </p>
        </div>

        {isBlocked ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{isAlreadyAmbassador ? 'Already an Ambassador' : 'Sign Up Required'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-text-light">
              {isAlreadyAmbassador ? (
                <>
                  <p>Your account already has ambassador access.</p>
                  <p>This application page is only for users who are not ambassadors yet.</p>
                </>
              ) : (
                <>
                  <p>Ambassador applications are available only for signed-up users.</p>
                  <p>Please create an account first, then come back to submit your application.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Preptio Ambassador Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Full Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Institute *</label>
                  <Input
                    value={formData.institute}
                    onChange={(e) => handleFieldChange('institute', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Do you have any social media presence? If yes, which platforms and how many followers?
                    (Instagram / TikTok / YouTube / Facebook) *
                  </label>
                  <Textarea
                    value={formData.socialMediaPresence}
                    onChange={(e) => handleFieldChange('socialMediaPresence', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Are you part of any CA student WhatsApp or Facebook groups? If yes, how many and approximately how many members? *
                  </label>
                  <Textarea
                    value={formData.studentGroups}
                    onChange={(e) => handleFieldChange('studentGroups', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Do you know other CA students personally who you could refer to Preptio? *
                  </label>
                  <Textarea
                    value={formData.personalReferrals}
                    onChange={(e) => handleFieldChange('personalReferrals', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Why do you want to become a Preptio Ambassador? (Short answer) *
                  </label>
                  <Textarea
                    value={formData.whyAmbassador}
                    onChange={(e) => handleFieldChange('whyAmbassador', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    How do you plan to promote Preptio to other CA students? (Short answer) *
                  </label>
                  <Textarea
                    value={formData.promotionPlan}
                    onChange={(e) => handleFieldChange('promotionPlan', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    What do you expect in return for being an ambassador? (Short answer) *
                  </label>
                  <Textarea
                    value={formData.expectedReturn}
                    onChange={(e) => handleFieldChange('expectedReturn', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 bg-slate-50 space-y-3">
                <h3 className="text-sm font-semibold text-text-dark">Agreement</h3>
                <label className="flex items-start gap-2 text-sm text-text-light">
                  <input
                    type="checkbox"
                    checked={formData.agreeProfessional}
                    onChange={(e) => handleFieldChange('agreeProfessional', e.target.checked)}
                    required
                  />
                  <span>I agree to represent Preptio professionally and honestly</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-text-light">
                  <input
                    type="checkbox"
                    checked={formData.agreeRemovalPolicy}
                    onChange={(e) => handleFieldChange('agreeRemovalPolicy', e.target.checked)}
                    required
                  />
                  <span>I understand that Preptio can remove my ambassador status if guidelines are not followed</span>
                </label>
              </div>

              <Button className="bg-primary-green hover:bg-primary-green/90" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Submit Ambassador Application'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showSignupPrompt} onOpenChange={() => undefined}>
        <DialogContent
          className="bg-white max-w-md [&>button]:hidden"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Signup Required</DialogTitle>
            <DialogDescription>
              You need to create an account before using the Ambassador page. Redirecting to signup in {redirectInSeconds}s.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => (window.location.href = '/auth/login')}>
              Login
            </Button>
            <Button onClick={() => (window.location.href = '/auth/signup?next=/ambassador')}>
              Signup First
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAlreadyAmbassadorPrompt} onOpenChange={() => undefined}>
        <DialogContent
          className="bg-white max-w-md [&>button]:hidden"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Already an Ambassador</DialogTitle>
            <DialogDescription>
              Your account is already marked as ambassador, so this page is not available for you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => (window.location.href = '/dashboard')}>
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
