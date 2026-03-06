'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'

type InstituteRow = {
  name: string
  usageCount: number
}

type InstituteSuggestionStatus = 'pending' | 'approved' | 'rejected'

type SuggestionRow = {
  id: string
  suggestedName: string
  status: InstituteSuggestionStatus
  requestedByEmail: string | null
  requestedByName: string | null
  usageCount: number
  createdAt: string
  reviewedAt: string | null
}

export default function AdminInstitutesPage() {
  const { toast } = useToast()
  const [institutes, setInstitutes] = useState<InstituteRow[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true)
  const [query, setQuery] = useState('')
  const [suggestionsStatusFilter, setSuggestionsStatusFilter] = useState<
    'all' | InstituteSuggestionStatus
  >('pending')
  const [suggestionsNotice, setSuggestionsNotice] = useState<string | null>(null)
  const [newInstitute, setNewInstitute] = useState('')
  const [editingInstitute, setEditingInstitute] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadInstitutes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/institutes', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load institutes')
      }
      setInstitutes(Array.isArray(data.institutes) ? data.institutes : [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load institutes.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true)
      const params = new URLSearchParams()
      if (suggestionsStatusFilter !== 'all') {
        params.set('status', suggestionsStatusFilter)
      }
      const response = await fetch(`/api/admin/institutes/suggestions?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load institute suggestions')
      }
      setSuggestions(Array.isArray(data.rows) ? data.rows : [])
      setSuggestionsNotice(
        data?.missingTable ? String(data.message || 'Institute suggestions queue is unavailable.') : null
      )
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load institute suggestions.',
        variant: 'destructive',
      })
      setSuggestionsNotice(null)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    void loadInstitutes()
  }, [])

  useEffect(() => {
    void loadSuggestions()
  }, [suggestionsStatusFilter])

  const visibleInstitutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return institutes
    return institutes.filter((item) => item.name.toLowerCase().includes(normalizedQuery))
  }, [institutes, query])

  const addInstitute = async () => {
    const name = newInstitute.trim()
    if (!name) return
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/institutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add institute')
      }
      setInstitutes(Array.isArray(data.institutes) ? data.institutes : institutes)
      await loadSuggestions()
      setNewInstitute('')
      toast({
        title: 'Added',
        description: 'Institute has been added successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to add institute.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editingInstitute) return
    const name = editValue.trim()
    if (!name) return
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/institutes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousName: editingInstitute,
          name,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update institute')
      }
      setInstitutes(Array.isArray(data.institutes) ? data.institutes : institutes)
      await loadSuggestions()
      setEditingInstitute(null)
      setEditValue('')
      toast({
        title: 'Updated',
        description: 'Institute name updated.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to update institute.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteInstitute = async (name: string) => {
    const confirmed = window.confirm(`Delete institute "${name}"?`)
    if (!confirmed) return
    try {
      setIsSaving(true)
      const response = await fetch(`/api/admin/institutes?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete institute')
      }
      setInstitutes(Array.isArray(data.institutes) ? data.institutes : institutes)
      await loadSuggestions()
      toast({
        title: 'Deleted',
        description: 'Institute removed from dropdown list.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to delete institute.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSuggestionStatus = async (id: string, status: InstituteSuggestionStatus) => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/institutes/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update suggestion')
      }

      await Promise.all([loadInstitutes(), loadSuggestions()])

      toast({
        title: 'Updated',
        description:
          status === 'approved'
            ? 'Suggestion approved and institute list updated.'
            : status === 'rejected'
              ? 'Suggestion rejected.'
              : 'Suggestion marked pending again.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to update suggestion.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const pendingSuggestions = useMemo(
    () => suggestions.filter((row) => row.status === 'pending').length,
    [suggestions]
  )

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold text-text-dark">Institute Directory</h1>
            <p className="text-text-light">
              Manage institute options shown in signup. Students can select from this list or choose Other.
            </p>
            <p className="text-xs text-slate-500">
              Institutes are auto-sorted by usage count so the most common choices stay on top.
            </p>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Institute Suggestions Queue ({pendingSuggestions} pending)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={suggestionsStatusFilter}
                  onChange={(event) =>
                    setSuggestionsStatusFilter(
                      event.target.value as 'all' | InstituteSuggestionStatus
                    )
                  }
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
                <Button
                  variant="outline"
                  onClick={() => void loadSuggestions()}
                  disabled={isLoadingSuggestions || isSaving}
                >
                  <RefreshCcw size={14} className="mr-1.5" />
                  Refresh Queue
                </Button>
              </div>

              {isLoadingSuggestions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : suggestionsNotice ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {suggestionsNotice}
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-sm text-text-light">No institute suggestions in this status.</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-md border border-slate-200 bg-white p-3 space-y-2"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{row.suggestedName}</p>
                          <p className="text-xs text-slate-500">
                            {row.requestedByName || 'Unknown user'} · {row.requestedByEmail || 'No email'} ·
                            Suggested {new Date(row.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            row.status === 'pending'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : row.status === 'approved'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Usage count: {row.usageCount}</span>
                        {row.reviewedAt ? (
                          <span>Reviewed: {new Date(row.reviewedAt).toLocaleString()}</span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => void updateSuggestionStatus(row.id, 'approved')}
                          disabled={isSaving}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => void updateSuggestionStatus(row.id, 'rejected')}
                          disabled={isSaving}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateSuggestionStatus(row.id, 'pending')}
                          disabled={isSaving}
                        >
                          Mark Pending
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Add Institute</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  value={newInstitute}
                  onChange={(event) => setNewInstitute(event.target.value)}
                  placeholder="Enter institute name"
                  maxLength={140}
                />
                <Button onClick={addInstitute} disabled={isSaving || !newInstitute.trim()}>
                  <Plus size={14} className="mr-1.5" />
                  Add
                </Button>
                <Button variant="outline" onClick={() => void loadInstitutes()} disabled={isLoading || isSaving}>
                  <RefreshCcw size={14} className="mr-1.5" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Current Institutes ({institutes.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search institute"
                maxLength={140}
              />

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : visibleInstitutes.length === 0 ? (
                <p className="text-sm text-text-light">No institutes found for this filter.</p>
              ) : (
                <div className="space-y-2">
                  {visibleInstitutes.map((row) => {
                    const name = row.name
                    const isEditing = editingInstitute === name
                    return (
                      <div
                        key={name}
                        className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          {isEditing ? (
                            <Input
                              value={editValue}
                              onChange={(event) => setEditValue(event.target.value)}
                              maxLength={140}
                            />
                          ) : (
                            <p className="text-sm font-medium text-slate-800">{name}</p>
                          )}
                          {!isEditing ? (
                            <p className="text-xs text-slate-500">Usage count: {row.usageCount}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={saveEdit} disabled={isSaving || !editValue.trim()}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingInstitute(null)
                                  setEditValue('')
                                }}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingInstitute(name)
                                  setEditValue(name)
                                }}
                                disabled={isSaving}
                              >
                                <Pencil size={13} className="mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => void deleteInstitute(name)}
                                disabled={isSaving}
                              >
                                <Trash2 size={13} className="mr-1.5" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

