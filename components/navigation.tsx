'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import { ProfileModal } from './profile-modal'
import Image from 'next/image'
import { NotificationOptIn } from './notification-opt-in'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [isStudyOpen, setIsStudyOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [welcomeTemplate, setWelcomeTemplate] = useState('Welcome back, {{name}}!')
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const dashboardNavRoutes = [
    '/dashboard',
    '/weak-area',
    '/wrong-answers',
    '/financial-statements',
    '/study-session',
    '/notes',
    '/study-planner',
    '/analytics',
    '/exam-simulator',
  ]
  const showDashboardNav = !!pathname && dashboardNavRoutes.some((route) => pathname.startsWith(route))
  const practiceLinks = [
    { href: '/weak-area', label: 'Weak Area Intensive' },
    { href: '/wrong-answers', label: 'Practice Wrong Answers' },
    { href: '/financial-statements', label: 'Financial Statements' },
  ]

  const studyLinks = [
    { href: '/study-session', label: 'Study Session' },
    { href: '/notes', label: 'Notes & Flashcards' },
    { href: '/study-planner', label: 'Study Planner' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/exam-simulator', label: 'Exam Simulator' },
  ]

  const dashboardSectionLinks = [
    { href: '/dashboard#account-data', label: 'Account & Data' },
    { href: '/dashboard#subjects', label: 'Your Subjects' },
    { href: '/dashboard#performance-tracking', label: 'Performance Tracking' },
  ]

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) return
        const data = await response.json()
        if (data.welcomeMessageTemplate) {
          setWelcomeTemplate(data.welcomeMessageTemplate)
        }
      } catch (error) {
        // ignore
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!isMenuOpen) {
      setIsPracticeOpen(false)
      setIsStudyOpen(false)
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (!user) {
      setHasUnread(false)
      return
    }

    try {
      const unread = localStorage.getItem('preptio_welcome_unread') === '1'
      setHasUnread(unread)
    } catch (error) {
      setHasUnread(false)
    }
  }, [user?.id])

  const welcomeMessage = useMemo(() => {
    const name = user?.name || 'User'
    const firstName = name.split(' ')[0] || name
    const template = welcomeTemplate && welcomeTemplate.trim().length > 0
      ? welcomeTemplate
      : 'Welcome back, {{name}}!'
    return template
      .replace(/{{\s*name\s*}}/gi, name)
      .replace(/{{\s*firstName\s*}}/gi, firstName)
  }, [user?.name, welcomeTemplate])

  const handleOpenNotifications = () => {
    setIsNotifOpen((prev) => !prev)
    if (hasUnread) {
      setHasUnread(false)
      try {
        localStorage.setItem('preptio_welcome_unread', '0')
      } catch (error) {
        // ignore
      }
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-[70px] flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="font-heading font-bold text-xl text-primary-green">
          Preptio
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {showDashboardNav ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[60vw] rounded-full bg-slate-50 border border-slate-200 px-2 py-1">
              {dashboardSectionLinks.slice(0, 1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-2 rounded-full hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
              <div className="relative group">
                <Link
                  href="/dashboard#practice-modes"
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-2 rounded-full hover:bg-white flex items-center gap-1"
                >
                  Practice Modes
                </Link>
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                  {practiceLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-sm text-text-dark hover:bg-slate-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <Link
                  href="/dashboard#study-tools"
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-2 rounded-full hover:bg-white flex items-center gap-1"
                >
                  Study Tools
                </Link>
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                  {studyLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-sm text-text-dark hover:bg-slate-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              {dashboardSectionLinks.slice(1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-2 rounded-full hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : (
            <>
              <Link href="/" className="text-text-dark hover:text-primary-green transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-text-dark hover:text-primary-green transition-colors">
                About
              </Link>
              <Link href="/subjects" className="text-text-dark hover:text-primary-green transition-colors">
                Subjects
              </Link>
              <Link href="/join-us" className="text-text-dark hover:text-primary-green transition-colors">
                Join Us
              </Link>
              <Link href="/contact" className="text-text-dark hover:text-primary-green transition-colors">
                Contact
              </Link>
            </>
          )}
        </div>

        {/* Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-6">
              <Link
                href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="text-text-dark hover:text-primary-green font-medium transition-colors"
              >
                {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
              </Link>
              <div className="relative">
                <button
                  onClick={handleOpenNotifications}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 hover:border-primary-green transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={18} className="text-text-dark" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Notification</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{welcomeMessage}</p>
                    <p className="mt-1 text-xs text-slate-500">Tap to dismiss</p>
                    <div className="mt-4">
                      <NotificationOptIn />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 text-text-dark font-medium hover:text-primary-green transition-colors focus:outline-none"
              >
                {user.avatar ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                    <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                  </div>
                ) : (
                  <UserIcon size={18} className="text-primary-green" />
                )}
                <span>{user.name}</span>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Link href="/demo">
                <Button
                  size="sm"
                  className="bg-[linear-gradient(135deg,_#667eea_0%,_#764ba2_100%)] text-white hover:opacity-90 transition-opacity"
                >
                  Try Demo
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 hover:bg-background-light rounded-lg transition-colors"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-[70px] left-0 right-0 bg-white border-b border-border md:hidden">
          <div className="flex flex-col gap-4 p-4">
            {showDashboardNav ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
                {dashboardSectionLinks.slice(0, 1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-text-dark hover:text-primary-green transition-colors py-2 px-2 rounded-lg hover:bg-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center justify-between px-2">
                  <Link
                    href="/dashboard#practice-modes"
                    className="text-text-dark hover:text-primary-green transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Practice Modes
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsPracticeOpen((prev) => !prev)}
                    className="text-xs text-slate-500 px-2 py-1"
                  >
                    {isPracticeOpen ? 'Hide' : 'Show'}
                  </button>
                </div>
                {isPracticeOpen && (
                  <div className="pl-4 flex flex-col gap-2 pb-2">
                    {practiceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-text-dark hover:text-primary-green transition-colors py-1 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between px-2">
                  <Link
                    href="/dashboard#study-tools"
                    className="text-text-dark hover:text-primary-green transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Study Tools
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsStudyOpen((prev) => !prev)}
                    className="text-xs text-slate-500 px-2 py-1"
                  >
                    {isStudyOpen ? 'Hide' : 'Show'}
                  </button>
                </div>
                {isStudyOpen && (
                  <div className="pl-4 flex flex-col gap-2 pb-2">
                    {studyLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-text-dark hover:text-primary-green transition-colors py-1 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
                {dashboardSectionLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-text-dark hover:text-primary-green transition-colors py-2 px-2 rounded-lg hover:bg-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <Link href="/" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  Home
                </Link>
                <Link href="/about" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  About
                </Link>
                <Link href="/subjects" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  Subjects
                </Link>
                <Link href="/join-us" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  Join Us
                </Link>
                <Link href="/contact" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </Link>
              </>
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {user ? (
                <>
                  <Link
                    href={user.role === 'admin' ? '/admin' : '/dashboard'}
                    className="text-text-dark hover:text-primary-green transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                  </Link>
                  <button
                    onClick={() => {
                      setIsProfileOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center gap-2 px-2 py-3 text-text-dark font-medium mb-1 hover:text-primary-green transition-colors w-full text-left"
                  >
                    {user.avatar ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                        <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <UserIcon size={20} className="text-primary-green" />
                    )}
                    <span>{user.name}</span>
                  </button>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      logout()
                      setIsMenuOpen(false)
                    }}
                  >
                    <LogOut size={18} />
                    Logout
                  </Button>
                  <div className="pt-2">
                    <NotificationOptIn />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/demo" className="w-full" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-[linear-gradient(135deg,_#667eea_0%,_#764ba2_100%)] text-white hover:opacity-90 transition-opacity">
                      Try Demo
                    </Button>
                  </Link>
                  <Link href="/auth/login" className="w-full" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/signup" className="w-full" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </nav>
  )
}
