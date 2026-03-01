'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { buildAvatarUrl, normalizeAvatarSeeds, PRELOAD_AVATAR_COUNT } from '@/lib/avatar'

type AvatarPreview = {
  seed: string
  avatarId: string
  url: string
}

type AvatarPackRow = {
  id: string
  name: string
  dicebearStyle: string
  variantsCount: number
  seeds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  previews: AvatarPreview[]
}

const STYLE_OPTIONS = [
  'avataaars',
  'bottts',
  'pixel-art',
  'lorelei',
  'adventurer',
  'fun-emoji',
]

type PackFormState = {
  name: string
  styleMode: string
  customStyle: string
  variantsCount: number
  customSeeds: string
  setAsActive: boolean
}

const DEFAULT_FORM: PackFormState = {
  name: '',
  styleMode: STYLE_OPTIONS[0],
  customStyle: '',
  variantsCount: 20,
  customSeeds: '',
  setAsActive: false,
}

function parseSeedText(value: string, variantsCount: number) {
  const text = String(value || '').trim()
  const split = text ? text.split(',').map((item) => item.trim()) : []
  return normalizeAvatarSeeds(split, variantsCount)
}

function formStyleValue(form: PackFormState) {
  if (form.styleMode === 'custom') {
    return form.customStyle.trim() || STYLE_OPTIONS[0]
  }
  return form.styleMode
}

export default function AdminAvatarPacksPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [packs, setPacks] = useState<AvatarPackRow[]>([])
  const [activeAvatarPackId, setActiveAvatarPackId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AvatarPackRow | null>(null)
  const [previewTarget, setPreviewTarget] = useState<AvatarPackRow | null>(null)
  const [form, setForm] = useState<PackFormState>(DEFAULT_FORM)

  const loadPacks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/avatar-packs', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load avatar packs')
      }
      setPacks(Array.isArray(data.packs) ? data.packs : [])
      setActiveAvatarPackId(typeof data.activeAvatarPackId === 'string' ? data.activeAvatarPackId : null)
    } catch (error: any) {
      toast({
        title: 'Load failed',
        description: error.message || 'Unable to fetch avatar packs.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPacks()
  }, [])

  const previewSeeds = useMemo(
    () => parseSeedText(form.customSeeds, form.variantsCount).slice(0, 8),
    [form.customSeeds, form.variantsCount]
  )
  const previewStyle = formStyleValue(form)

  const openCreateModal = () => {
    setForm(DEFAULT_FORM)
    setCreateOpen(true)
  }

  const openEditModal = (pack: AvatarPackRow) => {
    setEditTarget(pack)
    const styleInPreset = STYLE_OPTIONS.includes(pack.dicebearStyle)
    setForm({
      name: pack.name,
      styleMode: styleInPreset ? pack.dicebearStyle : 'custom',
      customStyle: styleInPreset ? '' : pack.dicebearStyle,
      variantsCount: pack.variantsCount,
      customSeeds: pack.seeds.join(', '),
      setAsActive: pack.id === activeAvatarPackId,
    })
  }

  const submitCreate = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          dicebearStyle: previewStyle,
          variantsCount: form.variantsCount,
          seeds: previewSeeds,
          setAsActive: form.setAsActive,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create avatar pack')
      }
      toast({ title: 'Pack created', description: 'Avatar pack created successfully.' })
      setCreateOpen(false)
      await loadPacks()
    } catch (error: any) {
      toast({
        title: 'Create failed',
        description: error.message || 'Unable to create avatar pack.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const submitEdit = async () => {
    if (!editTarget) return
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          packId: editTarget.id,
          name: form.name,
          dicebearStyle: previewStyle,
          variantsCount: form.variantsCount,
          seeds: previewSeeds,
          setAsActive: form.setAsActive,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update avatar pack')
      }
      toast({ title: 'Pack updated', description: 'Avatar pack updated successfully.' })
      setEditTarget(null)
      await loadPacks()
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Unable to update avatar pack.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const setActivePack = async (packId: string) => {
    try {
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', packId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to activate pack')
      toast({ title: 'Pack activated', description: 'Selected avatar pack is now active.' })
      await loadPacks()
    } catch (error: any) {
      toast({ title: 'Activation failed', description: error.message, variant: 'destructive' })
    }
  }

  const deactivatePack = async (packId: string) => {
    try {
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', packId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate pack')
      toast({ title: 'Pack deactivated', description: 'Avatar pack was deactivated.' })
      await loadPacks()
    } catch (error: any) {
      toast({ title: 'Deactivation failed', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-slate-50 p-4 md:p-6 pt-20">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Avatar Packs</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage DiceBear avatar collections and control which pack is active for new users.
              </p>
            </div>
            <Button onClick={openCreateModal}>+ Add New Pack</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pack Library</CardTitle>
              <CardDescription>Only one avatar pack can be active at a time.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-slate-500">Loading avatar packs...</p>
              ) : packs.length === 0 ? (
                <p className="text-sm text-slate-500">No avatar packs available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-3 pr-4">Pack Name</th>
                        <th className="py-3 pr-4">Style</th>
                        <th className="py-3 pr-4">Variants</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Preview</th>
                        <th className="py-3 pr-4">Created</th>
                        <th className="py-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packs.map((pack) => (
                        <tr key={pack.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-semibold text-slate-900">{pack.name}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-600">{pack.dicebearStyle}</td>
                          <td className="py-3 pr-4 text-slate-700">{pack.variantsCount}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                pack.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {pack.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              {pack.previews.slice(0, 5).map((preview) => (
                                <img
                                  key={`${pack.id}-${preview.seed}`}
                                  src={preview.url}
                                  alt={`${pack.name} ${preview.seed}`}
                                  className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }).format(new Date(pack.createdAt))}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {!pack.isActive ? (
                                <Button size="sm" variant="outline" onClick={() => setActivePack(pack.id)}>
                                  Set as Active
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" onClick={() => setPreviewTarget(pack)}>
                                Preview All
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEditModal(pack)}>
                                Edit
                              </Button>
                              {pack.isActive ? (
                                <Button size="sm" variant="outline" onClick={() => deactivatePack(pack.id)}>
                                  Deactivate
                                </Button>
                              ) : null}
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
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Avatar Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Pack Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Summer Pack 2026"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>DiceBear Style</Label>
                <Select
                  value={form.styleMode}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, styleMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Variants Count</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={form.variantsCount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      variantsCount: Math.min(50, Math.max(5, Number(event.target.value) || 20)),
                    }))
                  }
                />
              </div>
            </div>
            {form.styleMode === 'custom' ? (
              <div className="space-y-1">
                <Label>Custom Style</Label>
                <Input
                  value={form.customStyle}
                  onChange={(event) => setForm((prev) => ({ ...prev, customStyle: event.target.value }))}
                  placeholder="Type DiceBear style string"
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Custom Seeds (optional, comma separated)</Label>
              <Textarea
                value={form.customSeeds}
                onChange={(event) => setForm((prev) => ({ ...prev, customSeeds: event.target.value }))}
                placeholder="Alpha, Beta, Gamma..."
                rows={3}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.setAsActive}
                onChange={(event) => setForm((prev) => ({ ...prev, setAsActive: event.target.checked }))}
              />
              Set as Active immediately
            </label>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Preview</p>
              <div className="grid grid-cols-4 gap-2">
                {previewSeeds.slice(0, 8).map((seed, index) => (
                  <img
                    key={`preview-${seed}-${index}`}
                    src={buildAvatarUrl(previewStyle, seed)}
                    alt={`${seed} preview`}
                    className="h-14 w-14 rounded-full border border-slate-200"
                    loading={index < PRELOAD_AVATAR_COUNT ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Pack'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => (!open ? setEditTarget(null) : undefined)}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Avatar Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Pack Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Pack name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>DiceBear Style</Label>
                <Select
                  value={form.styleMode}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, styleMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Variants Count</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={form.variantsCount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      variantsCount: Math.min(50, Math.max(5, Number(event.target.value) || 20)),
                    }))
                  }
                />
              </div>
            </div>
            {form.styleMode === 'custom' ? (
              <div className="space-y-1">
                <Label>Custom Style</Label>
                <Input
                  value={form.customStyle}
                  onChange={(event) => setForm((prev) => ({ ...prev, customStyle: event.target.value }))}
                  placeholder="Type DiceBear style string"
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Custom Seeds (optional, comma separated)</Label>
              <Textarea
                value={form.customSeeds}
                onChange={(event) => setForm((prev) => ({ ...prev, customSeeds: event.target.value }))}
                rows={3}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.setAsActive}
                onChange={(event) => setForm((prev) => ({ ...prev, setAsActive: event.target.checked }))}
              />
              Set as Active
            </label>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Preview</p>
              <div className="grid grid-cols-4 gap-2">
                {previewSeeds.slice(0, 8).map((seed, index) => (
                  <img
                    key={`preview-edit-${seed}-${index}`}
                    src={buildAvatarUrl(previewStyle, seed)}
                    alt={`${seed} preview`}
                    className="h-14 w-14 rounded-full border border-slate-200"
                    loading={index < PRELOAD_AVATAR_COUNT ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewTarget)} onOpenChange={(open) => (!open ? setPreviewTarget(null) : undefined)}>
        <DialogContent className="bg-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTarget?.name || 'Avatar Pack'} - Preview</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {(previewTarget?.seeds || []).map((seed) => (
              <div key={`full-preview-${seed}`} className="flex flex-col items-center gap-1">
                <img
                  src={buildAvatarUrl(previewTarget?.dicebearStyle || 'avataaars', seed)}
                  alt={seed}
                  className="h-14 w-14 rounded-full border border-slate-200"
                  loading="lazy"
                />
                <span className="text-[10px] text-slate-500 truncate max-w-[60px]">{seed}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
