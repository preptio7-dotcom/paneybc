'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { STREAK_BADGE_DEFINITIONS, type StreakBadgeType } from '@/lib/streak-badges'

type BadgeProgress = {
  badgeType: StreakBadgeType
  name: string
  description: string
  icon: string
  colorClass: string
  milestoneDays: number
  earned: boolean
  earnedAt: string | null
  seen: boolean
}

export default function DashboardSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [isResetting, setIsResetting] = useState(false)
  const [isResettingNotes, setIsResettingNotes] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'password' | 'otp' | 'confirm'>('password')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteToken, setDeleteToken] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showGoodbye, setShowGoodbye] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [badges, setBadges] = useState<BadgeProgress[]>(
    STREAK_BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      earned: false,
      earnedAt: null,
      seen: true,
    }))
  )

  useEffect(() => {
    const loadBadges = async () => {
      if (!user?.id) return
      try {
        const response = await fetch('/api/user/badges', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data?.badges) && data.badges.length > 0) {
          setBadges(data.badges)
        }
      } catch {
        // ignore
      }
    }
    void loadBadges()
  }, [user?.id])

  useEffect(() => {
    if (!deleteOpen) {
      setDeleteStep('password')
      setDeletePassword('')
      setDeleteOtp('')
      setDeleteToken('')
      setResendCooldown(0)
    }
  }, [deleteOpen])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResetProgress = async () => {
    try {
      setIsResetting(true)
      const response = await fetch('/api/user/reset-progress', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset progress')
      }
      toast({ title: 'Progress reset', description: 'Your progress has been cleared.' })
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to reset progress.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleResetNotes = async () => {
    try {
      setIsResettingNotes(true)
      const response = await fetch('/api/user/reset-notes', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset notes')
      }
      toast({ title: 'Notes cleared', description: 'Your notes and flashcards have been deleted.' })
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to reset notes.',
        variant: 'destructive',
      })
    } finally {
      setIsResettingNotes(false)
    }
  }

  const handleDeleteRequest = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to verify password')
      setDeleteStep('otp')
      toast({ title: 'Verification code sent', description: 'Check your email for the deletion code.' })
    } catch (error: any) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleVerifyDeleteCode = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: deleteOtp }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid code')
      setDeleteToken(data.confirmToken)
      setDeleteStep('confirm')
    } catch (error: any) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResendDeleteCode = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/request', { method: 'PUT' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to resend code')
      setResendCooldown(60)
      toast({ title: 'Code resent', description: 'A new verification code has been sent to your email.' })
    } catch (error: any) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/user/delete/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken: deleteToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete account')
      setDeleteOpen(false)
      setShowGoodbye(true)
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore storage errors
      }
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-green" size={40} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Login required</p>
            <p className="text-text-light text-sm">Please log in to access account settings.</p>
            <Button onClick={() => window.location.assign('/auth/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <Navigation />
      <div className="pt-[74px] pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900">Account & Data</h1>
            <Link href="/dashboard" className="text-sm text-primary-green hover:text-green-700">Back to Dashboard</Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card className="border border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Achievements</h3>
                    <p className="text-sm text-slate-500">Milestone badges earned from your practice streak.</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {badges.filter((badge) => badge.earned).length}/{badges.length}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {badges.map((badge) => {
                    const earnedDate = badge.earnedAt
                      ? new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }).format(new Date(badge.earnedAt))
                      : null
                    return (
                      <div
                        key={badge.badgeType}
                        className={`rounded-xl border p-3 text-center ${badge.earned ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-40'}`}
                        title={badge.earned ? `${badge.name} earned ${earnedDate}` : `${badge.name} unlocks at ${badge.milestoneDays} days`}
                      >
                        <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center text-lg ${badge.earned ? `bg-gradient-to-br ${badge.colorClass} text-white` : 'bg-slate-200 text-slate-500'}`}>
                          {badge.icon}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-800">{badge.name}</p>
                        <p className="text-[11px] text-slate-500">{badge.milestoneDays} days</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">Reset Progress</h3>
                  <p className="text-sm text-slate-500">Clear test history, weak areas, review progress, and streak.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isResetting}>{isResetting ? 'Resetting...' : 'Reset Progress'}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-error-red">Reset all progress?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your test results, review queue, and study sessions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetProgress}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">Clear Notes & Flashcards</h3>
                  <p className="text-sm text-slate-500">Delete all notes and flashcards permanently.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isResettingNotes}>{isResettingNotes ? 'Clearing...' : 'Clear Notes'}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-error-red">Delete notes and flashcards?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetNotes}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">Delete Account</h3>
                  <p className="text-sm text-slate-500">Permanently delete your account and all associated data.</p>
                </div>
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    {deleteStep === 'password' && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="text-error-red">Confirm your password</DialogTitle>
                          <DialogDescription>Enter your password to request a deletion verification code.</DialogDescription>
                        </DialogHeader>
                        <Input type="password" placeholder="Password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleDeleteRequest} disabled={isDeleting || !deletePassword}>
                            {isDeleting ? 'Verifying...' : 'Send Code'}
                          </Button>
                        </DialogFooter>
                      </>
                    )}

                    {deleteStep === 'otp' && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="text-error-red">Verify deletion code</DialogTitle>
                          <DialogDescription>Enter the 6-digit code sent to your email.</DialogDescription>
                        </DialogHeader>
                        <Input placeholder="Verification code" value={deleteOtp} onChange={(e) => setDeleteOtp(e.target.value)} />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteStep('password')}>Back</Button>
                          <Button variant="outline" disabled={resendCooldown > 0 || isDeleting} onClick={handleResendDeleteCode}>
                            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                          </Button>
                          <Button variant="destructive" onClick={handleVerifyDeleteCode} disabled={isDeleting || !deleteOtp}>
                            {isDeleting ? 'Verifying...' : 'Verify'}
                          </Button>
                        </DialogFooter>
                      </>
                    )}

                    {deleteStep === 'confirm' && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="text-error-red">Final confirmation</DialogTitle>
                          <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showGoodbye && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center px-6">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-4">
            <div className="text-5xl">:(</div>
            <h2 className="text-3xl font-black text-slate-800">We are sad to see you go</h2>
            <p className="text-slate-600">Your account has been deleted. If you ever want to come back, we will be here.</p>
            <Button onClick={() => window.location.assign('/')}>Go to Home</Button>
          </div>
        </div>
      )}
    </main>
  )
}
