'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserMinus, UserX, ShieldAlert, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type UserRow = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin' | 'super_admin'
  studentRole: 'user' | 'ambassador' | 'paid' | 'unpaid'
  degree: string
  level: string
  institute: string
  city: string
  studentId: string
  phone: string
  instituteRating: number | null
  isBanned: boolean
  createdAt: string
}

type EditForm = {
  name: string
  degree: string
  level: string
  institute: string
  city: string
  studentId: string
  phone: string
  instituteRating: number
  studentRole: 'user' | 'ambassador' | 'paid' | 'unpaid'
}

const studentRoleOptions: EditForm['studentRole'][] = ['user', 'ambassador', 'paid', 'unpaid']
const PAGE_SIZE = 5

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student'>('all')
  const [studentRoleFilter, setStudentRoleFilter] = useState<'all' | 'user' | 'ambassador' | 'paid' | 'unpaid'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    degree: 'CA',
    level: 'PRC',
    institute: '',
    city: '',
    studentId: '',
    phone: '',
    instituteRating: 3,
    studentRole: 'unpaid',
  })
  const [registrationOptions, setRegistrationOptions] = useState<{ degrees: string[]; levels: string[] }>({
    degrees: ['CA'],
    levels: ['PRC', 'CAF'],
  })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (studentRoleFilter !== 'all') params.set('studentRole', studentRoleFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('page', String(currentPage))
    params.set('pageSize', String(PAGE_SIZE))
    return params.toString()
  }, [search, roleFilter, studentRoleFilter, statusFilter, currentPage])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/users?${queryString}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(Math.max(1, Number(data.totalPages || 1)))
      setCurrentPage(Math.max(1, Number(data.currentPage || 1)))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [queryString])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/system/settings')
        if (!response.ok) return
        const data = await response.json()
        const degrees = Array.isArray(data?.testSettings?.registrationDegrees)
          ? data.testSettings.registrationDegrees.map((item: string) => String(item).trim()).filter(Boolean)
          : ['CA']
        const levels = Array.isArray(data?.testSettings?.registrationLevels)
          ? data.testSettings.registrationLevels.map((item: string) => String(item).trim()).filter(Boolean)
          : ['PRC', 'CAF']
        setRegistrationOptions({
          degrees: degrees.length ? degrees : ['CA'],
          levels: levels.length ? levels : ['PRC', 'CAF'],
        })
      } catch {
        // keep defaults
      }
    }
    loadSettings()
  }, [])

  const handleBanToggle = async (userId: string, nextState: boolean) => {
    if (busyUserId) return
    try {
      setBusyUserId(userId)
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isBanned: nextState }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update user')

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBanned: nextState } : u)))
      toast({
        title: nextState ? 'User banned' : 'User unbanned',
        description: nextState ? 'The user can no longer log in.' : 'The user can access the platform again.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      })
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDelete = async (userId: string) => {
    if (busyUserId) return
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      setBusyUserId(userId)
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete user')

      await loadUsers()
      toast({
        title: 'User deleted',
        description: 'The user has been removed.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      })
    } finally {
      setBusyUserId(null)
    }
  }

  const openEdit = (user: UserRow) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      degree: user.degree || registrationOptions.degrees[0] || 'CA',
      level: user.level || registrationOptions.levels[0] || 'PRC',
      institute: user.institute || '',
      city: user.city || '',
      studentId: user.studentId || '',
      phone: user.phone || '',
      instituteRating: Number(user.instituteRating || 3),
      studentRole: user.studentRole || 'unpaid',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    if (!editForm.name.trim() || !editForm.degree || !editForm.level || !editForm.institute.trim() || !editForm.city.trim() || !editForm.studentId.trim() || !editForm.phone.trim()) {
      toast({
        title: 'Missing fields',
        description: 'All profile fields are required.',
        variant: 'destructive',
      })
      return
    }
    if (editForm.instituteRating < 1 || editForm.instituteRating > 5) {
      toast({
        title: 'Invalid rating',
        description: 'Institute rating must be between 1 and 5.',
        variant: 'destructive',
      })
      return
    }

    try {
      setBusyUserId(editingUser.id)
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editForm.name,
          degree: editForm.degree,
          level: editForm.level,
          institute: editForm.institute,
          city: editForm.city,
          studentId: editForm.studentId,
          phone: editForm.phone,
          instituteRating: editForm.instituteRating,
          studentRole: editForm.studentRole,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save user')

      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...data.user } : u)))
      toast({
        title: 'User updated',
        description: 'Profile details saved successfully.',
      })
      setEditingUser(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save user',
        variant: 'destructive',
      })
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">User Management</h1>
              <p className="text-text-light">Total registered users: {total}</p>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          <Card className="border border-border">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as 'all' | 'student')
                    setCurrentPage(1)
                  }}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All users</option>
                  <option value="student">Students</option>
                </select>
                <select
                  value={studentRoleFilter}
                  onChange={(e) => {
                    setStudentRoleFilter(e.target.value as 'all' | 'user' | 'ambassador' | 'paid' | 'unpaid')
                    setCurrentPage(1)
                  }}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All student roles</option>
                  <option value="user">User</option>
                  <option value="ambassador">Ambassador</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'all' | 'active' | 'banned')
                    setCurrentPage(1)
                  }}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary-green" size={32} />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-text-light py-10">No users found.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1520px] text-sm">
                      <thead className="text-left text-text-light bg-slate-50">
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 font-semibold min-w-[170px]">Name</th>
                          <th className="px-4 py-3 font-semibold min-w-[220px]">Email</th>
                          <th className="px-4 py-3 font-semibold min-w-[120px]">Access Role</th>
                          <th className="px-4 py-3 font-semibold min-w-[130px]">Student Role</th>
                          <th className="px-4 py-3 font-semibold min-w-[140px]">Degree/Level</th>
                          <th className="px-4 py-3 font-semibold min-w-[260px]">Institute</th>
                          <th className="px-4 py-3 font-semibold min-w-[150px]">Phone</th>
                          <th className="px-4 py-3 font-semibold min-w-[90px]">Rating</th>
                          <th className="px-4 py-3 font-semibold min-w-[100px]">Status</th>
                          <th className="px-4 py-3 font-semibold min-w-[110px]">Joined</th>
                          <th className="px-4 py-3 font-semibold min-w-[230px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-border align-top">
                            <td className="px-4 py-4 font-medium text-text-dark whitespace-nowrap">{user.name}</td>
                            <td className="px-4 py-4 text-text-light whitespace-nowrap">{user.email}</td>
                            <td className="px-4 py-4 text-text-light uppercase text-xs whitespace-nowrap">{user.role}</td>
                            <td className="px-4 py-4 text-text-light capitalize whitespace-nowrap">{user.studentRole || 'unpaid'}</td>
                            <td className="px-4 py-4 text-text-light whitespace-nowrap">
                              {user.degree || '--'} / {user.level || '--'}
                            </td>
                            <td className="px-4 py-4 text-text-light min-w-[260px]">
                              <div className="space-y-1 leading-snug">
                                <div className="font-medium text-text-dark">{user.institute || '--'}</div>
                                <div className="text-xs">{user.city || '--'}</div>
                                <div className="text-xs font-mono">{user.studentId || '--'}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-text-light whitespace-nowrap">{user.phone || '--'}</td>
                            <td className="px-4 py-4 text-text-light whitespace-nowrap">{user.instituteRating || '--'}/5</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  user.isBanned ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                }`}
                              >
                                {user.isBanned ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-text-light whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(user)}
                                disabled={busyUserId === user.id}
                                className="gap-2"
                              >
                                <Pencil size={14} />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBanToggle(user.id, !user.isBanned)}
                                disabled={busyUserId === user.id}
                                className="gap-2"
                              >
                                {user.isBanned ? <ShieldAlert size={14} /> : <UserMinus size={14} />}
                                {user.isBanned ? 'Unban' : 'Ban'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(user.id)}
                                disabled={busyUserId === user.id}
                                className="text-error-red hover:text-error-red"
                              >
                                <UserX size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-text-light">
                      Showing {total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
                      {Math.min(currentPage * PAGE_SIZE, total)} of {total} students
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-text-light">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user profile fields and student role.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Degree</Label>
              <Select value={editForm.degree} onValueChange={(value) => setEditForm((prev) => ({ ...prev, degree: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {registrationOptions.degrees.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Level</Label>
              <Select value={editForm.level} onValueChange={(value) => setEditForm((prev) => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {registrationOptions.levels.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Institute</Label>
              <Input value={editForm.institute} onChange={(e) => setEditForm((prev) => ({ ...prev, institute: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Student ID</Label>
              <Input value={editForm.studentId} onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Institute Rating (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={editForm.instituteRating}
                onChange={(e) => setEditForm((prev) => ({ ...prev, instituteRating: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Student Role</Label>
              <Select
                value={editForm.studentRole}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, studentRole: value as EditForm['studentRole'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {studentRoleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editingUser || busyUserId === editingUser.id}>
              {busyUserId === editingUser?.id ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
