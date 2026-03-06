'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Star } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { PRELOAD_AVATAR_COUNT, parsePackedAvatarId } from '@/lib/avatar'
import { DEFAULT_REGISTRATION_INSTITUTES, normalizePkPhone } from '@/lib/account-utils'

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

const FALLBACK_CA_LEVELS = ['Foundation', 'Intermediate', 'Final', 'Already Qualified']
const FALLBACK_DEGREES = ['CA']

type ProfileFormState = {
  name: string
  degree: string
  institute: string
  level: string
  city: string
  studentId: string
  phone: string
  instituteRating: number
}

type AvatarOption = {
  avatarId: string
  seed: string
  url: string
}

type AvatarPackOption = {
  id: string
  name: string
  source: string
  isDefault: boolean
  options: AvatarOption[]
}

export default function DashboardSettingsPage() {
  const { user, setUser, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false)
  const isStudentProfile = user?.role === 'student'
  const [degreeOptions, setDegreeOptions] = useState<string[]>(FALLBACK_DEGREES)
  const [caLevelOptions, setCaLevelOptions] = useState<string[]>(FALLBACK_CA_LEVELS)
  const [instituteOptions, setInstituteOptions] = useState<string[]>([...DEFAULT_REGISTRATION_INSTITUTES])
  const [isInstituteDropdownOpen, setIsInstituteDropdownOpen] = useState(false)
  const [avatarPacks, setAvatarPacks] = useState<AvatarPackOption[]>([])
  const [activeAvatarPackTab, setActiveAvatarPackTab] = useState('')
  const [isSwitchingPack, setIsSwitchingPack] = useState(false)
  const [currentAvatarPackName, setCurrentAvatarPackName] = useState('')
  const [currentAvatarId, setCurrentAvatarId] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('')
  const [loadedAvatarIds, setLoadedAvatarIds] = useState<Record<string, boolean>>({})
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    degree: 'CA',
    institute: '',
    level: '',
    city: '',
    studentId: '',
    phone: '',
    instituteRating: 0,
  })

  const [isResetting, setIsResetting] = useState(false)
  const [isResettingNotes, setIsResettingNotes] = useState(false)
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false)
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
    const loadProfileAndSettings = async () => {
      if (!user?.id) return

      try {
        setIsProfileLoading(true)
        const [profileResponse, settingsResponse, avatarPackResponse] = await Promise.all([
          fetch('/api/user/profile', { cache: 'no-store' }),
          fetch('/api/public/settings', { cache: 'no-store' }),
          fetch('/api/public/avatar-pack', { cache: 'no-store' }),
        ])

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          const degrees = Array.isArray(settingsData?.testSettings?.registrationDegrees)
            ? settingsData.testSettings.registrationDegrees
                .map((value: unknown) => String(value || '').trim())
                .filter(Boolean)
            : []
          const levels = Array.isArray(settingsData?.testSettings?.registrationLevels)
            ? settingsData.testSettings.registrationLevels
                .map((value: unknown) => String(value || '').trim())
                .filter(Boolean)
            : []
          const institutes = Array.isArray(settingsData?.testSettings?.registrationInstitutes)
            ? settingsData.testSettings.registrationInstitutes
                .map((value: unknown) => String(value || '').trim())
                .filter(Boolean)
            : []
          setDegreeOptions(degrees.length ? degrees : FALLBACK_DEGREES)
          setCaLevelOptions(levels.length ? levels : FALLBACK_CA_LEVELS)
          setInstituteOptions(institutes.length ? institutes : [...DEFAULT_REGISTRATION_INSTITUTES])
        } else {
          setDegreeOptions(FALLBACK_DEGREES)
          setCaLevelOptions(FALLBACK_CA_LEVELS)
          setInstituteOptions([...DEFAULT_REGISTRATION_INSTITUTES])
        }

        let parsedAvatarPacks: AvatarPackOption[] = []
        if (avatarPackResponse.ok) {
          const avatarPackData = await avatarPackResponse.json()
          parsedAvatarPacks = Array.isArray(avatarPackData?.packs)
            ? avatarPackData.packs
                .map((pack: any) => {
                  const options = Array.isArray(pack?.options)
                    ? pack.options
                        .map((item: any) => ({
                          avatarId: String(item?.avatarId || '').trim(),
                          seed: String(item?.seed || '').trim(),
                          url: String(item?.url || '').trim(),
                        }))
                        .filter((item: AvatarOption) => item.avatarId && item.url)
                    : []
                  return {
                    id: String(pack?.id || '').trim(),
                    name: String(pack?.name || '').trim(),
                    source: String(pack?.source || 'dicebear').trim(),
                    isDefault: Boolean(pack?.isDefault),
                    options,
                  }
                })
                .filter((pack: AvatarPackOption) => pack.id && pack.options.length > 0)
            : []
        }
        setAvatarPacks(parsedAvatarPacks)

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          const profile = profileData?.user || {}
          const avatarId = String(profile.avatarId || user.avatarId || '').trim()
          const avatarUrl = String(profile.avatar || user.avatar || '').trim()
          const parsedCurrentAvatar = parsePackedAvatarId(avatarId)
          const currentPackId = parsedCurrentAvatar?.packId || ''
          const matchingPack =
            parsedAvatarPacks.find((pack) => pack.id === currentPackId) ||
            parsedAvatarPacks.find((pack) => pack.isDefault) ||
            parsedAvatarPacks[0] ||
            null

          setCurrentAvatarId(avatarId)
          setSelectedAvatarId(avatarId)
          setCurrentAvatarUrl(avatarUrl)
          setActiveAvatarPackTab(matchingPack?.id || '')
          setCurrentAvatarPackName(
            parsedAvatarPacks.find((pack) => pack.id === currentPackId)?.name || ''
          )
          setProfileForm({
            name: String(profile.name || user.name || ''),
            degree: String(profile.degree || 'CA'),
            institute: String(profile.institute || ''),
            level: String(profile.level || ''),
            city: String(profile.city || ''),
            studentId: String(profile.studentId || ''),
            phone: String(profile.phone || ''),
            instituteRating: Number(profile.instituteRating || 0),
          })
        }
      } catch (error) {
        toast({
          title: 'Profile load failed',
          description: 'Unable to load your profile details right now.',
          variant: 'destructive',
        })
      } finally {
        setIsProfileLoading(false)
      }
    }

    void loadProfileAndSettings()
  }, [user?.id, user?.name, user?.avatar, toast])

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
    if (!profileForm.level) return
    if (caLevelOptions.includes(profileForm.level)) return
    setCaLevelOptions((prev) => [...prev, profileForm.level])
  }, [caLevelOptions, profileForm.level])

  useEffect(() => {
    if (!profileForm.degree) return
    if (degreeOptions.includes(profileForm.degree)) return
    setDegreeOptions((prev) => [...prev, profileForm.degree])
  }, [degreeOptions, profileForm.degree])

  const filteredInstituteOptions = useMemo(() => {
    const query = profileForm.institute.trim().toLowerCase()
    if (!query) return instituteOptions
    return instituteOptions.filter((option) => option.toLowerCase().includes(query))
  }, [instituteOptions, profileForm.institute])

  const handleInstituteInputChange = (value: string) => {
    setProfileForm((prev) => ({ ...prev, institute: value }))
  }

  const handleInstituteOptionSelect = (value: string) => {
    const normalizedValue = String(value || '').trim()
    if (normalizedValue.toLowerCase() === 'other') {
      setProfileForm((prev) => ({ ...prev, institute: 'Other' }))
    } else {
      setProfileForm((prev) => ({ ...prev, institute: normalizedValue }))
    }
    setIsInstituteDropdownOpen(false)
  }

  const activePack =
    avatarPacks.find((pack) => pack.id === activeAvatarPackTab) ||
    avatarPacks.find((pack) => pack.isDefault) ||
    avatarPacks[0] ||
    null
  const activeAvatarOptions = activePack?.options || []

  useEffect(() => {
    if (!activeAvatarOptions.length) return
    const firstFour = activeAvatarOptions.slice(0, PRELOAD_AVATAR_COUNT)
    const links = firstFour.map((option) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = option.url
      document.head.appendChild(link)
      return link
    })

    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [activeAvatarOptions])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!activeAvatarOptions.length) return
    if (selectedAvatarId) return
    setSelectedAvatarId(activeAvatarOptions[0].avatarId)
  }, [activeAvatarOptions, selectedAvatarId])

  useEffect(() => {
    if (!avatarPacks.length) return
    if (!selectedAvatarId) return
    const parsed = parsePackedAvatarId(selectedAvatarId)
    if (!parsed?.packId) return
    if (activeAvatarPackTab === parsed.packId) return
    const nextPack = avatarPacks.find((pack) => pack.id === parsed.packId)
    if (nextPack) {
      setActiveAvatarPackTab(nextPack.id)
    }
  }, [avatarPacks, selectedAvatarId, activeAvatarPackTab])

  const handleSaveAvatar = async () => {
    if (!user?.id || selectedAvatarId === currentAvatarId) return

    try {
      setIsSavingAvatar(true)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: selectedAvatarId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update avatar')

      const nextUser = data.user
      const nextPackName =
        avatarPacks.find((pack) => pack.id === parsePackedAvatarId(selectedAvatarId)?.packId)?.name || ''
      setCurrentAvatarId(selectedAvatarId)
      setCurrentAvatarUrl((prev) => String(nextUser?.avatar || prev || user?.avatar || ''))
      setCurrentAvatarPackName(nextPackName)
      setUser((prev) =>
        prev
          ? {
              ...prev,
              avatar: nextUser.avatar,
              avatarId: nextUser.avatarId,
              name: nextUser.name || prev.name,
            }
          : prev
      )

      toast({ title: 'Avatar updated', description: 'Avatar updated successfully!' })
    } catch (error: any) {
      toast({
        title: 'Avatar update failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAvatar(false)
    }
  }

  const handleAvatarPackTabChange = (packId: string) => {
    if (!packId || packId === activeAvatarPackTab) return
    const nextPack = avatarPacks.find((pack) => pack.id === packId)
    setIsSwitchingPack(true)
    setTimeout(() => {
      setActiveAvatarPackTab(packId)
      if (nextPack?.options?.[0]?.avatarId) {
        setSelectedAvatarId(nextPack.options[0].avatarId)
      }
      setIsSwitchingPack(false)
    }, 150)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    if (
      !profileForm.name.trim() ||
      !profileForm.degree.trim() ||
      !profileForm.level.trim() ||
      !profileForm.city.trim() ||
      !profileForm.studentId.trim()
    ) {
      toast({
        title: 'Missing fields',
        description: 'Name, degree, CA level, city, and student ID are required.',
        variant: 'destructive',
      })
      return
    }

    if (isStudentProfile) {
      if (!profileForm.institute.trim() || !profileForm.studentId.trim() || !profileForm.phone.trim()) {
        toast({
          title: 'Missing fields',
          description: 'Institute, student ID, and phone are required for student profiles.',
          variant: 'destructive',
        })
        return
      }
      if (!normalizePkPhone(profileForm.phone.trim())) {
        toast({
          title: 'Invalid number',
          description: 'Please enter a valid Pakistani mobile number.',
          variant: 'destructive',
        })
        return
      }
      if (!profileForm.instituteRating || profileForm.instituteRating < 1 || profileForm.instituteRating > 5) {
        toast({
          title: 'Missing rating',
          description: 'Please rate your institute from 1 to 5 stars.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setIsSavingProfile(true)
      const payload: Record<string, any> = {
        name: profileForm.name.trim(),
        degree: profileForm.degree.trim(),
        level: profileForm.level.trim(),
        city: profileForm.city.trim(),
        studentId: profileForm.studentId.trim(),
      }

      if (isStudentProfile) {
        payload.institute = profileForm.institute.trim()
        payload.phone = profileForm.phone.trim()
        payload.instituteRating = profileForm.instituteRating
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update profile')

      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: data.user?.name || prev.name,
              avatar: data.user?.avatar || prev.avatar,
              avatarId: data.user?.avatarId || prev.avatarId,
            }
          : prev
      )

      setProfileForm((prev) => ({
        ...prev,
        name: String(data.user?.name || prev.name),
        degree: String(data.user?.degree || prev.degree),
        institute: String(data.user?.institute || ''),
        level: String(data.user?.level || prev.level),
        city: String(data.user?.city || ''),
        studentId: String(data.user?.studentId || ''),
        phone: String(data.user?.phone || ''),
        instituteRating: Number(data.user?.instituteRating || 0),
      }))

      toast({ title: 'Profile updated', description: 'Profile updated successfully!' })
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

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

  const handleSendPasswordReset = async () => {
    const userEmail = String(user?.email || '').trim()
    if (!userEmail) {
      toast({
        title: 'Email unavailable',
        description: 'Could not find your account email for password reset.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSendingPasswordReset(true)
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link')
      }
      toast({
        title: 'Reset link sent',
        description: `If an account exists with ${userEmail}, a reset link has been sent.`,
      })
    } catch (error: any) {
      toast({
        title: 'Unable to send reset link',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingPasswordReset(false)
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

  const selectedAvatarUrl =
    activeAvatarOptions.find((option) => option.avatarId === selectedAvatarId)?.url ||
    avatarPacks
      .flatMap((pack) => pack.options)
      .find((option) => option.avatarId === selectedAvatarId)?.url ||
    currentAvatarUrl ||
    user.avatar ||
    ''
  const hasAvatarSelectionChanged = selectedAvatarId !== currentAvatarId
  const activePackName = activePack?.name || ''

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
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border-[3px] border-primary-green shadow-[0_4px_16px_rgba(22,163,74,0.2)] bg-white">
                    <img src={selectedAvatarUrl} alt={`${user.name} avatar`} className="h-full w-full object-cover rounded-full" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                    className="mt-3 text-sm font-medium text-primary-green hover:text-green-700 transition-colors"
                  >
                    {isAvatarPickerOpen ? 'Hide Avatar Picker' : 'Change Avatar'}
                  </button>
                </div>

                {isAvatarPickerOpen ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Choose Your Avatar</h3>
                    <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
                      {avatarPacks.map((pack) => {
                        const isActiveTab = pack.id === activeAvatarPackTab
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            onClick={() => handleAvatarPackTabChange(pack.id)}
                            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                              isActiveTab
                                ? 'bg-primary-green text-white'
                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pack.name}
                          </button>
                        )
                      })}
                    </div>
                    {currentAvatarPackName && activePackName && currentAvatarPackName !== activePackName ? (
                      <p className="mb-2 text-xs text-slate-500">
                        Your current avatar is from <span className="font-semibold">{currentAvatarPackName}</span>.
                      </p>
                    ) : null}
                    <div
                      className={`transition-opacity duration-150 ${
                        isSwitchingPack ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      {isSwitchingPack ? (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {Array.from({ length: 10 }).map((_, index) => (
                            <span key={`avatar-skeleton-${index}`} className="h-16 w-16 rounded-full avatar-shimmer" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {activeAvatarOptions.map((avatarOption, index) => {
                            const selected = selectedAvatarId === avatarOption.avatarId
                            const loaded = Boolean(loadedAvatarIds[avatarOption.avatarId])
                            return (
                              <button
                                key={avatarOption.avatarId}
                                type="button"
                                onClick={() => setSelectedAvatarId(avatarOption.avatarId)}
                                className={`relative h-16 w-16 rounded-full overflow-hidden border-2 transition-all duration-200 ${
                                  selected
                                    ? 'border-primary-green border-[3px] scale-105 shadow-[0_4px_16px_rgba(22,163,74,0.3)]'
                                    : 'border-transparent hover:border-[#86efac] hover:scale-[1.08] hover:shadow-[0_4px_12px_rgba(22,163,74,0.2)]'
                                }`}
                              >
                                {!loaded ? (
                                  <span className="absolute inset-0 rounded-full avatar-shimmer" aria-hidden />
                                ) : null}
                                <img
                                  src={avatarOption.url}
                                  alt={`${avatarOption.seed} avatar`}
                                  className={`h-full w-full object-cover rounded-full ${loaded ? 'avatar-reveal-loaded' : 'opacity-0'}`}
                                  loading={index < PRELOAD_AVATAR_COUNT ? 'eager' : 'lazy'}
                                  onLoad={() =>
                                    setLoadedAvatarIds((prev) =>
                                      prev[avatarOption.avatarId]
                                        ? prev
                                        : { ...prev, [avatarOption.avatarId]: true }
                                    )
                                  }
                                />
                                {selected ? (
                                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary-green text-white flex items-center justify-center">
                                    <Check size={8} />
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {!activeAvatarOptions.length ? (
                      <p className="mt-3 text-xs text-slate-500">No avatar options available right now.</p>
                    ) : null}
                    <div className="mt-5 flex justify-end">
                      <Button
                        onClick={handleSaveAvatar}
                        disabled={!hasAvatarSelectionChanged || isSavingAvatar || isProfileLoading || !activeAvatarOptions.length}
                        className="bg-primary-green hover:bg-green-700"
                      >
                        {isSavingAvatar ? 'Saving...' : 'Save Avatar'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Profile Details</h3>
                    <p className="text-sm text-slate-500">Update your academic and contact details.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="profile-name">Full Name</Label>
                      <Input
                        id="profile-name"
                        value={profileForm.name}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        disabled={isProfileLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Degree</Label>
                      <Select
                        value={profileForm.degree}
                        onValueChange={(value) =>
                          setProfileForm((prev) => ({ ...prev, degree: value }))
                        }
                        disabled={isProfileLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree" />
                        </SelectTrigger>
                        <SelectContent>
                          {degreeOptions.map((degreeOption) => (
                            <SelectItem key={degreeOption} value={degreeOption}>
                              {degreeOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="profile-student-id">Student ID</Label>
                      <Input
                        id="profile-student-id"
                        value={profileForm.studentId}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, studentId: event.target.value }))
                        }
                        disabled={isProfileLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>CA Level</Label>
                      <Select
                        value={profileForm.level}
                        onValueChange={(value) => setProfileForm((prev) => ({ ...prev, level: value }))}
                        disabled={isProfileLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {caLevelOptions.map((levelOption) => (
                            <SelectItem key={levelOption} value={levelOption}>
                              {levelOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="profile-city">City</Label>
                      <Input
                        id="profile-city"
                        value={profileForm.city}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, city: event.target.value }))
                        }
                        disabled={isProfileLoading}
                      />
                    </div>
                    {isStudentProfile ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="profile-institute">Coaching Institute / Academy</Label>
                        <div className="relative">
                          <Input
                            id="profile-institute"
                            placeholder="Type to search institute"
                            value={profileForm.institute}
                            onChange={(event) => handleInstituteInputChange(event.target.value)}
                            onFocus={() => setIsInstituteDropdownOpen(true)}
                            onBlur={() => {
                              setTimeout(() => setIsInstituteDropdownOpen(false), 120)
                            }}
                            disabled={isProfileLoading}
                          />
                          {isInstituteDropdownOpen ? (
                            <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                              <div className="max-h-[190px] overflow-y-auto p-1">
                                {filteredInstituteOptions.length ? (
                                  filteredInstituteOptions.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      className="w-full rounded-sm px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                      onMouseDown={(event) => {
                                        event.preventDefault()
                                        handleInstituteOptionSelect(option)
                                      }}
                                    >
                                      {option}
                                    </button>
                                  ))
                                ) : (
                                  <p className="px-3 py-2 text-sm text-slate-500">No matching institute found.</p>
                                )}
                                <button
                                  type="button"
                                  className="w-full rounded-sm px-3 py-2 text-left text-sm font-medium text-[#0F7938] hover:bg-slate-100"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    handleInstituteOptionSelect('Other')
                                  }}
                                >
                                  Other
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          Only 5 institutes are shown at once. Scroll to view more.
                        </p>
                      </div>
                    ) : null}
                    {isStudentProfile ? (
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="profile-phone">Pakistani Phone Number</Label>
                        <Input
                          id="profile-phone"
                          placeholder="+923001234567 or 03001234567"
                          value={profileForm.phone}
                          onChange={(event) =>
                            setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                          }
                          disabled={isProfileLoading}
                        />
                      </div>
                    ) : null}
                    {isStudentProfile ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Institute Rating</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setProfileForm((prev) => ({ ...prev, instituteRating: star }))
                              }
                              className="rounded-md p-1 transition-colors hover:bg-amber-50"
                              disabled={isProfileLoading}
                              aria-label={`Rate ${star} star`}
                            >
                              <Star
                                size={20}
                                className={
                                  star <= profileForm.instituteRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }
                              />
                            </button>
                          ))}
                          <span className="text-xs text-slate-500">
                            {profileForm.instituteRating
                              ? `${profileForm.instituteRating}/5`
                              : 'Select rating'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || isProfileLoading}
                      className="bg-primary-green hover:bg-green-700"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <h3 className="font-bold text-slate-900">Reset Password</h3>
                  <p className="text-sm text-slate-500">Send a password reset link to your account email.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSendPasswordReset}
                  disabled={isSendingPasswordReset || !user?.email}
                >
                  {isSendingPasswordReset ? 'Sending...' : 'Send Reset Link'}
                </Button>
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

      <style jsx global>{`
        .avatar-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: avatarShimmer 1.5s linear infinite;
        }
        .avatar-reveal-loaded {
          animation: avatarReveal 200ms ease;
        }
        @keyframes avatarReveal {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes avatarShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </main>
  )
}
