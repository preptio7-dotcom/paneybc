'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  DICEBEAR_STYLE_OPTIONS,
  MULTIAVATAR_PRESET_SEEDS,
  PRELOAD_AVATAR_COUNT,
  PREDEFINED_AVATAR_SEEDS,
  buildAvatarUrl,
  normalizeAvatarSeeds,
  type AvatarSource,
} from '@/lib/avatar'

type AvatarPreview = {
  seed: string
  avatarId: string
  url: string
}

type AvatarPackRow = {
  id: string
  name: string
  source: AvatarSource
  dicebearStyle: string
  variantsCount: number
  seeds: string[]
  isActive: boolean
  isDefault?: boolean
  createdAt: string
  updatedAt: string
  previews: AvatarPreview[]
}

const SOURCE_OPTIONS: Array<{ value: AvatarSource; label: string }> = [
  { value: 'dicebear', label: 'DiceBear' },
  { value: 'multiavatar', label: 'Multiavatar 3D' },
]

type PackFormState = {
  name: string
  source: AvatarSource
  styleMode: string
  customStyle: string
  variantsCount: number
  customSeeds: string
  setAsActive: boolean
}

const DEFAULT_STYLE = DICEBEAR_STYLE_OPTIONS[0]?.value || 'avataaars'

const DEFAULT_FORM: PackFormState = {
  name: '',
  source: 'dicebear',
  styleMode: DEFAULT_STYLE,
  customStyle: '',
  variantsCount: 20,
  customSeeds: '',
  setAsActive: false,
}

function parseSeedText(value: string, variantsCount: number, source: AvatarSource) {
  const text = String(value || '').trim()
  const split = text
    ? text
      .split(/[\n,]/g)
      .map((item) => item.trim())
      .filter(Boolean)
    : source === 'multiavatar'
      ? [...MULTIAVATAR_PRESET_SEEDS]
      : [...PREDEFINED_AVATAR_SEEDS]
  return normalizeAvatarSeeds(split, variantsCount)
}

function formStyleValue(form: PackFormState) {
  if (form.source !== 'dicebear') {
    return DEFAULT_STYLE
  }
  if (form.styleMode === 'custom') {
    return form.customStyle.trim() || DEFAULT_STYLE
  }
  return form.styleMode
}

function sourceLabel(source: AvatarSource) {
  return SOURCE_OPTIONS.find((option) => option.value === source)?.label || source
}

function formatSeedLabel(source: AvatarSource) {
  if (source === 'multiavatar') {
    return 'Custom Seeds (optional, comma or newline separated)'
  }
  return 'Custom Seeds (optional, comma or newline separated)'
}

function sourceHelperText(source: AvatarSource) {
  if (source === 'multiavatar') {
    return 'Multiavatar uses geometric avatar generation based on each seed value.'
  }
  return 'DiceBear style is applied to each seed to generate SVG avatars.'
}

function AvatarPreviewCell({
  src,
  alt,
  eager,
}: {
  src: string
  alt: string
  eager?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="relative h-16 w-16 rounded-full border border-slate-200 bg-slate-100 overflow-hidden">
      {!loaded && !failed ? <span className="absolute inset-0 avatar-shimmer" aria-hidden /> : null}
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-500 px-2 text-center">
          Preview unavailable
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading={eager ? 'eager' : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function AvatarPreviewGrid({
  seeds,
  style,
  source,
  refreshKey,
  prefix,
}: {
  seeds: string[]
  style: string
  source: AvatarSource
  refreshKey: number
  prefix: string
}) {
  const previewSeeds = seeds.slice(0, 6)
  return (
    <div className="grid grid-cols-3 gap-3">
      {previewSeeds.map((seed, index) => (
        <AvatarPreviewCell
          key={`${prefix}-${seed}-${index}-${refreshKey}`}
          src={buildAvatarUrl(style, seed, source)}
          alt={`${seed} preview`}
          eager={index < PRELOAD_AVATAR_COUNT}
        />
      ))}
    </div>
  )
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
  const [createPreviewRefreshKey, setCreatePreviewRefreshKey] = useState(0)
  const [editPreviewRefreshKey, setEditPreviewRefreshKey] = useState(0)

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
    () => parseSeedText(form.customSeeds, form.variantsCount, form.source).slice(0, 20),
    [form.customSeeds, form.variantsCount, form.source]
  )
  const previewStyle = formStyleValue(form)

  const openCreateModal = () => {
    setForm(DEFAULT_FORM)
    setCreatePreviewRefreshKey((key) => key + 1)
    setCreateOpen(true)
  }

  const openEditModal = (pack: AvatarPackRow) => {
    setEditTarget(pack)
    const source = (pack.source || 'dicebear') as AvatarSource
    const styleInPreset = DICEBEAR_STYLE_OPTIONS.some((styleOption) => styleOption.value === pack.dicebearStyle)
    setForm({
      name: pack.name,
      source,
      styleMode: styleInPreset ? pack.dicebearStyle : 'custom',
      customStyle: styleInPreset ? '' : pack.dicebearStyle,
      variantsCount: pack.variantsCount,
      customSeeds: pack.seeds.join(', '),
      setAsActive: pack.id === activeAvatarPackId,
    })
    setEditPreviewRefreshKey((key) => key + 1)
  }

  const submitCreate = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          source: form.source,
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
          source: form.source,
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

  const setDefaultPack = async (packId: string) => {
    try {
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', packId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to set default pack')
      toast({ title: 'Default updated', description: 'Selected avatar pack is now the default.' })
      await loadPacks()
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
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

  const activatePack = async (packId: string) => {
    try {
      const response = await fetch('/api/admin/avatar-packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-status', packId, isActive: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to activate pack')
      toast({ title: 'Pack activated', description: 'Avatar pack is now active for user picker tabs.' })
      await loadPacks()
    } catch (error: any) {
      toast({ title: 'Activation failed', description: error.message, variant: 'destructive' })
    }
  }

  const showStylePicker = form.source === 'dicebear'

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-slate-50 p-4 md:p-6 pt-20">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Avatar Packs</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage avatar sources and control which packs are active for users.
              </p>
            </div>
            <Button onClick={openCreateModal}>+ Add New Pack</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pack Library</CardTitle>
              <CardDescription>Active packs appear as tabs in the user avatar picker.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-slate-500">Loading avatar packs...</p>
              ) : packs.length === 0 ? (
                <p className="text-sm text-slate-500">No avatar packs available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-3 pr-4">Pack Name</th>
                        <th className="py-3 pr-4">Source</th>
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
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            <div>{pack.name}</div>
                            {pack.id === activeAvatarPackId || pack.isDefault ? (
                              <span className="inline-flex mt-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                                Default
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{sourceLabel(pack.source)}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                            {pack.source === 'dicebear' ? pack.dicebearStyle : '—'}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{pack.variantsCount}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pack.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
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
                              {pack.id !== activeAvatarPackId ? (
                                <Button size="sm" variant="outline" onClick={() => setDefaultPack(pack.id)}>
                                  Set Default
                                </Button>
                              ) : null}
                              {!pack.isActive ? (
                                <Button size="sm" variant="outline" onClick={() => activatePack(pack.id)}>
                                  Activate
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => deactivatePack(pack.id)}>
                                  Deactivate
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setPreviewTarget(pack)}>
                                Preview All
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEditModal(pack)}>
                                Edit
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
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      source: value as AvatarSource,
                      styleMode: DEFAULT_STYLE,
                      customStyle: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((sourceOption) => (
                      <SelectItem key={sourceOption.value} value={sourceOption.value}>
                        {sourceOption.label}
                      </SelectItem>
                    ))}
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
            {showStylePicker ? (
              <>
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
                      {DICEBEAR_STYLE_OPTIONS.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
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
              </>
            ) : null}
            <div className="space-y-1">
              <Label>{formatSeedLabel(form.source)}</Label>
              <Textarea
                value={form.customSeeds}
                onChange={(event) => setForm((prev) => ({ ...prev, customSeeds: event.target.value }))}
                placeholder="Alpha, Beta, Gamma..."
                rows={4}
              />
              <p className="text-xs text-slate-500">{sourceHelperText(form.source)}</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.setAsActive}
                onChange={(event) => setForm((prev) => ({ ...prev, setAsActive: event.target.checked }))}
              />
              Set as default pack immediately
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Live Preview</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreatePreviewRefreshKey((key) => key + 1)}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Refresh Preview
                </Button>
              </div>
              <AvatarPreviewGrid
                seeds={previewSeeds}
                style={previewStyle}
                source={form.source}
                refreshKey={createPreviewRefreshKey}
                prefix="create"
              />
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
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      source: value as AvatarSource,
                      styleMode: DEFAULT_STYLE,
                      customStyle: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((sourceOption) => (
                      <SelectItem key={sourceOption.value} value={sourceOption.value}>
                        {sourceOption.label}
                      </SelectItem>
                    ))}
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
            {form.source === 'dicebear' ? (
              <>
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
                      {DICEBEAR_STYLE_OPTIONS.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
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
              </>
            ) : null}
            <div className="space-y-1">
              <Label>{formatSeedLabel(form.source)}</Label>
              <Textarea
                value={form.customSeeds}
                onChange={(event) => setForm((prev) => ({ ...prev, customSeeds: event.target.value }))}
                rows={4}
              />
              <p className="text-xs text-slate-500">{sourceHelperText(form.source)}</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.setAsActive}
                onChange={(event) => setForm((prev) => ({ ...prev, setAsActive: event.target.checked }))}
              />
              Set as default pack
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Live Preview</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPreviewRefreshKey((key) => key + 1)}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Refresh Preview
                </Button>
              </div>
              <AvatarPreviewGrid
                seeds={previewSeeds}
                style={previewStyle}
                source={form.source}
                refreshKey={editPreviewRefreshKey}
                prefix="edit"
              />
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
            {(previewTarget?.seeds || []).map((seed, index) => (
              <div key={`full-preview-${seed}-${index}`} className="flex flex-col items-center gap-1">
                <img
                  src={buildAvatarUrl(
                    previewTarget?.dicebearStyle || DEFAULT_STYLE,
                    seed,
                    (previewTarget?.source || 'dicebear') as AvatarSource
                  )}
                  alt={seed}
                  className="h-14 w-14 rounded-full border border-slate-200 object-cover"
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

      <style jsx global>{`
        .avatar-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: avatarShimmer 1.5s linear infinite;
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
    </>
  )
}
