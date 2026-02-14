'use client'

import React from 'react'
import { Button } from './ui/button'
import { LogOut, Shield, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { ProfileModal } from './profile-modal'
import Image from 'next/image'

export function AdminHeader() {
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-border z-40 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        {/* Left - Logo with Admin Badge */}
        <div className="flex items-center gap-6">
          <Link href="/admin">
            <h1 className="font-heading font-bold text-xl text-primary-green cursor-pointer">
              CA Admin
            </h1>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/admin/questions">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Questions
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Reports
              </Button>
            </Link>
            <Link href="/admin/demo-settings">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Demo Settings
              </Button>
            </Link>
            <Link href="/admin/financial-statements">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Financial Statements
              </Button>
            </Link>
            <Link href="/admin/subjects">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Subjects
              </Button>
            </Link>
            <Link href="/admin/upload">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Upload
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="text-text-light hover:text-primary-green">
                Users
              </Button>
            </Link>
          </nav>
        </div>

        {/* Right - Admin Name and Logout */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 text-right hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-text-dark">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-text-light">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</p>
            </div>
            {user?.avatar ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green">
                <UserIcon size={18} />
              </div>
            )}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="gap-2 bg-transparent text-text-dark border-border hover:bg-background-light"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  )
}
