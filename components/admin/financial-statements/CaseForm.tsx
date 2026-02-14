'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { LineItemManager, LineItemDraft } from './LineItemManager'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildInlinePdfUrl } from '@/lib/utils'

export interface CaseFormValues {
  caseNumber: string
  title: string
  trialBalancePdfUrl: string
  additionalInfo?: string
  defaultTimeLimit: number
  isActive: boolean
  showThousandsNote: boolean
  sociLineItems: LineItemDraft[]
  sofpLineItems: LineItemDraft[]
}

interface CaseFormProps {
  initialValues?: CaseFormValues
  submitLabel: string
  onSubmit: (values: CaseFormValues) => Promise<boolean>
  onCancel: () => void
  draftKey?: string
}

const makeDefaultLineItem = (order = 1): LineItemDraft => ({
  id: crypto.randomUUID(),
  heading: '',
  inputType: 'dropdown',
  groupLabel: '',
  dropdownOptions: ['', ''],
  correctValue: '',
  marks: 1,
  displayOrder: order,
})

const normalizeLineItem = (item: any, index: number, includeGroup: boolean): LineItemDraft => {
  const inputType = item?.inputType === 'manual' ? 'manual' : 'dropdown'
  const rawOptions = Array.isArray(item?.dropdownOptions) ? item.dropdownOptions.map((option: any) => String(option ?? '')) : []
  const dropdownOptions =
    inputType === 'manual'
      ? rawOptions.length > 0
        ? rawOptions
        : ['', '']
      : rawOptions.length >= 2
        ? rawOptions
        : rawOptions.length === 1
          ? [...rawOptions, '']
          : ['', '']

  return {
    id: item?.id ? String(item.id) : crypto.randomUUID(),
    heading: String(item?.heading ?? ''),
    inputType,
    groupLabel: includeGroup ? String(item?.groupLabel ?? '') : '',
    dropdownOptions,
    correctValue: String(item?.correctValue ?? ''),
    marks: Number(item?.marks ?? 1),
    displayOrder: Number(item?.displayOrder ?? index + 1),
  }
}

const normalizeForm = (payload: any): CaseFormValues => {
  const data = payload?.data ?? payload ?? {}
  const sociSource = data?.sociLineItems?.create ?? data?.sociLineItems ?? []
  const sofpSource = data?.sofpLineItems?.create ?? data?.sofpLineItems ?? []

  return {
    caseNumber: String(data?.caseNumber ?? ''),
    title: String(data?.title ?? ''),
    trialBalancePdfUrl: String(data?.trialBalancePdfUrl ?? ''),
    additionalInfo: String(data?.additionalInfo ?? ''),
    defaultTimeLimit: Number(data?.defaultTimeLimit ?? 45),
    isActive: Boolean(data?.isActive ?? true),
    showThousandsNote: Boolean(data?.showThousandsNote ?? false),
    sociLineItems: Array.isArray(sociSource) && sociSource.length > 0 ? sociSource.map((item: any, index: number) => normalizeLineItem(item, index, false)) : [makeDefaultLineItem(1)],
    sofpLineItems: Array.isArray(sofpSource) && sofpSource.length > 0 ? sofpSource.map((item: any, index: number) => normalizeLineItem(item, index, true)) : [makeDefaultLineItem(1)],
  }
}

export function CaseForm({ initialValues, submitLabel, onSubmit, onCancel, draftKey }: CaseFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<CaseFormValues>(() => normalizeForm(initialValues))
  const [isUploading, setIsUploading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateForm = (field: keyof CaseFormValues, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!draftKey) return
    try {
      const stored = localStorage.getItem(draftKey)
      if (!stored) return
      const parsed = JSON.parse(stored)
      const payload = parsed?.form ?? parsed
      if (!payload) return
      setForm(normalizeForm(payload))
      setHasDraft(true)
      setLastSavedAt(parsed?.savedAt || null)
      toast({ title: 'Draft restored', description: 'We loaded your last saved draft.' })
    } catch {
      // ignore malformed drafts
    }
  }, [draftKey, toast])

  useEffect(() => {
    if (!draftKey) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        const savedAt = new Date().toISOString()
        localStorage.setItem(draftKey, JSON.stringify({ form, savedAt }))
        setHasDraft(true)
        setLastSavedAt(savedAt)
      } catch {
        // ignore storage errors
      }
    }, 600)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [draftKey, form])

  const clearDraft = () => {
    if (!draftKey) return
    localStorage.removeItem(draftKey)
    setHasDraft(false)
    setLastSavedAt(null)
    toast({ title: 'Draft cleared', description: 'Draft removed from this browser.' })
  }

  const handlePdfUpload = async (file: File) => {
    if (!file) return
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Invalid file', description: 'Please upload a PDF file.', variant: 'destructive' })
      return
    }
    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/admin/financial-statements/r2-upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Upload failed')
      }
      if (!uploadData.publicUrl) {
        throw new Error('Upload succeeded but no URL returned')
      }

      const inlineUrl = buildInlinePdfUrl(uploadData.publicUrl)
      updateForm('trialBalancePdfUrl', inlineUrl)
      toast({ title: 'Uploaded', description: 'PDF uploaded and URL filled in.' })
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Unable to upload PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const totals = useMemo(() => {
    const sociTotal = form.sociLineItems.reduce((sum, item) => sum + (Number(item.marks) || 0), 0)
    const sofpTotal = form.sofpLineItems.reduce((sum, item) => sum + (Number(item.marks) || 0), 0)
    const grand = Number((sociTotal + sofpTotal).toFixed(2))
    return { sociTotal, sofpTotal, grand }
  }, [form.sociLineItems, form.sofpLineItems])

  const hasInvalidTotals = totals.grand !== 20
  const hasEmptySection = form.sociLineItems.length === 0 || form.sofpLineItems.length === 0

  const handleSubmit = async () => {
    if (!form.caseNumber.trim() || !form.title.trim() || !form.trialBalancePdfUrl.trim()) {
      toast({ title: 'Missing fields', description: 'Case number, title, and PDF URL are required.', variant: 'destructive' })
      return
    }
    if (hasInvalidTotals) {
      toast({ title: 'Marks mismatch', description: 'Total marks must equal 20.', variant: 'destructive' })
      return
    }
    if (hasEmptySection) {
      toast({ title: 'Missing line items', description: 'Add at least one line item to both SOCI and SOFP.', variant: 'destructive' })
      return
    }

    try {
      setIsSaving(true)
      const success = await onSubmit(form)
      if (success && draftKey) {
        localStorage.removeItem(draftKey)
        setHasDraft(false)
        setLastSavedAt(null)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleImport = () => {
    if (!importJson.trim()) {
      toast({ title: 'Paste JSON', description: 'Add the JSON block before importing.', variant: 'destructive' })
      return
    }
    try {
      const parsed = JSON.parse(importJson)
      setForm(normalizeForm(parsed))
      toast({ title: 'Imported', description: 'Form fields filled from JSON.' })
    } catch (error: any) {
      toast({ title: 'Invalid JSON', description: error?.message || 'Could not parse JSON.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-white">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Set case details and trial balance PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-dark">Case Number *</label>
              <Input
                value={form.caseNumber}
                onChange={(event) => updateForm('caseNumber', event.target.value)}
                placeholder="Q1, Trial Balance 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-dark">Case Title *</label>
              <Input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="Trial Balance - June 2024"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-dark">Trial Balance PDF URL *</label>
            <Input
              type="url"
              value={form.trialBalancePdfUrl}
              onChange={(event) => updateForm('trialBalancePdfUrl', event.target.value)}
              onBlur={(event) => {
                const next = buildInlinePdfUrl(event.target.value)
                if (next && next !== event.target.value) {
                  updateForm('trialBalancePdfUrl', next)
                }
              }}
              placeholder="https://res.cloudinary.com/..."
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!form.trialBalancePdfUrl}
              >
                Preview
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handlePdfUpload(file)
                }}
              />
              <span className="text-xs text-text-light">
                PDF upload fills the URL automatically.
              </span>
            </div>
            <p className="text-xs text-text-light">
              Use a public PDF URL. Cloudflare R2 public bucket is recommended.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-dark">Additional Information (Optional)</label>
            <Textarea
              rows={4}
              value={form.additionalInfo}
              onChange={(event) => updateForm('additionalInfo', event.target.value)}
              placeholder="Any additional instructions for students..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-dark">Default Time Limit (minutes)</label>
              <Input
                type="number"
                min={15}
                max={120}
                value={form.defaultTimeLimit}
                onChange={(event) => updateForm('defaultTimeLimit', Number(event.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-dark">Active Status</p>
                <p className="text-xs text-text-light">Make this case visible to students.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(value) => updateForm('isActive', value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-dark">Show Rs. 000 Note</p>
              <p className="text-xs text-text-light">Display the “values in thousands” reminder above SOCI.</p>
            </div>
            <Switch
              checked={form.showThousandsNote}
              onCheckedChange={(value) => updateForm('showThousandsNote', value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-white">
        <CardHeader>
          <CardTitle>Quick Import (Optional)</CardTitle>
          <CardDescription>Paste a JSON block to auto-fill this case.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
            placeholder='Paste JSON like {"data": {...}} or just the data object.'
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-light">
            <Button type="button" variant="outline" onClick={handleImport}>
              Apply JSON
            </Button>
            <span>Supports prisma-style payloads with nested `sociLineItems.create` and `sofpLineItems.create`.</span>
          </div>
        </CardContent>
      </Card>

      <LineItemManager
        label="SOCI"
        items={form.sociLineItems}
        onChange={(items) => updateForm('sociLineItems', items)}
      />

      <LineItemManager
        label="SOFP"
        items={form.sofpLineItems}
        onChange={(items) => updateForm('sofpLineItems', items)}
        groupOptions={[
          'Non-current assets',
          'Current assets',
          "Owner's Equity",
          'Non-current liabilities',
          'Current liabilities',
        ]}
      />

      <Card className="border-border bg-white">
        <CardHeader>
          <CardTitle>Marks Summary</CardTitle>
          <CardDescription>Total marks must equal exactly 20.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>SOCI Total</span>
            <span className={totals.sociTotal > 20 ? 'text-rose-600 font-semibold' : 'text-text-dark'}>
              {totals.sociTotal}
            </span>
          </div>
          <div className="flex justify-between">
            <span>SOFP Total</span>
            <span className={totals.sofpTotal > 20 ? 'text-rose-600 font-semibold' : 'text-text-dark'}>
              {totals.sofpTotal}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Grand Total</span>
            <span className={hasInvalidTotals ? 'text-rose-600' : 'text-emerald-600'}>
              {totals.grand} / 20
            </span>
          </div>
          {hasInvalidTotals && (
            <p className="text-xs text-rose-600">
              Total marks must equal exactly 20 before saving.
            </p>
          )}
        </CardContent>
      </Card>

      {draftKey && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-xs text-text-light">
          <span>
            Draft auto-saves as you type.
            {lastSavedAt ? ` Last saved ${new Date(lastSavedAt).toLocaleString()}.` : ''}
          </span>
          <div className="flex items-center gap-2">
            {hasDraft && (
              <Button type="button" variant="outline" size="sm" onClick={clearDraft}>
                Clear draft
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || hasInvalidTotals || hasEmptySection}>
          {isSaving ? 'Saving...' : submitLabel}
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Trial Balance PDF Preview</DialogTitle>
          </DialogHeader>
          {form.trialBalancePdfUrl ? (
            <iframe
              src={buildInlinePdfUrl(form.trialBalancePdfUrl)}
              className="w-full h-[70vh] rounded-md border border-slate-200"
              title="Trial Balance Preview"
            />
          ) : (
            <p className="text-sm text-text-light">No PDF URL provided.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
