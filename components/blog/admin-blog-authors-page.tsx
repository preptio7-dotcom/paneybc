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

type AuthorRow = {
  id: string
  name: string
  bio: string | null
  avatarUrl: string | null
  designation: string | null
  _count?: {
    posts?: number
  }
}

export function AdminBlogAuthorsPage() {
  const { toast } = useToast()
  const [authors, setAuthors] = useState<AuthorRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAuthor, setEditingAuthor] = useState<AuthorRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ name: '', designation: '', bio: '', avatarUrl: '' })

  const sortedRows = useMemo(() => [...authors].sort((a, b) => a.name.localeCompare(b.name)), [authors])

  const loadAuthors = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/blog/authors', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load authors')
      setAuthors(Array.isArray(data?.authors) ? data.authors : [])
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to load authors', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAuthors()
  }, [])

  const openCreate = () => {
    setEditingAuthor(null)
    setForm({ name: '', designation: '', bio: '', avatarUrl: '' })
    setModalOpen(true)
  }

  const openEdit = (author: AuthorRow) => {
    setEditingAuthor(author)
    setForm({
      name: author.name,
      designation: author.designation || '',
      bio: author.bio || '',
      avatarUrl: author.avatarUrl || '',
    })
    setModalOpen(true)
  }

  const saveAuthor = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Author name required', variant: 'destructive' })
      return
    }

    try {
      setIsSaving(true)
      const endpoint = editingAuthor ? `/api/admin/blog/authors/${editingAuthor.id}` : '/api/admin/blog/authors'
      const method = editingAuthor ? 'PATCH' : 'POST'
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to save author')

      setModalOpen(false)
      await loadAuthors()
      toast({ title: editingAuthor ? 'Author updated' : 'Author created' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save author', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAuthor = async (author: AuthorRow) => {
    const confirmed = window.confirm('Delete this author? Authors with posts cannot be deleted.')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/blog/authors/${author.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to delete author')
      await loadAuthors()
      toast({ title: 'Author deleted' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete author', variant: 'destructive' })
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
              <h1 className="mt-1 font-heading text-3xl font-bold text-text-dark">Blog Authors</h1>
            </div>
            <Button className="bg-primary-green hover:bg-green-700" onClick={openCreate}>
              <Plus size={14} className="mr-1" />
              Add Author
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-left">Author</th>
                  <th className="p-3 text-left">Designation</th>
                  <th className="p-3 text-left">Post Count</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((author) => (
                  <tr key={author.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {author.avatarUrl ? (
                            <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-green">
                              {author.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{author.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{author.bio || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{author.designation || '-'}</td>
                    <td className="p-3 text-slate-600">{author._count?.posts || 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(author)}>
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600"
                          onClick={() => void deleteAuthor(author)}
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
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No authors found.
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
            <DialogTitle>{editingAuthor ? 'Edit Author' : 'Add Author'}</DialogTitle>
            <DialogDescription>Create or update author details for blog attribution.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="author-name">Name</Label>
              <Input id="author-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>

            <div>
              <Label htmlFor="author-designation">Designation</Label>
              <Input id="author-designation" value={form.designation} onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))} />
            </div>

            <div>
              <Label htmlFor="author-bio">Bio</Label>
              <Textarea id="author-bio" rows={3} value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value.slice(0, 600) }))} />
            </div>

            <div>
              <Label htmlFor="author-avatar">Avatar URL (optional)</Label>
              <Input id="author-avatar" value={form.avatarUrl} onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary-green hover:bg-green-700" onClick={() => void saveAuthor()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Author'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

