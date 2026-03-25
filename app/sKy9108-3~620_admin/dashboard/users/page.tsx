'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, UserMinus, UserX, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

type UserRow = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin' | 'super_admin'
  isBanned: boolean
  createdAt: string
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin' | 'super_admin'>('all')
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
      const response = await fetch(`/api/super-admin/users?${queryString}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to load users' })
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
      const response = await fetch('/api/super-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isBanned: nextState }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update user')

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: nextState } : u))
      )
      toast.success(nextState ? 'User banned' : 'User unbanned')
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to update user' })
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDelete = async (userId: string) => {
    if (busyUserId) return
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      setBusyUserId(userId)
      const response = await fetch('/api/super-admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete user')

      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success('User deleted')
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to delete user' })
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Total users: {total}</p>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800 rounded-2xl">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_200px] gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white pl-10 h-10 rounded-xl"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-green" size={28} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400">
                  <tr className="border-b border-gray-800">
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-6">Email</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Joined</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-800">
                      <td className="py-3 px-6 font-medium text-white">{user.name}</td>
                      <td className="py-3 px-6 text-gray-400">{user.email}</td>
                      <td className="py-3 px-6 text-gray-400 uppercase text-xs">{user.role}</td>
                      <td className="py-3 px-6">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.isBanned ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-6 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBanToggle(user.id, !user.isBanned)}
                          disabled={busyUserId === user.id || user.role === 'super_admin'}
                          className="gap-2 border-gray-700 text-gray-200 hover:bg-gray-800"
                        >
                          {user.isBanned ? <ShieldAlert size={14} /> : <UserMinus size={14} />}
                          {user.isBanned ? 'Unban' : 'Ban'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          disabled={busyUserId === user.id || user.role === 'super_admin'}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
  )
}
