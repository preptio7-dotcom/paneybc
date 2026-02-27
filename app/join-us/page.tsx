'use client'

import React, { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const makeForm = () => ({
  name: '',
  email: '',
  phone: '',
  institute: '',
  role: '',
  experience: '',
  message: '',
})

export default function JoinUsPage() {
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'ambassador' | 'reviews'>('ambassador')
  const [forms, setForms] = useState({
    ambassador: makeForm(),
    reviews: makeForm(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [redirectInSeconds, setRedirectInSeconds] = useState(4)

  useEffect(() => {
    if (!loading && !user) {
      setShowSignupPrompt(true)
      setRedirectInSeconds(4)
    } else {
      setShowSignupPrompt(false)
    }
  }, [loading, user])

  useEffect(() => {
    if (loading || user || !showSignupPrompt) return

    const countdown = window.setInterval(() => {
      setRedirectInSeconds((prev) => (prev > 1 ? prev - 1 : 1))
    }, 1000)

    const redirectTimer = window.setTimeout(() => {
      window.location.href = '/auth/signup?next=/join-us'
    }, 4000)

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(redirectTimer)
    }
  }, [loading, user, showSignupPrompt])

  const handleChange = (type: 'ambassador' | 'reviews', name: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [name]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    const formData = forms[activeTab]
    if (!formData.name || !formData.email) {
      toast({ title: 'Missing info', description: 'Name and email are required.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/join-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, ...formData }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit')

      toast({ title: 'Thanks!', description: 'We received your request and will contact you soon.' })
      setForms((prev) => ({ ...prev, [activeTab]: makeForm() }))
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Submission failed.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const current = forms[activeTab]

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

  const isBlocked = !user

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-bold text-text-dark">Join Us</h1>
          <p className="text-text-light max-w-2xl">
            Help Preptio grow by becoming a brand ambassador or sharing honest reviews.
          </p>
        </div>

        {isBlocked ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Sign Up Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-text-light">
              <p>Join Us forms are available only for signed-up users.</p>
              <p>Please create an account first, then come back to submit your request.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'ambassador' | 'reviews')}>
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="ambassador">Brand Ambassador</TabsTrigger>
              <TabsTrigger value="reviews">Review</TabsTrigger>
            </TabsList>

            <TabsContent value="ambassador">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Be a Brand Ambassador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <Input value={current.name} onChange={(e) => handleChange('ambassador', 'name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" value={current.email} onChange={(e) => handleChange('ambassador', 'email', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input value={current.phone} onChange={(e) => handleChange('ambassador', 'phone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Institute/University</label>
                      <Input value={current.institute} onChange={(e) => handleChange('ambassador', 'institute', e.target.value)} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Why do you want to represent Preptio?</label>
                      <Textarea value={current.message} onChange={(e) => handleChange('ambassador', 'message', e.target.value)} />
                    </div>
                  </div>
                  <Button className="bg-primary-green hover:bg-primary-green/90" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Submit'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Share Reviews & Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <Input value={current.name} onChange={(e) => handleChange('reviews', 'name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" value={current.email} onChange={(e) => handleChange('reviews', 'email', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input value={current.phone} onChange={(e) => handleChange('reviews', 'phone', e.target.value)} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Your Review</label>
                      <Textarea value={current.message} onChange={(e) => handleChange('reviews', 'message', e.target.value)} />
                    </div>
                  </div>
                  <Button className="bg-primary-green hover:bg-primary-green/90" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Submit'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        )}

        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-heading text-2xl font-bold text-text-dark">Why Join Preptio?</h2>
          <p className="text-text-light mt-2">
            You will help shape the future of CA prep, get early access to features, and be part of a growing community.
          </p>
        </div>
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
              You need to create an account before using the Join Us page. Redirecting to signup in {redirectInSeconds}s.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => (window.location.href = '/auth/login')}>
              Login
            </Button>
            <Button onClick={() => (window.location.href = '/auth/signup')}>
              Signup First
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
