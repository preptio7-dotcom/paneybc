'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Users, Mail, CheckCircle2, AlertCircle, Eye, Smartphone, Monitor, X } from 'lucide-react'
import { toast } from 'sonner'
import { buildCampaignEmailHtml } from '@/lib/email-shell'
import { COMMUNITY_ANNOUNCEMENT_TEMPLATE, ACTIVATION_DAY_0 } from '@/lib/email-templates'

type Template = {
  _id: string
  name: string
  category: string
  subject: string
  body: string
  status: 'draft' | 'active'
  updatedAt?: string
}

type Schedule = {
  _id: string
  name: string
  segment: string
  sendAt: string
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed'
  sentAt?: string
  sentCount?: number
  lastError?: string | null
  specificEmails?: string | null
  templateId?: Template
  newWithinDays?: number
  activeWithinDays?: number
  inactiveDays?: number
  examDaysBefore?: number
}

const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General Announcement' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'exam_prep', label: 'Exam Prep' },
]

const SEGMENTS = [
  { value: 'all_users', label: 'All Registered Users' },
  { value: 'specific_users', label: 'Specific Users / Custom Emails' },
  { value: 'new_users', label: 'New Users' },
  { value: 'active_users', label: 'Active Users' },
  { value: 'inactive_users', label: 'Inactive Users' },
  { value: 'never_practiced', label: 'Never Practised (signed up, no tests)' },
  { value: 'exam_prep', label: 'Exam Prep Window' },
]

// Canonical, mobile-first template copy lives in lib/email-templates.ts.
const DEFAULT_COMMUNITY_TEMPLATE = { ...COMMUNITY_ANNOUNCEMENT_TEMPLATE, status: 'active' as const }
const DEFAULT_NEVER_PRACTICED_TEMPLATE = { ...ACTIVATION_DAY_0, status: 'active' as const }

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localDatetimeToIso(localStr: string): string {
  const value = localStr.length === 16 ? `${localStr}:00` : localStr
  const localDate = new Date(value)
  if (Number.isNaN(localDate.getTime())) {
    throw new Error('Invalid send time')
  }
  return localDate.toISOString()
}

function formatSendAt(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function EmailCampaignsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [runningSchedules, setRunningSchedules] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'general',
    subject: '',
    body: '',
    status: 'draft',
  })
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [previewTemplate, setPreviewTemplate] = useState<{
    name: string
    subject: string
    body: string
  } | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    templateId: '',
    segment: 'all_users',
    sendAt: toLocalDatetimeString(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    specificEmails: '',
    newWithinDays: 1,
    activeWithinDays: 7,
    inactiveDays: 14,
    examDaysBefore: 30,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [templateRes, scheduleRes] = await Promise.all([
        fetch('/api/admin/email-campaigns/templates'),
        fetch('/api/admin/email-campaigns/schedules'),
      ])

      if (templateRes.ok) {
        const data = await templateRes.json()
        setTemplates(data.templates || [])
      }
      if (scheduleRes.ok) {
        const data = await scheduleRes.json()
        setSchedules(data.schedules || [])
      }
    } catch {
      toast.error('Failed to load campaign data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTemplateSubmit = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Please fill in Template Name, Subject, and Body.')
      return
    }
    setSavingTemplate(true)
    try {
      const response = await fetch('/api/admin/email-campaigns/templates', {
        method: editingTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplateId ? { id: editingTemplateId, ...templateForm } : templateForm),
      })
      if (response.ok) {
        toast.success(editingTemplateId ? 'Template updated' : 'Template created')
        setTemplateForm({ name: '', category: 'general', subject: '', body: '', status: 'draft' })
        setEditingTemplateId(null)
        await loadData()
      } else {
        const d = await response.json()
        toast.error(d.error || 'Failed to save template')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleTemplateEdit = (template: Template) => {
    setEditingTemplateId(template._id)
    setTemplateForm({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
      status: template.status || 'draft',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadCommunityTemplate = () => {
    setTemplateForm({
      name: DEFAULT_COMMUNITY_TEMPLATE.name,
      category: DEFAULT_COMMUNITY_TEMPLATE.category,
      subject: DEFAULT_COMMUNITY_TEMPLATE.subject,
      body: DEFAULT_COMMUNITY_TEMPLATE.body,
      status: DEFAULT_COMMUNITY_TEMPLATE.status,
    })
    setEditingTemplateId(null)
    toast.success('Loaded Preptio Community Announcement Template!')
  }

  const loadNeverPracticedTemplate = () => {
    setTemplateForm({
      name: DEFAULT_NEVER_PRACTICED_TEMPLATE.name,
      category: DEFAULT_NEVER_PRACTICED_TEMPLATE.category,
      subject: DEFAULT_NEVER_PRACTICED_TEMPLATE.subject,
      body: DEFAULT_NEVER_PRACTICED_TEMPLATE.body,
      status: DEFAULT_NEVER_PRACTICED_TEMPLATE.status,
    })
    setEditingTemplateId(null)
    toast.success('Loaded the never-practised activation template!')
  }

  // Opens the responsive preview modal. With no argument it previews whatever is
  // currently in the editor; pass a template to preview a saved one.
  const openPreview = (template?: { name: string; subject: string; body: string }) => {
    const source = template ?? {
      name: templateForm.name,
      subject: templateForm.subject,
      body: templateForm.body,
    }
    if (!source.body || !source.body.trim()) {
      toast.error('Add some email body content first, then preview.')
      return
    }
    setPreviewTemplate({
      name: source.name?.trim() || 'Untitled template',
      subject: source.subject?.trim() || '(no subject)',
      body: source.body,
    })
    setPreviewDevice('mobile')
    setPreviewOpen(true)
  }

  const handleTemplateDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    await fetch('/api/admin/email-campaigns/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('Template deleted')
    await loadData()
  }

  const runSchedules = async (scheduleId?: string) => {
    setRunningSchedules(true)
    try {
      const res = await fetch('/api/admin/email-campaigns/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleId ? { scheduleId, sendNow: true } : {}),
      })
      const data = await res.json()
      if (res.ok && (data.sent ?? 0) > 0) {
        toast.success(`Sent campaign to ${data.sent} recipient(s)`)
        await loadData()
      } else if (res.ok) {
        toast.error(data.message || 'No emails were sent')
        await loadData()
      } else {
        toast.error(data.error || 'Failed to trigger campaign send')
        await loadData()
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to run campaign')
    } finally {
      setRunningSchedules(false)
    }
  }

  const handleScheduleSubmit = async (options?: { sendImmediately?: boolean }) => {
    if (!scheduleForm.name || !scheduleForm.templateId || !scheduleForm.sendAt) {
      toast.error('Please enter Schedule Name, select a Template, and set Send Time.')
      return
    }
    if (scheduleForm.segment === 'specific_users' && !scheduleForm.specificEmails.trim()) {
      toast.error('Please enter at least one recipient email address.')
      return
    }

    setSavingSchedule(true)
    try {
      const sendAt = options?.sendImmediately
        ? new Date().toISOString()
        : localDatetimeToIso(scheduleForm.sendAt)
      const response = await fetch('/api/admin/email-campaigns/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          sendAt,
        }),
      })
      const created = await response.json()
      if (!response.ok) {
        toast.error(created.error || 'Failed to create schedule')
        return
      }

      if (options?.sendImmediately && created.schedule?._id) {
        await runSchedules(created.schedule._id)
      } else {
        toast.success('Campaign scheduled successfully')
      }

      setScheduleForm((prev) => ({
        ...prev,
        name: '',
        specificEmails: '',
        sendAt: toLocalDatetimeString(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      }))
      await loadData()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const cancelSchedule = async (id: string) => {
    await fetch('/api/admin/email-campaigns/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    toast.success('Schedule cancelled')
    await loadData()
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    await fetch('/api/admin/email-campaigns/schedules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('Schedule deleted')
    await loadData()
  }

  const isSpecificUsers = scheduleForm.segment === 'specific_users'
  const isNewUsers = scheduleForm.segment === 'new_users'
  const isActiveUsers = scheduleForm.segment === 'active_users'
  const isInactiveUsers = scheduleForm.segment === 'inactive_users'
  const isExamPrep = scheduleForm.segment === 'exam_prep'

  const parsedEmailsCount = useMemo(() => {
    if (!scheduleForm.specificEmails) return 0
    return scheduleForm.specificEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@') && !e.includes(' ')).length
  }, [scheduleForm.specificEmails])

  const scheduleSummary = useMemo(() => {
    const template = templates.find((item) => item._id === scheduleForm.templateId)
    if (!template) return ''
    const segmentLabel = SEGMENTS.find((item) => item.value === scheduleForm.segment)?.label || ''
    if (isSpecificUsers) {
      return `"${template.name}" to ${parsedEmailsCount} specific recipient(s)`
    }
    return `"${template.name}" to ${segmentLabel}`
  }, [templates, scheduleForm.templateId, scheduleForm.segment, isSpecificUsers, parsedEmailsCount])

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12 px-4 md:px-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Email Campaigns</h1>
            <p className="text-sm text-text-light mt-1">
              Broadcast announcements and drip emails to all users or specific recipients.
            </p>
          </div>
          <Button onClick={() => runSchedules()} disabled={runningSchedules || loading} className="bg-emerald-600 hover:bg-emerald-700">
            {runningSchedules ? 'Running...' : 'Run Due Schedules'}
          </Button>
        </div>

        {/* Templates Card */}
        <Card className="border border-border bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xl">Email Templates</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadNeverPracticedTemplate}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
              >
                <Users size={14} />
                Load Never-Practised Template
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadCommunityTemplate}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                Load Community Launch Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="e.g. Community Feature Launch"
                  value={templateForm.name}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateCategory">Category</Label>
                <select
                  id="templateCategory"
                  value={templateForm.category}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TEMPLATE_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="templateSubject">Email Subject</Label>
                <Input
                  id="templateSubject"
                  placeholder="e.g. Introducing Preptio Community: Discuss, Ask & Learn Together!"
                  value={templateForm.subject}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, subject: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="templateBody">Email Body (HTML allowed)</Label>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-text-light sm:inline">Full HTML, styled tags, and links supported</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openPreview()}
                      className="flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Eye size={14} />
                      Preview
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="templateBody"
                  placeholder="Enter HTML email content..."
                  value={templateForm.body}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateStatus">Status</Label>
                <select
                  id="templateStatus"
                  value={templateForm.status}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleTemplateSubmit} disabled={savingTemplate} className="bg-emerald-600 hover:bg-emerald-700">
                {savingTemplate ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Create Template'}
              </Button>
              {editingTemplateId && (
                <Button variant="outline" onClick={() => {
                  setEditingTemplateId(null)
                  setTemplateForm({ name: '', category: 'general', subject: '', body: '', status: 'draft' })
                }}>
                  Cancel Edit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {templates.map((template, idx) => (
                <Card key={template._id ?? `${template.name ?? 'template'}-${template.subject ?? idx}`} className="border border-border bg-slate-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-text-dark">{template.name}</p>
                        <p className="text-xs text-text-light capitalize">{template.category} • {template.status}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview({ name: template.name, subject: template.subject, body: template.body })}
                          className="flex items-center gap-1"
                        >
                          <Eye size={13} />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleTemplateEdit(template)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleTemplateDelete(template._id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-text-light truncate"><strong>Subject:</strong> {template.subject}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduling & Sending Card */}
        <Card className="border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Schedule / Send Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleName">Campaign Name</Label>
                <Input
                  id="scheduleName"
                  placeholder="e.g. Community Feature Broadcast"
                  value={scheduleForm.name}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTemplate">Template</Label>
                <select
                  id="scheduleTemplate"
                  value={scheduleForm.templateId}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, templateId: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select template</option>
                  {templates.map((template, idx) => (
                    <option key={template._id ?? `${template.name ?? 'template'}-${idx}`} value={template._id}>
                      {template.name} ({template.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleSegment">Recipient Audience</Label>
                <select
                  id="scheduleSegment"
                  value={scheduleForm.segment}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, segment: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                >
                  {SEGMENTS.map((segment) => (
                    <option key={segment.value} value={segment.value}>{segment.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleSendAt">Send At (your local time)</Label>
                <Input
                  id="scheduleSendAt"
                  type="datetime-local"
                  value={scheduleForm.sendAt}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, sendAt: event.target.value }))}
                />
                <p className="text-xs text-text-light">
                  Times are saved in UTC and shown back in your timezone. Send Now delivers immediately and does not wait for this time.
                </p>
              </div>

              {/* Specific Users / Custom Emails input */}
              {isSpecificUsers && (
                <div className="space-y-2 md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="specificEmails" className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <Mail size={15} />
                      Specific Recipient Emails
                    </Label>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {parsedEmailsCount} valid email{parsedEmailsCount !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                  <Textarea
                    id="specificEmails"
                    placeholder="Enter emails separated by comma or new lines, e.g.:&#10;user1@example.com, user2@example.com&#10;user3@example.com"
                    value={scheduleForm.specificEmails}
                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, specificEmails: event.target.value }))}
                    rows={4}
                    className="bg-white font-mono text-xs"
                  />
                  <p className="text-xs text-emerald-800">
                    Only these specified user email addresses will receive this campaign. Perfect for test runs or targeted announcements.
                  </p>
                </div>
              )}

              {isNewUsers && (
                <div className="space-y-2">
                  <Label htmlFor="newWithinDays">New within days</Label>
                  <Input
                    id="newWithinDays"
                    type="number"
                    min="1"
                    value={scheduleForm.newWithinDays}
                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, newWithinDays: Number(event.target.value) }))}
                  />
                </div>
              )}
              {isActiveUsers && (
                <div className="space-y-2">
                  <Label htmlFor="activeWithinDays">Active within days</Label>
                  <Input
                    id="activeWithinDays"
                    type="number"
                    min="1"
                    value={scheduleForm.activeWithinDays}
                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, activeWithinDays: Number(event.target.value) }))}
                  />
                </div>
              )}
              {isInactiveUsers && (
                <div className="space-y-2">
                  <Label htmlFor="inactiveDays">Inactive for days</Label>
                  <Input
                    id="inactiveDays"
                    type="number"
                    min="1"
                    value={scheduleForm.inactiveDays}
                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, inactiveDays: Number(event.target.value) }))}
                  />
                </div>
              )}
              {isExamPrep && (
                <div className="space-y-2">
                  <Label htmlFor="examDaysBefore">Exam window (days)</Label>
                  <Input
                    id="examDaysBefore"
                    type="number"
                    min="1"
                    value={scheduleForm.examDaysBefore}
                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, examDaysBefore: Number(event.target.value) }))}
                  />
                </div>
              )}
            </div>

            {scheduleSummary && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span><strong>Target:</strong> {scheduleSummary}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleScheduleSubmit()} disabled={savingSchedule} className="bg-emerald-600 hover:bg-emerald-700">
                {savingSchedule ? 'Scheduling...' : 'Create Campaign Schedule'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={savingSchedule || runningSchedules}
                onClick={() => handleScheduleSubmit({ sendImmediately: true })}
              >
                Create & Send Now
              </Button>
            </div>

            {/* List of Schedules */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-text-dark text-base">Campaign Schedules & History</h3>
              {schedules.length === 0 ? (
                <p className="text-sm text-text-light py-4 text-center">No campaigns scheduled yet.</p>
              ) : (
                schedules.map((schedule, idx) => (
                  <Card key={schedule._id ?? `${schedule.name ?? 'schedule'}-${schedule.sendAt ?? idx}`} className="border border-border bg-slate-50">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-dark">{schedule.name}</p>
                          <p className="text-xs text-text-light">
                            Template: <strong>{schedule.templateId?.name || 'Unknown'}</strong> • Audience:{' '}
                            <span className="font-medium text-emerald-800">
                              {schedule.segment === 'specific_users'
                                ? 'Specific Users'
                                : SEGMENTS.find((s) => s.value === schedule.segment)?.label || schedule.segment}
                            </span>
                          </p>
                          <p className="text-xs text-text-light">
                            Send at: {formatSendAt(schedule.sendAt)}
                          </p>
                          {schedule.specificEmails && (
                            <p className="text-xs text-slate-500 font-mono truncate max-w-md">
                              Recipients: {schedule.specificEmails}
                            </p>
                          )}
                          {schedule.lastError && (
                            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                              <AlertCircle size={12} />
                              {schedule.lastError}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => runSchedules(schedule._id)}
                            disabled={runningSchedules || schedule.status !== 'scheduled'}
                          >
                            Send Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelSchedule(schedule._id)}
                            disabled={schedule.status !== 'scheduled'}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={`/admin/email-campaigns/${schedule._id}`}>View recipients</a>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSchedule(schedule._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-text-light">
                        Status:{' '}
                        <span
                          className={`font-semibold ${
                            schedule.status === 'sent'
                              ? 'text-emerald-700'
                              : schedule.status === 'failed'
                              ? 'text-red-600'
                              : schedule.status === 'scheduled'
                              ? 'text-blue-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {schedule.status.toUpperCase()}
                        </span>{' '}
                        {schedule.sentCount !== undefined ? `• Sent to: ${schedule.sentCount} user(s)` : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {previewOpen && previewTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-3 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-text-dark">{previewTemplate.name}</p>
                <p className="truncate text-xs text-text-light">Subject: {previewTemplate.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      previewDevice === 'mobile' ? 'bg-emerald-600 text-white' : 'text-text-light hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone size={14} />
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      previewDevice === 'desktop' ? 'bg-emerald-600 text-white' : 'text-text-light hover:bg-slate-100'
                    }`}
                  >
                    <Monitor size={14} />
                    Desktop
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 justify-center overflow-auto bg-slate-100 p-4">
              <div
                className={`h-full shrink-0 overflow-hidden bg-white transition-all ${
                  previewDevice === 'mobile'
                    ? 'rounded-[2rem] border-[6px] border-slate-800 shadow-xl'
                    : 'rounded-xl border border-slate-300 shadow-lg'
                }`}
                style={{ width: previewDevice === 'mobile' ? 390 : 720, maxWidth: '100%' }}
              >
                <iframe
                  title="Email preview"
                  srcDoc={buildCampaignEmailHtml(previewTemplate.body)}
                  className="h-full w-full border-0 bg-white"
                  sandbox=""
                />
              </div>
            </div>

            <div className="border-t border-border px-4 py-2 text-center text-xs text-text-light">
              Rendered through the same responsive shell used when sending — what you see is what recipients get.
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
