'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  _count?: {
    posts?: number
  }
}

const COLOR_PRESETS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0284c7', '#db2777']

function normalizeSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminBlogCategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: COLOR_PRESETS[0] })

  const sortedRows = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/blog/categories', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load categories')
      setCategories(Array.isArray(data?.categories) ? data.categories : [])
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to load categories', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const openCreate = () => {
    setEditingCategory(null)
    setForm({ name: '', slug: '', description: '', color: COLOR_PRESETS[0] })
    setModalOpen(true)
  }

  const openEdit = (category: CategoryRow) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || COLOR_PRESETS[0],
    })
    setModalOpen(true)
  }

  const saveCategory = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Category name required', variant: 'destructive' })
      return
    }

    try {
      setIsSaving(true)
      const endpoint = editingCategory
        ? `/api/admin/blog/categories/${editingCategory.id}`
        : '/api/admin/blog/categories'
      const method = editingCategory ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          color: form.color,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to save category')

      setModalOpen(false)
      await loadCategories()
      toast({ title: editingCategory ? 'Category updated' : 'Category created' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save category', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCategory = async (category: CategoryRow) => {
    const confirmed = window.confirm('Delete this category? Categories with posts cannot be deleted.')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/blog/categories/${category.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to delete category')
      await loadCategories()
      toast({ title: 'Category deleted' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete category', variant: 'destructive' })
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pb-10 pt-[80px]">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/admin/blog" className="text-sm font-medium text-slate-500 hover:text-primary-green">
                Back to Blog Posts
              </Link>
              <h1 className="mt-1 font-heading text-3xl font-bold text-text-dark">Blog Categories</h1>
            </div>
            <Button className="bg-primary-green hover:bg-green-700" onClick={openCreate}>
              <Plus size={14} className="mr-1" />
              Add Category
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Slug</th>
                  <th className="p-3 text-left">Color</th>
                  <th className="p-3 text-left">Post Count</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((category) => (
                  <tr key={category.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{category.name}</p>
                      <p className="text-xs text-slate-500">{category.description || '-'}</p>
                    </td>
                    <td className="p-3 text-slate-600">{category.slug}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.color}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{category._count?.posts || 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600"
                          onClick={() => void deleteCategory(category)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && !sortedRows.length ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No categories found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Configure category details used for blog organization.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value
                  setForm((prev) => ({ ...prev, name, slug: editingCategory ? prev.slug : normalizeSlug(name) }))
                }}
              />
            </div>

            <div>
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: normalizeSlug(event.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value.slice(0, 240) }))}
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color }))}
                    className={`h-8 w-8 rounded-full border-2 ${form.color === color ? 'border-slate-900' : 'border-white'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary-green hover:bg-green-700" onClick={() => void saveCategory()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

