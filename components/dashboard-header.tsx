'use client'

import React, { useState } from 'react'
import { Bell, LogOut, User } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { ProfileModal } from './profile-modal'
import Image from 'next/image'
import { NotificationOptIn } from './notification-opt-in'

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-border z-40 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <h1 className="font-heading font-bold text-xl text-primary-green cursor-pointer">
           Preptio
          </h1>
        </Link>

        {/* Center - Title */}
        <h2 className="text-text-dark font-heading font-semibold hidden md:block">
          Dashboard
        </h2>

        {/* Right - User Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 hover:bg-background-light p-1 rounded-lg transition-colors focus:outline-none"
          >
            {user?.avatar ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green">
                <User size={20} />
              </div>
            )}
            <span className="text-sm font-medium text-text-dark hidden sm:inline">{user?.name}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="p-2 hover:bg-background-light rounded-lg transition-colors relative"
              aria-label="Notifications"
            >
            <Bell size={20} className="text-text-dark" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error-red rounded-full" />
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Notifications</p>
                <p className="mt-2 text-sm text-slate-700">
                  Enable browser notifications to get review reminders.
                </p>
                <div className="mt-4">
                  <NotificationOptIn />
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="gap-2 text-text-dark hover:text-error-red"
          >
            <LogOut size={18} />
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
