'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Hash,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Search,
  MessageSquare,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

interface CommunityCategoryItem {
  isHidden?: boolean
  id: string
  name: string
  slug: string
  description: string | null
  displayOrder: number
  threadCount: number
  createdAt: string
  updatedAt: string
}

export default function AdminCommunitySubjectsPage() {
  const [categories, setCategories] = useState<CommunityCategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createPending, setCreatePending] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    description: '',
    displayOrder: 0,
  })

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editPending, setEditPending] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CommunityCategoryItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    displayOrder: 0,
  })

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<CommunityCategoryItem | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')

  // Sync state
  const [syncing, setSyncing] = useState(false)

  async function toggleHidden(cat: CommunityCategoryItem) {
    const next = !cat.isHidden
    const res = await fetch(`/api/admin/community-categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: next }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Could not update subject')
      return
    }
    toast.success(next ? `"${cat.name}" is hidden from members.` : `"${cat.name}" is visible again.`)
    await fetchCategories()
  }

  async function fetchCategories() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/community-categories', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load community subjects')
      setCategories(data.categories || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load community subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Auto-fill slug from name in Create Form if not manually modified
  function handleCreateNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setCreateForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === slug.slice(0, -1) ? slug : prev.slug,
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (createPending) return
    setCreatePending(true)
    try {
      const res = await fetch('/api/admin/community-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create subject')

      toast.success(`Subject "${data.category.name}" created successfully!`)
      setIsCreateOpen(false)
      setCreateForm({ name: '', slug: '', description: '', displayOrder: (categories.length + 1) * 10 })
      await fetchCategories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create subject')
    } finally {
      setCreatePending(false)
    }
  }

  function openEdit(category: CommunityCategoryItem) {
    setEditingCategory(category)
    setEditForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      displayOrder: category.displayOrder,
    })
    setIsEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCategory || editPending) return
    setEditPending(true)
    try {
      const res = await fetch(`/api/admin/community-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update subject')

      toast.success(`Subject "${data.category.name}" updated successfully!`)
      setIsEditOpen(false)
      setEditingCategory(null)
      await fetchCategories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subject')
    } finally {
      setEditPending(false)
    }
  }

  function openDelete(category: CommunityCategoryItem) {
    setDeletingCategory(category)
    setReassignTargetId('')
    setIsDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingCategory || deletePending) return
    setDeletePending(true)
    try {
      const url = `/api/admin/community-categories/${deletingCategory.id}${
        deletingCategory.threadCount > 0 && reassignTargetId
          ? `?reassignTo=${encodeURIComponent(reassignTargetId)}`
          : ''
      }`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete subject')

      toast.success(data.message || `Subject "${deletingCategory.name}" deleted.`)
      setIsDeleteOpen(false)
      setDeletingCategory(null)
      await fetchCategories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete subject')
    } finally {
      setDeletePending(false)
    }
  }

  async function handleSyncExamSubjects() {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/community-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-exam-subjects' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync exam subjects')

      toast.success(data.message || 'Exam subjects synced to community categories!')
      await fetchCategories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync exam subjects')
    } finally {
      setSyncing(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [categories, searchQuery])

  const totalThreads = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.threadCount || 0), 0)
  }, [categories])

  const mostActive = useMemo(() => {
    if (!categories.length) return null
    return [...categories].sort((a, b) => b.threadCount - a.threadCount)[0]
  }, [categories])

  return (
    <div className="min-h-screen bg-slate-50/60">
      <AdminHeader />

      <main className="mx-auto max-w-7xl px-4 pt-[76px] pb-12 sm:px-6 lg:pt-[88px] lg:px-8">
        {/* Top Header & Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Hash size={20} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Community Subjects & Tags
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Manage subjects and tags shown in the Preptio Community forum explorer and thread composer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={syncing || loading}
              onClick={handleSyncExamSubjects}
              className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
              title="Import any missing CA exam subjects into community categories"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-emerald-600" />}
              {syncing ? 'Syncing…' : 'Sync Exam Subjects'}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setCreateForm({
                  name: '',
                  slug: '',
                  description: '',
                  displayOrder: (categories.length + 1) * 10,
                })
                setIsCreateOpen(true)
              }}
              className="gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Subject / Tag
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Subjects & Tags
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{categories.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">Available for discussions & filters</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Community Discussions
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-700">{totalThreads}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">Threads categorized under subjects</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Most Active Subject
              </CardDescription>
              <CardTitle className="truncate text-xl font-bold text-slate-900">
                {mostActive ? mostActive.name : 'None yet'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                {mostActive ? `${mostActive.threadCount} discussions posted` : 'Create discussions to see activity'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Card with Search & Table */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Community Subjects Directory</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Click on any subject to edit its name, slug, description, or ordering.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search subjects or tags…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCategories}
                  disabled={loading}
                  className="h-9 w-9 p-0"
                  title="Reload list"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium">Loading community subjects…</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Hash size={24} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">No subjects found</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {searchQuery
                    ? `No subjects matching "${searchQuery}". Clear your search or create a new subject.`
                    : 'Get started by creating community discussion subjects or syncing from your exam curriculum.'}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateForm({
                        name: '',
                        slug: '',
                        description: '',
                        displayOrder: 10,
                      })
                      setIsCreateOpen(true)
                    }}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Plus size={14} className="mr-1" /> Add Subject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncExamSubjects}
                    disabled={syncing}
                  >
                    Sync Exam Subjects
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="w-[60px] text-center font-bold">Order</TableHead>
                      <TableHead className="font-bold">Subject / Tag</TableHead>
                      <TableHead className="font-bold">Slug</TableHead>
                      <TableHead className="font-bold">Description</TableHead>
                      <TableHead className="text-center font-bold">Discussions</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((cat) => (
                      <TableRow key={cat.id} className="hover:bg-slate-50/80">
                        <TableCell className="text-center font-mono text-xs text-slate-500">
                          {cat.displayOrder}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-800 border border-emerald-200/60">
                              {cat.name
                                .split(' ')
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </span>
                            <span className="font-semibold text-slate-900">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 font-mono">
                            {cat.slug}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-slate-600">
                          {cat.description || <span className="italic text-slate-400">No description</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link
                            href={`/community?category=${cat.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                            title="View discussions under this subject"
                          >
                            <MessageSquare size={12} />
                            {cat.threadCount}
                            <ExternalLink size={10} className="ml-0.5 opacity-60" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(cat)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-700"
                              title="Edit Subject"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleHidden(cat)}
                              className="h-8 px-2 text-xs text-slate-600 hover:text-amber-700"
                              title={cat.isHidden ? 'Show this subject to members' : 'Hide this subject from members'}
                            >
                              {cat.isHidden ? 'Show' : 'Hide'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDelete(cat)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                              title="Delete Subject"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} className="text-emerald-600" />
              Add Community Subject / Tag
            </DialogTitle>
            <DialogDescription>
              Create a new subject tag for community students to categorize discussions and ask questions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="create-name" className="text-xs font-semibold">
                Subject Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                required
                placeholder="e.g. Audit & Assurance"
                value={createForm.name}
                onChange={(e) => handleCreateNameChange(e.target.value)}
                className="mt-1"
                disabled={createPending}
              />
            </div>

            <div>
              <Label htmlFor="create-slug" className="text-xs font-semibold">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-slug"
                required
                placeholder="e.g. audit-assurance"
                value={createForm.slug}
                onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                className="mt-1 font-mono text-xs"
                disabled={createPending}
              />
              <p className="mt-1 text-[11px] text-slate-400">Used in URL: /community?category={createForm.slug || 'slug'}</p>
            </div>

            <div>
              <Label htmlFor="create-desc" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Textarea
                id="create-desc"
                placeholder="Short description displayed in the subject explorer..."
                rows={2}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="mt-1 resize-none text-xs"
                disabled={createPending}
              />
            </div>

            <div>
              <Label htmlFor="create-order" className="text-xs font-semibold">
                Display Order
              </Label>
              <Input
                id="create-order"
                type="number"
                value={createForm.displayOrder}
                onChange={(e) => setCreateForm({ ...createForm, displayOrder: parseInt(e.target.value) || 0 })}
                className="mt-1"
                disabled={createPending}
              />
              <p className="mt-1 text-[11px] text-slate-400">Lower numbers appear first in the sidebar explorer.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={createPending}
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPending || !createForm.name.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {createPending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                Create Subject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} className="text-emerald-600" />
              Edit Community Subject
            </DialogTitle>
            <DialogDescription>
              Update subject details. Changes will reflect across community discussion feeds.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name" className="text-xs font-semibold">
                Subject Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1"
                disabled={editPending}
              />
            </div>

            <div>
              <Label htmlFor="edit-slug" className="text-xs font-semibold">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-slug"
                required
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                className="mt-1 font-mono text-xs"
                disabled={editPending}
              />
            </div>

            <div>
              <Label htmlFor="edit-desc" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="edit-desc"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 resize-none text-xs"
                disabled={editPending}
              />
            </div>

            <div>
              <Label htmlFor="edit-order" className="text-xs font-semibold">
                Display Order
              </Label>
              <Input
                id="edit-order"
                type="number"
                value={editForm.displayOrder}
                onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })}
                className="mt-1"
                disabled={editPending}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={editPending}
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editPending || !editForm.name.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {editPending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              Delete Subject / Tag
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingCategory?.name}&rdquo;?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {deletingCategory && deletingCategory.threadCount > 0 ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-semibold">
                    Warning: {deletingCategory.threadCount} discussion(s) are categorized under this subject!
                  </p>
                  <p className="mt-1">
                    To prevent broken discussions, please select another subject to reassign these discussions to before deleting.
                  </p>
                </div>

                <div>
                  <Label htmlFor="reassign-select" className="text-xs font-semibold">
                    Reassign {deletingCategory.threadCount} discussions to:
                  </Label>
                  <select
                    id="reassign-select"
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    className="mt-1.5 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-emerald-500 focus:outline-none"
                    disabled={deletePending}
                  >
                    <option value="">Select destination subject…</option>
                    {categories
                      .filter((c) => c.id !== deletingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.threadCount} discussions)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                This subject has no discussions assigned to it. It can be safely deleted immediately.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deletePending ||
                (Boolean(deletingCategory && deletingCategory.threadCount > 0) && !reassignTargetId)
              }
              onClick={handleDelete}
            >
              {deletePending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
              Delete Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
