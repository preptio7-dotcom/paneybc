'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  status: 'scheduled' | 'sent' | 'cancelled'
  sentAt?: string
  sentCount?: number
  templateId?: Template
  newWithinDays?: number
  activeWithinDays?: number
  inactiveDays?: number
  examDaysBefore?: number
}

const TEMPLATE_CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'general', label: 'General' },
]

const SEGMENTS = [
  { value: 'new_users', label: 'New Users' },
  { value: 'active_users', label: 'Active Users' },
  { value: 'inactive_users', label: 'Inactive Users' },
  { value: 'exam_prep', label: 'Exam Prep Window' },
  { value: 'all_users', label: 'All Users' },
]

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
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    templateId: '',
    segment: 'new_users',
    sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    newWithinDays: 1,
    activeWithinDays: 7,
    inactiveDays: 14,
    examDaysBefore: 30,
  })

  const loadData = async () => {
    setLoading(true)
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
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTemplateSubmit = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) return
    setSavingTemplate(true)
    const response = await fetch('/api/admin/email-campaigns/templates', {
      method: editingTemplateId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTemplateId ? { id: editingTemplateId, ...templateForm } : templateForm),
    })
    if (response.ok) {
      setTemplateForm({ name: '', category: 'general', subject: '', body: '', status: 'draft' })
      setEditingTemplateId(null)
      await loadData()
    }
    setSavingTemplate(false)
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
  }

  const handleTemplateDelete = async (id: string) => {
    await fetch('/api/admin/email-campaigns/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadData()
  }

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.name || !scheduleForm.templateId || !scheduleForm.sendAt) return
    setSavingSchedule(true)
    const response = await fetch('/api/admin/email-campaigns/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleForm),
    })
    if (response.ok) {
      setScheduleForm((prev) => ({
        ...prev,
        name: '',
        sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      }))
      await loadData()
    }
    setSavingSchedule(false)
  }

  const runSchedules = async (scheduleId?: string) => {
    setRunningSchedules(true)
    await fetch('/api/admin/email-campaigns/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleId ? { scheduleId } : {}),
    })
    await loadData()
    setRunningSchedules(false)
  }

  const cancelSchedule = async (id: string) => {
    await fetch('/api/admin/email-campaigns/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    await loadData()
  }

  const deleteSchedule = async (id: string) => {
    await fetch('/api/admin/email-campaigns/schedules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadData()
  }

  const isNewUsers = scheduleForm.segment === 'new_users'
  const isActiveUsers = scheduleForm.segment === 'active_users'
  const isInactiveUsers = scheduleForm.segment === 'inactive_users'
  const isExamPrep = scheduleForm.segment === 'exam_prep'

  const scheduleSummary = useMemo(() => {
    const template = templates.find((item) => item._id === scheduleForm.templateId)
    if (!template) return ''
    return `${template.name} to ${SEGMENTS.find((item) => item.value === scheduleForm.segment)?.label || ''}`
  }, [templates, scheduleForm.templateId, scheduleForm.segment])

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12 px-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="font-heading text-3xl font-bold text-text-dark">Email Drip Campaigns</h1>
          <Button onClick={() => runSchedules()} disabled={runningSchedules || loading}>
            {runningSchedules ? 'Running...' : 'Run Due Schedules'}
          </Button>
        </div>

        <Card className="border border-border bg-white">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
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
                  value={templateForm.subject}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, subject: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="templateBody">Email Body (HTML allowed)</Label>
                <Textarea
                  id="templateBody"
                  value={templateForm.body}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={6}
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
              <Button onClick={handleTemplateSubmit} disabled={savingTemplate}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template, idx) => (
                <Card key={template._id ?? `${template.name ?? 'template'}-${template.subject ?? idx}`} className="border border-border bg-slate-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-text-dark">{template.name}</p>
                        <p className="text-xs text-text-light">{template.category} - {template.status}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleTemplateEdit(template)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleTemplateDelete(template._id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-text-light">Subject: {template.subject}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white">
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleName">Schedule Name</Label>
                <Input
                  id="scheduleName"
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
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleSegment">Segment</Label>
                <select
                  id="scheduleSegment"
                  value={scheduleForm.segment}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, segment: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SEGMENTS.map((segment) => (
                    <option key={segment.value} value={segment.value}>{segment.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleSendAt">Send At</Label>
                <Input
                  id="scheduleSendAt"
                  type="datetime-local"
                  value={scheduleForm.sendAt}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, sendAt: event.target.value }))}
                />
              </div>
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
              <p className="text-sm text-text-light">Summary: {scheduleSummary}</p>
            )}
            <Button onClick={handleScheduleSubmit} disabled={savingSchedule}>
              {savingSchedule ? 'Scheduling...' : 'Create Schedule'}
            </Button>

            <div className="space-y-3">
              {schedules.map((schedule, idx) => (
                <Card key={schedule._id ?? `${schedule.name ?? 'schedule'}-${schedule.sendAt ?? idx}`} className="border border-border bg-slate-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-dark">{schedule.name}</p>
                        <p className="text-xs text-text-light">
                          Template: {schedule.templateId?.name || 'Unknown'} - Segment: {SEGMENTS.find((s) => s.value === schedule.segment)?.label || schedule.segment}
                        </p>
                        <p className="text-xs text-text-light">
                          Send at: {new Date(schedule.sendAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
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
                          variant="destructive"
                          onClick={() => deleteSchedule(schedule._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-text-light">
                      Status: {schedule.status} {schedule.sentCount ? `• Sent: ${schedule.sentCount}` : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
