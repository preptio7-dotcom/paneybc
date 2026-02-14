'use client'

import React, { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    DialogTrigger,
} from '@/components/ui/dialog'
import { Trash2, Plus, Loader2, BookOpen, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subject {
    id?: string
    _id?: string
    name: string
    code: string
    description?: string
    chapters?: {
        name: string
        code: string
        order: number
        weightage?: number
        questionCount?: number
    }[]
    unassignedQuestions?: number
}

export default function SubjectsManagementPage() {
    const { toast } = useToast()
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false)
    const [isManageChaptersOpen, setIsManageChaptersOpen] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
    const [isAddingChapter, setIsAddingChapter] = useState(false)
    const [isUpdatingChapter, setIsUpdatingChapter] = useState<string | null>(null)
    const [isDeletingChapter, setIsDeletingChapter] = useState<string | null>(null)
    const [isUpdatingSubject, setIsUpdatingSubject] = useState(false)

    // New subject state
    const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' })
    const [isCodeManualCreate, setIsCodeManualCreate] = useState(false)
    const [editSubject, setEditSubject] = useState<Subject | null>(null)
    const [editForm, setEditForm] = useState({ name: '', code: '', description: '' })
    const [isCodeManualEdit, setIsCodeManualEdit] = useState(true)
    const [newChapter, setNewChapter] = useState({ name: '', code: '', order: 1, weightage: 1 })
    const [chapterDrafts, setChapterDrafts] = useState<Record<string, { name: string; code: string; order: number; weightage: number }>>({})

    const generateSubjectCode = (value: string) => {
        const cleaned = value.replace(/[^a-zA-Z0-9 ]/g, ' ').trim()
        if (!cleaned) return ''
        const parts = cleaned.split(/\s+/).filter(Boolean)
        let code = parts.map((part) => (/^\d+$/.test(part) ? part : part[0])).join('')
        if (code.length < 2) {
            code = cleaned.replace(/\s+/g, '').slice(0, 6)
        }
        return code.toUpperCase()
    }

    const buildAllocationPreview = (chapters: Subject['chapters'] = [], total = 50) => {
        const normalized = chapters.map((ch) => ({
            ...ch,
            weightage: typeof ch.weightage === 'number' && ch.weightage > 0 ? ch.weightage : 1,
            questionCount: ch.questionCount || 0
        }))

        if (normalized.length === 0) return []

        const weightSum = normalized.reduce((sum, ch) => sum + (ch.weightage || 1), 0)
        const allocations = normalized.map((ch) => {
            const share = weightSum > 0 ? (ch.weightage || 1) / weightSum : 0
            const raw = share * total
            return {
                ...ch,
                share,
                base: Math.floor(raw),
                remainder: raw - Math.floor(raw)
            }
        })

        let remaining = total
        const picks = new Map<string, number>()
        allocations.forEach((ch) => {
            const alloc = Math.min(ch.base, ch.questionCount || 0)
            picks.set(ch.code, alloc)
            remaining -= alloc
        })

        const byRemainder = allocations.slice().sort((a, b) => b.remainder - a.remainder)
        while (remaining > 0) {
            let progress = false
            for (const ch of byRemainder) {
                if (remaining <= 0) break
                const current = picks.get(ch.code) || 0
                if (current < (ch.questionCount || 0)) {
                    picks.set(ch.code, current + 1)
                    remaining -= 1
                    progress = true
                }
            }
            if (!progress) break
        }

        const extraChapters = allocations
            .slice()
            .sort((a, b) => ((b.questionCount || 0) - (picks.get(b.code) || 0)) - ((a.questionCount || 0) - (picks.get(a.code) || 0)))

        while (remaining > 0) {
            let progress = false
            for (const ch of extraChapters) {
                if (remaining <= 0) break
                const current = picks.get(ch.code) || 0
                if (current < (ch.questionCount || 0)) {
                    picks.set(ch.code, current + 1)
                    remaining -= 1
                    progress = true
                }
            }
            if (!progress) break
        }

        return allocations.map((ch) => ({
            code: ch.code,
            name: ch.name,
            weightage: ch.weightage || 1,
            available: ch.questionCount || 0,
            sharePercent: Math.round((ch.share || 0) * 100),
            raw: Math.round(((ch.share || 0) * total) * 10) / 10,
            base: ch.base,
            remainder: Math.round(ch.remainder * 100) / 100,
            picked: picks.get(ch.code) || 0
        }))
    }

    useEffect(() => {
        fetchSubjects()
    }, [])

    const fetchSubjects = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/subjects')
            const data = await response.json()
            const list = data.subjects || []
            setSubjects(list)
            return list
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load subjects.",
                variant: "destructive"
            })
            return []
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateSubject = async () => {
        if (!newSubject.name || !newSubject.code) {
            toast({ title: "Error", description: "Name and Code are required", variant: "destructive" })
            return
        }

        try {
            setIsCreating(true)
            const response = await fetch('/api/admin/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSubject)
            })

            if (response.ok) {
                toast({ title: "Success", description: "Subject created successfully." })
                setNewSubject({ name: '', code: '', description: '' })
                setIsCodeManualCreate(false)
                setIsDialogOpen(false)
                fetchSubjects()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsCreating(false)
        }
    }

    const openEditSubject = (subject: Subject) => {
        setEditSubject(subject)
        setEditForm({
            name: subject.name || '',
            code: subject.code || '',
            description: subject.description || '',
        })
        setIsCodeManualEdit(true)
        setIsEditDialogOpen(true)
    }

    const handleUpdateSubject = async () => {
        if (!editSubject) return
        if (!editForm.name || !editForm.code) {
            toast({ title: "Error", description: "Name and Code are required", variant: "destructive" })
            return
        }
        try {
            setIsUpdatingSubject(true)
            const response = await fetch('/api/admin/subjects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editSubject.id ?? editSubject._id,
                    name: editForm.name,
                    code: editForm.code,
                    description: editForm.description
                })
            })

            if (response.ok) {
                toast({ title: "Updated", description: "Subject updated successfully." })
                setIsEditDialogOpen(false)
                fetchSubjects()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsUpdatingSubject(false)
        }
    }

    const handleDeleteSubject = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/subjects?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast({ title: "Success", description: "Subject deleted." })
                fetchSubjects()
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const handleAddChapter = async () => {
        if (!selectedSubject || !newChapter.name || !newChapter.code) {
            toast({ title: "Error", description: "Chapter name and code are required", variant: "destructive" })
            return
        }

        try {
            setIsAddingChapter(true)
            const response = await fetch('/api/admin/subjects/chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId: selectedSubject.id ?? selectedSubject._id,
                    name: newChapter.name,
                    code: newChapter.code,
                    order: newChapter.order,
                    weightage: newChapter.weightage
                })
            })

            if (response.ok) {
                toast({ title: "Success", description: "Chapter added successfully." })
                setNewChapter({ name: '', code: '', order: 1, weightage: 1 })
                setIsChapterDialogOpen(false)
                setSelectedSubject(null)
                fetchSubjects()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to add chapter')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsAddingChapter(false)
        }
    }

    const openManageChapters = (subject: Subject) => {
        setSelectedSubject(subject)
        const drafts: Record<string, { name: string; order: number; weightage: number }> = {}
        ;(subject.chapters || []).forEach((chapter) => {
            drafts[chapter.code] = {
                name: chapter.name,
                code: chapter.code,
                order: chapter.order,
                weightage: chapter.weightage ?? 1
            }
        })
        setChapterDrafts(drafts)
        setIsManageChaptersOpen(true)
    }

    const handleUpdateChapter = async (code: string) => {
        if (!selectedSubject) return
        const draft = chapterDrafts[code]
        if (!draft?.name) {
            toast({ title: "Error", description: "Chapter name is required.", variant: "destructive" })
            return
        }

        try {
            setIsUpdatingChapter(code)
            const response = await fetch('/api/admin/subjects/chapters', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId: selectedSubject.id ?? selectedSubject._id,
                    code,
                    newCode: draft.code,
                    name: draft.name,
                    order: draft.order,
                    weightage: draft.weightage
                })
            })

            if (response.ok) {
                const data = await response.json()
                toast({ title: "Updated", description: "Chapter updated successfully." })
                const list = await fetchSubjects()
                const refreshed = list.find((item: Subject) => (item.id ?? item._id) === (selectedSubject.id ?? selectedSubject._id)) || data.subject
                setSelectedSubject(refreshed)
                const nextDrafts: Record<string, { name: string; code: string; order: number; weightage: number }> = {}
                ;(refreshed.chapters || []).forEach((chapter: any) => {
                    nextDrafts[chapter.code] = {
                        name: chapter.name,
                        code: chapter.code,
                        order: chapter.order,
                        weightage: chapter.weightage ?? 1
                    }
                })
                setChapterDrafts(nextDrafts)
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update chapter')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsUpdatingChapter(null)
        }
    }

    const handleDeleteChapter = async (code: string) => {
        if (!selectedSubject) return
        try {
            setIsDeletingChapter(code)
            const subjectId = selectedSubject.id ?? selectedSubject._id
            const response = await fetch(`/api/admin/subjects/chapters?subjectId=${subjectId}&code=${encodeURIComponent(code)}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                toast({ title: "Deleted", description: "Chapter removed successfully." })
                const list = await fetchSubjects()
                const refreshed = list.find((item: Subject) => (item.id ?? item._id) === subjectId)
                if (refreshed) setSelectedSubject(refreshed)
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete chapter')
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsDeletingChapter(null)
        }
    }

    return (
        <main className="min-h-screen bg-background-light">
            <AdminHeader />

            <div className="pt-[80px] pb-12">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="font-heading text-3xl font-bold text-text-dark">Subject Management</h1>
                            <p className="text-text-light">Manage subjects and course codes</p>
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white shadow-sm">
                                    <Plus size={18} />
                                    New Subject
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="bg-white">
                            <DialogHeader>
                                <DialogTitle>Create New Subject</DialogTitle>
                                <DialogDescription>
                                    Add a new subject to the platform. Ensure the code matches what you use for uploads.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Subject Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Fundamentals of Accounting"
                                        value={newSubject.name}
                                        onChange={(e) => {
                                            const name = e.target.value
                                            setNewSubject((prev) => ({
                                                ...prev,
                                                name,
                                                code: isCodeManualCreate ? prev.code : generateSubjectCode(name)
                                            }))
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="code">Subject Code</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => {
                                                setIsCodeManualCreate(false)
                                                setNewSubject((prev) => ({
                                                    ...prev,
                                                    code: generateSubjectCode(prev.name)
                                                }))
                                            }}
                                        >
                                            Auto-generate
                                        </Button>
                                    </div>
                                    <Input
                                        id="code"
                                        placeholder="e.g. FA"
                                        value={newSubject.code}
                                        onChange={(e) => {
                                            setIsCodeManualCreate(true)
                                            setNewSubject({ ...newSubject, code: e.target.value })
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="desc">Description (Optional)</Label>
                                    <Input
                                        id="desc"
                                            value={newSubject.description}
                                            onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleCreateSubject}
                                        disabled={isCreating}
                                        className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white w-full sm:w-auto shadow-sm"
                                    >
                                        {isCreating ? 'Creating...' : 'Create Subject'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card className="border border-border">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="animate-spin text-primary-green" size={32} />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border px-6">
                                            <TableHead className="pl-6">Code</TableHead>
                                            <TableHead>Subject Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Chapters</TableHead>
                                            <TableHead className="text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjects.length > 0 ? (
                                            subjects.map((sub, idx) => (
                                                <TableRow key={sub.id ?? sub._id ?? `${sub.code ?? 'subject'}-${idx}`} className="border-border hover:bg-background-light/50">
                                                    <TableCell className="pl-6 font-bold text-primary-green">{sub.code}</TableCell>
                                                    <TableCell className="font-medium text-text-dark">{sub.name}</TableCell>
                                                    <TableCell className="text-text-light text-sm">{sub.description || '-'}</TableCell>
                                                    <TableCell className="text-text-light text-sm">
                                                        {sub.chapters?.length || 0}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEditSubject(sub)}
                                                                className="gap-2"
                                                            >
                                                                <Pencil size={14} />
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedSubject(sub)
                                                                    setIsChapterDialogOpen(true)
                                                                }}
                                                                className="gap-2"
                                                            >
                                                                <BookOpen size={14} />
                                                                Add Chapter
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openManageChapters(sub)}
                                                                className="gap-2"
                                                            >
                                                                Manage Chapters
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteSubject(sub.id ?? sub._id)}
                                                                className="text-error-red hover:text-error-red hover:bg-error-red/10"
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center p-12 text-text-light">
                                                    No subjects created yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>
                            Update the subject details. Changing the code updates all related questions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Subject Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => {
                                    const name = e.target.value
                                    setEditForm((prev) => ({
                                        ...prev,
                                        name,
                                        code: isCodeManualEdit ? prev.code : generateSubjectCode(name)
                                    }))
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="edit-code">Subject Code</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        setIsCodeManualEdit(false)
                                        setEditForm((prev) => ({
                                            ...prev,
                                            code: generateSubjectCode(prev.name)
                                        }))
                                    }}
                                >
                                    Auto-generate
                                </Button>
                            </div>
                            <Input
                                id="edit-code"
                                value={editForm.code}
                                onChange={(e) => {
                                    setIsCodeManualEdit(true)
                                    setEditForm({ ...editForm, code: e.target.value })
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-desc">Description (Optional)</Label>
                            <Input
                                id="edit-desc"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleUpdateSubject}
                            disabled={isUpdatingSubject}
                            className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white w-full sm:w-auto shadow-sm"
                        >
                            {isUpdatingSubject ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Add Chapter</DialogTitle>
                        <DialogDescription>
                            Add a chapter to {selectedSubject?.name || 'this subject'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="chapter-name">Chapter Name</Label>
                            <Input
                                id="chapter-name"
                                placeholder="e.g. Chapter 1 - Basics"
                                value={newChapter.name}
                                onChange={(e) => setNewChapter({ ...newChapter, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="chapter-code">Chapter Code</Label>
                            <Input
                                id="chapter-code"
                                placeholder="e.g. CH1"
                                value={newChapter.code}
                                onChange={(e) => setNewChapter({ ...newChapter, code: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="chapter-order">Order</Label>
                            <Input
                                id="chapter-order"
                                type="number"
                                value={newChapter.order}
                                onChange={(e) => setNewChapter({ ...newChapter, order: Number(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="chapter-weightage">Weightage</Label>
                            <Input
                                id="chapter-weightage"
                                type="number"
                                min="1"
                                value={newChapter.weightage}
                                onChange={(e) => setNewChapter({ ...newChapter, weightage: Number(e.target.value) || 1 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleAddChapter}
                            disabled={isAddingChapter}
                            className="bg-[#0F7938] hover:bg-[#0F7938]/90 text-white w-full sm:w-auto shadow-sm"
                        >
                            {isAddingChapter ? 'Adding...' : 'Add Chapter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageChaptersOpen} onOpenChange={setIsManageChaptersOpen}>
                <DialogContent className="bg-white max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Manage Chapters</DialogTitle>
                        <DialogDescription>
                            Edit chapter name, order, and weightage for {selectedSubject?.name || 'this subject'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                        {(selectedSubject?.chapters || []).length === 0 && (
                            <p className="text-sm text-text-light">No chapters found.</p>
                        )}
                        {(selectedSubject?.chapters || []).map((chapter) => (
                            <div key={chapter.code} className="border border-border rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-text-dark">{chapter.code}</div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteChapter(chapter.code)}
                                            disabled={isDeletingChapter === chapter.code}
                                        >
                                            {isDeletingChapter === chapter.code ? 'Deleting...' : 'Delete'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdateChapter(chapter.code)}
                                            disabled={isUpdatingChapter === chapter.code}
                                        >
                                            {isUpdatingChapter === chapter.code ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor={`chapter-name-${chapter.code}`}>Name</Label>
                                        <Input
                                            id={`chapter-name-${chapter.code}`}
                                            value={chapterDrafts[chapter.code]?.name || ''}
                                            onChange={(e) =>
                                                setChapterDrafts(prev => ({
                                                    ...prev,
                                                    [chapter.code]: {
                                                        ...prev[chapter.code],
                                                        name: e.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`chapter-code-${chapter.code}`}>Code</Label>
                                        <Input
                                            id={`chapter-code-${chapter.code}`}
                                            value={chapterDrafts[chapter.code]?.code || ''}
                                            onChange={(e) =>
                                                setChapterDrafts(prev => ({
                                                    ...prev,
                                                    [chapter.code]: {
                                                        ...prev[chapter.code],
                                                        code: e.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`chapter-order-${chapter.code}`}>Order</Label>
                                        <Input
                                            id={`chapter-order-${chapter.code}`}
                                            type="number"
                                            value={chapterDrafts[chapter.code]?.order || 1}
                                            onChange={(e) =>
                                                setChapterDrafts(prev => ({
                                                    ...prev,
                                                    [chapter.code]: {
                                                        ...prev[chapter.code],
                                                        order: Number(e.target.value) || 1
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`chapter-weight-${chapter.code}`}>Weightage</Label>
                                        <Input
                                            id={`chapter-weight-${chapter.code}`}
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={chapterDrafts[chapter.code]?.weightage ?? 1}
                                            onChange={(e) =>
                                                setChapterDrafts(prev => ({
                                                    ...prev,
                                                    [chapter.code]: {
                                                        ...prev[chapter.code],
                                                        weightage: Number(e.target.value) || 1
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {selectedSubject?.chapters && selectedSubject.chapters.length > 0 && (
                            <div className="border border-border rounded-xl p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-text-dark">Weightage Breakdown (Full Book 50)</h4>
                                    <p className="text-xs text-text-light">
                                        Estimated number of questions per chapter based on weightage and availability.
                                    </p>
                                </div>
                                {(selectedSubject.unassignedQuestions || 0) > 0 && (
                                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        Unassigned questions found: {selectedSubject.unassignedQuestions}. These are excluded from full-book selection until assigned to a chapter.
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-text-light">
                                                <th className="py-2 pr-4">Chapter</th>
                                                <th className="py-2 pr-4">Weight</th>
                                                <th className="py-2 pr-4">Share %</th>
                                                <th className="py-2 pr-4">Raw</th>
                                                <th className="py-2 pr-4">Base</th>
                                                <th className="py-2 pr-4">Remainder</th>
                                                <th className="py-2 pr-4">Available</th>
                                                <th className="py-2">Picked (50)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buildAllocationPreview(selectedSubject.chapters, 50).map((row) => (
                                                <tr key={row.code} className="border-t border-border">
                                                    <td className="py-2 pr-4">
                                                        <div className="font-medium text-text-dark">{row.name}</div>
                                                        <div className="text-xs text-text-light">{row.code}</div>
                                                    </td>
                                                    <td className="py-2 pr-4">{row.weightage}</td>
                                                    <td className="py-2 pr-4">{row.sharePercent}%</td>
                                                    <td className="py-2 pr-4">{row.raw}</td>
                                                    <td className="py-2 pr-4">{row.base}</td>
                                                    <td className="py-2 pr-4">{row.remainder}</td>
                                                    <td className="py-2 pr-4">{row.available}</td>
                                                    <td className="py-2 font-semibold text-primary-green">{row.picked}</td>
                                                </tr>
                                            ))}
                                            {(selectedSubject.unassignedQuestions || 0) > 0 && (
                                                <tr className="border-t border-border">
                                                    <td className="py-2 pr-4">
                                                        <div className="font-medium text-text-dark">Unassigned</div>
                                                        <div className="text-xs text-text-light">No chapter code</div>
                                                    </td>
                                                    <td className="py-2 pr-4">-</td>
                                                    <td className="py-2 pr-4">-</td>
                                                    <td className="py-2 pr-4">-</td>
                                                    <td className="py-2 pr-4">-</td>
                                                    <td className="py-2 pr-4">-</td>
                                                    <td className="py-2 pr-4">{selectedSubject.unassignedQuestions}</td>
                                                    <td className="py-2 font-semibold text-slate-500">0</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageChaptersOpen(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
