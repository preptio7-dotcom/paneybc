'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Check, Star } from 'lucide-react'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { normalizePkPhone } from '@/lib/account-utils'
import { parsePackedAvatarId } from '@/lib/avatar'

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

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

type RegistrationOptions = {
  degrees: string[]
  levels: string[]
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)
  const [registrationOptions, setRegistrationOptions] = useState<RegistrationOptions>({
    degrees: ['CA'],
    levels: ['PRC', 'CAF'],
  })
  const [avatarPacks, setAvatarPacks] = useState<AvatarPackOption[]>([])
  const [activeAvatarPackTab, setActiveAvatarPackTab] = useState('')
  const [isSwitchingPack, setIsSwitchingPack] = useState(false)
  const [form, setForm] = useState({
    name: '',
    avatarId: '',
    degree: 'CA',
    level: 'PRC',
    institute: '',
    city: '',
    studentId: '',
    phone: '',
    instituteRating: 0,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settingsResponse, avatarPackResponse] = await Promise.all([
          fetch('/api/public/settings'),
          fetch('/api/public/avatar-pack'),
        ])

        if (!settingsResponse.ok) return
        const data = await settingsResponse.json()
        const degrees = Array.isArray(data?.testSettings?.registrationDegrees)
          ? data.testSettings.registrationDegrees.map((item: string) => String(item).trim()).filter(Boolean)
          : ['CA']
        const levels = Array.isArray(data?.testSettings?.registrationLevels)
          ? data.testSettings.registrationLevels.map((item: string) => String(item).trim()).filter(Boolean)
          : ['PRC', 'CAF']
        setRegistrationOptions({
          degrees: degrees.length ? degrees : ['CA'],
          levels: levels.length ? levels : ['PRC', 'CAF'],
        })

        if (avatarPackResponse.ok) {
          const avatarPackData = await avatarPackResponse.json()
          const packs = Array.isArray(avatarPackData?.packs)
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
          setAvatarPacks(packs)
          const fallbackPack = packs.find((pack) => pack.isDefault) || packs[0] || null
          if (fallbackPack) {
            setActiveAvatarPackTab(fallbackPack.id)
            setForm((prev) => ({ ...prev, avatarId: prev.avatarId || fallbackPack.options[0]?.avatarId || '' }))
          }
        } else {
          setAvatarPacks([])
        }
      } catch {
        // keep defaults
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!isOpen || !user) return

    const loadProfile = async () => {
      try {
        setIsFetchingProfile(true)
        const response = await fetch('/api/user/profile')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load profile')
        const profile = data.user || {}
        const parsedAvatar = parsePackedAvatarId(String(profile.avatarId || user.avatarId || ''))
        const avatarPackId = parsedAvatar?.packId || ''
        if (avatarPackId) {
          setActiveAvatarPackTab(avatarPackId)
        }
        setForm((prev) => ({
          ...prev,
          name: profile.name || user.name || '',
          avatarId: String(profile.avatarId || user.avatarId || prev.avatarId || ''),
          degree: profile.degree || prev.degree,
          level: profile.level || prev.level,
          institute: profile.institute || '',
          city: profile.city || '',
          studentId: profile.studentId || '',
          phone: profile.phone || '',
          instituteRating: Number(profile.instituteRating || 0),
        }))
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load profile',
          variant: 'destructive',
        })
      } finally {
        setIsFetchingProfile(false)
      }
    }

    loadProfile()
  }, [isOpen, user, toast])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      degree: registrationOptions.degrees.includes(prev.degree) ? prev.degree : registrationOptions.degrees[0],
      level: registrationOptions.levels.includes(prev.level) ? prev.level : registrationOptions.levels[0],
    }))
  }, [registrationOptions])

  const activeAvatarPack =
    avatarPacks.find((pack) => pack.id === activeAvatarPackTab) ||
    avatarPacks.find((pack) => pack.isDefault) ||
    avatarPacks[0] ||
    null
  const activeAvatarOptions = activeAvatarPack?.options || []

  useEffect(() => {
    if (!activeAvatarOptions.length) return
    if (form.avatarId && activeAvatarOptions.some((option) => option.avatarId === form.avatarId)) return
    setForm((prev) => ({ ...prev, avatarId: activeAvatarOptions[0].avatarId }))
  }, [activeAvatarOptions, form.avatarId])

  useEffect(() => {
    if (!avatarPacks.length) return
    if (!form.avatarId) return
    const packed = parsePackedAvatarId(form.avatarId)
    if (!packed?.packId) return
    if (packed.packId === activeAvatarPackTab) return
    const nextPack = avatarPacks.find((pack) => pack.id === packed.packId)
    if (nextPack) {
      setActiveAvatarPackTab(nextPack.id)
    }
  }, [avatarPacks, form.avatarId, activeAvatarPackTab])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.avatarId || !form.degree || !form.level || !form.institute.trim() || !form.city.trim() || !form.studentId.trim() || !form.phone.trim()) {
      toast({
        title: 'Missing fields',
        description: 'All profile fields are required.',
        variant: 'destructive',
      })
      return
    }
    if (!normalizePkPhone(form.phone)) {
      toast({
        title: 'Invalid number',
        description: 'Please enter a valid Pakistani mobile number.',
        variant: 'destructive',
      })
      return
    }
    if (!form.instituteRating || form.instituteRating < 1 || form.instituteRating > 5) {
      toast({
        title: 'Missing rating',
        description: 'Please rate your institute from 1 to 5 stars.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          avatarId: form.avatarId,
          degree: form.degree,
          level: form.level,
          institute: form.institute.trim(),
          city: form.city.trim(),
          studentId: form.studentId.trim(),
          phone: form.phone.trim(),
          instituteRating: form.instituteRating,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update profile')

      setUser(data.user)
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      })
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    try {
      setIsResetting(true)
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to initiate password reset')

      toast({
        title: 'Reset Link Sent',
        description: 'A password reset link has been sent to your email.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleAvatarPackTabChange = (packId: string) => {
    if (!packId || packId === activeAvatarPackTab) return
    const nextPack = avatarPacks.find((pack) => pack.id === packId)
    setIsSwitchingPack(true)
    setTimeout(() => {
      setActiveAvatarPackTab(packId)
      if (nextPack?.options?.[0]?.avatarId) {
        setForm((prev) => ({ ...prev, avatarId: nextPack.options[0].avatarId }))
      }
      setIsSwitchingPack(false)
    }, 150)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your academic and contact details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateProfile} className="space-y-6 py-2">
          <div className="space-y-3">
            <Label>Select Avatar</Label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {avatarPacks.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handleAvatarPackTabChange(pack.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeAvatarPack?.id === pack.id
                      ? 'bg-primary-green text-white'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                >
                  {pack.name}
                </button>
              ))}
            </div>
            <div className={`transition-opacity duration-150 ${isSwitchingPack ? 'opacity-0' : 'opacity-100'}`}>
              {isSwitchingPack ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span key={`switching-avatar-${index}`} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {activeAvatarOptions.map((avatar) => (
                    <button
                      key={avatar.avatarId}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, avatarId: avatar.avatarId }))}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                        form.avatarId === avatar.avatarId ? 'border-primary-green scale-105 shadow-md' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <Image src={avatar.url} alt={avatar.seed} fill className="object-cover" />
                      {form.avatarId === avatar.avatarId && (
                        <div className="absolute inset-0 bg-primary-green/20 flex items-center justify-center">
                          <div className="bg-primary-green text-white rounded-full p-1">
                            <Check size={16} />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!activeAvatarOptions.length ? (
              <p className="text-xs text-slate-500">No avatar options available right now.</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="profile-name">Full Name *</Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input id="profile-email" type="email" value={user?.email || ''} disabled className="bg-slate-50 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <Label>Degree *</Label>
              <Select value={form.degree} onValueChange={(value) => setForm((prev) => ({ ...prev, degree: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select degree" />
                </SelectTrigger>
                <SelectContent>
                  {registrationOptions.degrees.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(value) => setForm((prev) => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {registrationOptions.levels.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="profile-institute">Institute *</Label>
              <Input
                id="profile-institute"
                value={form.institute}
                onChange={(e) => setForm((prev) => ({ ...prev, institute: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-city">City *</Label>
              <Input
                id="profile-city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-student-id">Student ID *</Label>
              <Input
                id="profile-student-id"
                value={form.studentId}
                onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="profile-phone">Pakistani Phone *</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+923001234567 or 03001234567"
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Institute Rating *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, instituteRating: star }))}
                    className="p-1"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      size={20}
                      className={star <= form.instituteRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  </button>
                ))}
                <span className="text-xs text-slate-500">{form.instituteRating ? `${form.instituteRating}/5` : 'Select rating'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Reset Password</Label>
                <p className="text-xs text-slate-500">Security link will be sent to your email.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleForgotPassword} disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Link
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isFetchingProfile || !form.avatarId} className="bg-primary-green hover:bg-primary-green/90">
              {(isLoading || isFetchingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
