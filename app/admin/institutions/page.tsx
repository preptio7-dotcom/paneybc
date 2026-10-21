'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  GraduationCap,
  Users,
  Search,
  RefreshCcw,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  Send,
  Trash2,
  FlaskConical,
} from 'lucide-react'
import {
  DEFAULT_BETA_FEATURE_SETTINGS,
  extractBetaFeatureSettings,
  type BetaFeatureSettings,
} from '@/lib/beta-features'

type InquiryStatus = 'new' | 'reviewed' | 'replied'

type InstitutionalInquiry = {
  id: string
  type: string
  name: string
  email: string
  phone: string | null
  institute: string | null
  role: string | null
  experience: string | null
  message: string | null
  status: InquiryStatus
  adminReply: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminInstitutionsPage() {
  const { toast } = useToast()
  const [inquiries, setInquiries] = useState<InstitutionalInquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all')
  const [activeInquiry, setActiveInquiry] = useState<InstitutionalInquiry | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState<'reviewed' | 'replied'>('replied')
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InstitutionalInquiry | null>(null)

  // Beta feature toggle state
  const [betaFeatures, setBetaFeatures] = useState<BetaFeatureSettings>(DEFAULT_BETA_FEATURE_SETTINGS)
  const [isSavingBeta, setIsSavingBeta] = useState(false)

  const fetchInquiries = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set('limit', '100')
      params.set('type', 'institutional_inquiry')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/join-us?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load inquiries')

      setInquiries(Array.isArray(data.submissions) ? data.submissions : [])
    } catch (error: any) {
      toast({
        title: 'Error loading inquiries',
        description: error.message || 'Unable to load institutional inquiries.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadBetaSettings = async () => {
    try {
      const res = await fetch('/api/admin/system/settings')
      if (res.ok) {
        const data = await res.json()
        setBetaFeatures(extractBetaFeatureSettings(data?.testSettings || {}))
      }
    } catch {
      // keep fallback
    }
  }

  useEffect(() => {
    void fetchInquiries()
    void loadBetaSettings()
  }, [statusFilter])

  const isPublic = betaFeatures.institutionalEnrollment === 'public'

  const handleToggleBeta = async (checked: boolean) => {
    const nextSettings: BetaFeatureSettings = {
      ...betaFeatures,
      institutionalEnrollment: checked ? 'public' : 'beta_ambassador',
    }
    setBetaFeatures(nextSettings)

    try {
      setIsSavingBeta(true)
      const res = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSettings: {
            betaFeatures: nextSettings,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to update beta setting')
      toast({
        title: 'Beta Setting Updated',
        description: checked
          ? 'Institutional page and badges are now PUBLIC to all visitors.'
          : 'Institutional page is now restricted to BETA Ambassadors and Admins.',
      })
    } catch (error: any) {
      toast({
        title: 'Error updating setting',
        description: error.message,
        variant: 'destructive',
      })
      void loadBetaSettings()
    } finally {
      setIsSavingBeta(false)
    }
  }

  const handleReplySubmit = async () => {
    if (!activeInquiry) return
    try {
      setIsSending(true)
      const res = await fetch(`/api/admin/join-us/${activeInquiry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeInquiry.id,
          message: replyMessage,
          status: replyStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update inquiry')

      setInquiries((prev) =>
        prev.map((item) => (item.id === activeInquiry.id ? data.submission : item))
      )
      setActiveInquiry(null)
      toast({
        title: replyStatus === 'replied' ? 'Reply Sent' : 'Marked as Reviewed',
        description: replyStatus === 'replied' ? 'Email sent to the applicant.' : 'Status updated.',
      })
    } catch (error: any) {
      toast({
        title: 'Reply Failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/join-us/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete inquiry')
      setInquiries((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast({ title: 'Deleted', description: 'Inquiry record removed.' })
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredInquiries = useMemo(() => {
    if (!searchQuery.trim()) return inquiries
    const q = searchQuery.toLowerCase()
    return inquiries.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        (i.institute && i.institute.toLowerCase().includes(q)) ||
        (i.experience && i.experience.toLowerCase().includes(q)) ||
        (i.message && i.message.toLowerCase().includes(q))
    )
  }, [inquiries, searchQuery])

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-8 h-8 text-[#0F7938]" />
                <h1 className="font-heading text-3xl font-bold text-slate-900">
                  Institutional & Educator Program
                </h1>
              </div>
              <p className="text-slate-500 text-sm mt-1">
                Manage incoming bulk enrollment quote requests from colleges, academies, and independent teachers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/institutions"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-[#0F7938] hover:border-emerald-300 rounded-lg text-sm font-medium transition-all shadow-xs"
              >
                <span>View Live Page</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href="/admin/beta-features"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-[#0F7938] rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all shadow-xs"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Beta Features</span>
              </Link>
            </div>
          </div>

          {/* Beta Feature & Public Status Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>Feature Visibility:</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        isPublic
                          ? 'bg-emerald-100 text-[#0F7938] border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isPublic ? 'Public Active (Live to Everyone)' : 'Ambassador Beta (Testing Only)'}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Control whether the `/institutions` page, homepage hero badge, and footer links are visible to all public visitors or only beta ambassadors.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {isPublic ? 'Public ON' : 'Beta Only'}
                  </span>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={handleToggleBeta}
                    disabled={isSavingBeta}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Inquiries Management Section */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    Institutional Inquiries ({filteredInquiries.length})
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    Quote requests received via the institutional enrollment form.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filter */}
                  <select
                    className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="all">All Inquiries</option>
                    <option value="new">New (Unreviewed)</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="replied">Replied</option>
                  </select>

                  {/* Search box */}
                  <div className="relative w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Search name, college, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchInquiries()}
                    disabled={isLoading}
                    className="h-9 gap-1.5"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0F7938]" />
                  <p className="text-sm">Loading institutional inquiries...</p>
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-base font-semibold text-slate-600">No Inquiries Found</p>
                  <p className="text-xs text-slate-400">
                    New inquiries submitted from the `/institutions` form will show up here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                        <th className="py-3 px-4">Contact & Role</th>
                        <th className="py-3 px-4">Institution / Academy</th>
                        <th className="py-3 px-4">Scope & Student Count</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInquiries.map((inquiry) => (
                        <tr key={inquiry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{inquiry.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{inquiry.email}</span>
                              {inquiry.phone && <span>&bull; {inquiry.phone}</span>}
                            </div>
                            <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
                              {inquiry.role || 'Educator'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">
                              {inquiry.institute || 'Independent Tutor'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-xs text-slate-700 font-medium">
                              {inquiry.experience || '15+ Students'}
                            </div>
                            {inquiry.message && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-xs">
                                {inquiry.message}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                inquiry.status === 'new'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : inquiry.status === 'reviewed'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {inquiry.status === 'new'
                                ? 'New'
                                : inquiry.status === 'reviewed'
                                ? 'Reviewed'
                                : 'Replied'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(inquiry.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveInquiry(inquiry)
                                  setReplyMessage(inquiry.adminReply || '')
                                  setReplyStatus(
                                    inquiry.status === 'replied' ? 'replied' : 'reviewed'
                                  )
                                }}
                                className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#0F7938]"
                              >
                                View & Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(inquiry)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View & Reply Dialog */}
      <Dialog open={!!activeInquiry} onOpenChange={(open) => !open && setActiveInquiry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0F7938]" />
              <span>Institutional Inquiry Details</span>
            </DialogTitle>
            <DialogDescription>
              Submitted on {activeInquiry && new Date(activeInquiry.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {activeInquiry && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Applicant</span>
                  <span className="font-semibold text-slate-900">{activeInquiry.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Designation / Role</span>
                  <span className="text-slate-800">{activeInquiry.role || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Work Email</span>
                  <a
                    href={`mailto:${activeInquiry.email}`}
                    className="text-[#0F7938] hover:underline font-medium"
                  >
                    {activeInquiry.email}
                  </a>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Phone / WhatsApp</span>
                  <span className="text-slate-800">{activeInquiry.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Institution</span>
                  <span className="text-slate-800">{activeInquiry.institute || 'Independent'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Batch Details</span>
                  <span className="font-medium text-emerald-800">
                    {activeInquiry.experience || '15+ Students'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold block mb-1">Inquiry Message</span>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm whitespace-pre-wrap">
                  {activeInquiry.message || 'No additional note provided.'}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs text-slate-700 font-semibold block">
                  Admin Response / Proposal Notes (Sent via Email if marked Replied):
                </label>
                <Textarea
                  rows={4}
                  placeholder="Type quotation details, proposal notes, or schedule link..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-700">Set Status:</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="radio"
                    name="inquiryStatus"
                    value="reviewed"
                    checked={replyStatus === 'reviewed'}
                    onChange={() => setReplyStatus('reviewed')}
                  />
                  <span>Mark as Reviewed</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="radio"
                    name="inquiryStatus"
                    value="replied"
                    checked={replyStatus === 'replied'}
                    onChange={() => setReplyStatus('replied')}
                  />
                  <span>Send Email Reply</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveInquiry(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplySubmit}
              disabled={isSending}
              className="bg-[#0F7938] hover:bg-emerald-800 text-white gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Save & Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the institutional inquiry from{' '}
              <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Inquiry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
