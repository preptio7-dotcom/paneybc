'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function CreateAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Please fill in all fields.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin')
      }

      toast.success('Admin account created successfully.')
      setForm({ name: '', email: '', password: '' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create admin')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Create Admin Account</h1>
        <p className="text-gray-400 mt-1">Add a new administrator with secure credentials.</p>
      </div>

      <Card className="bg-gray-900 border-gray-800 rounded-2xl max-w-2xl">
        <CardHeader className="p-6 border-b border-gray-800">
          <CardTitle className="text-white text-lg">Admin Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">Full Name</label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Admin Name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email Address</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Temporary Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Set a strong password"
              />
              <p className="text-xs text-gray-500">Admins can change their password after logging in.</p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold"
            >
              {isLoading ? 'Creating...' : 'Create Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
