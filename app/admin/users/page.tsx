'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserMinus, UserX, ShieldAlert } from 'lucide-react'

type UserRow = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin' | 'super_admin'
  isBanned: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    return params.toString()
  }, [search, roleFilter, statusFilter])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/users?${queryString}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setTotal(data.total || 0)
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

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: nextState } : u))
      )
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

      setUsers((prev) => prev.filter((u) => u.id !== userId))
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
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All users</option>
                  <option value="student">Students</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-text-light">
                      <tr className="border-b border-border">
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Role</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Joined</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border">
                          <td className="py-3 font-medium text-text-dark">{user.name}</td>
                          <td className="py-3 text-text-light">{user.email}</td>
                          <td className="py-3 text-text-light uppercase text-xs">{user.role}</td>
                          <td className="py-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.isBanned ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {user.isBanned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 text-text-light">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 text-right space-x-2">
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
