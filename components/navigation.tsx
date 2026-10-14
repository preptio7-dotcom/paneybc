'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'
import { NotificationOptIn } from './notification-opt-in'
import { CommunityAnnouncementBanner } from './community-announcement-banner'
import { usePathname } from 'next/navigation'
import { useAuthLinks } from '@/hooks/use-auth-links'
import { PremiumBadge } from './premium-badge'
import { PremiumMobileButton } from './premium-badge'
import {
  canAccessBetaFeature,
  DEFAULT_BETA_FEATURE_SETTINGS,
  extractBetaFeatureSettings,
  type BetaFeatureSettings,
} from '@/lib/beta-features'
import { betaFeatureDefinitions } from '@/data/beta-features'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [isStudyOpen, setIsStudyOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [welcomeTemplate, setWelcomeTemplate] = useState('Welcome back, {{name}}!')
  const [betaFeatures, setBetaFeatures] = useState<BetaFeatureSettings>(DEFAULT_BETA_FEATURE_SETTINGS)
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const { loginHref, signupHref } = useAuthLinks()
  const dashboardNavRoutes = [
    '/dashboard',
    '/dashboard/analytics',
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
  const isPrivilegedUser = user?.role === 'admin' || user?.role === 'super_admin'
  const canAccessAnalyticsFeature =
    isPrivilegedUser ||
    canAccessBetaFeature(betaFeatures.performanceAnalytics, user?.studentRole)
  const practiceLinks = [
    { href: '/weak-area', label: 'Weak Area Intensive' },
    { href: '/wrong-answers', label: 'Practice Wrong Answers' },
    { href: '/financial-statements', label: 'Financial Statements' },
  ]

  const studyLinks = [
    { href: '/community', label: 'Community' },
    { href: '/study-session', label: 'Study Session' },
    { href: '/notes', label: 'Notes & Flashcards' },
    { href: '/study-planner', label: 'Study Planner' },
    ...(canAccessAnalyticsFeature ? [{ href: '/dashboard/analytics', label: 'Analytics' }] : []),
    { href: '/exam-simulator', label: 'Exam Simulator' },
  ]

  const dashboardSectionLinks = [
    { href: '/dashboard/settings', label: 'Account Settings' },
    { href: '/dashboard#continue-learning', label: 'Continue Learning' },
    ...(canAccessAnalyticsFeature
      ? [{ href: '/dashboard/analytics', label: 'View Analytics' }]
      : []),
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (!response.ok) return
        const data = await response.json()
        if (data.welcomeMessageTemplate) {
          setWelcomeTemplate(data.welcomeMessageTemplate)
        }
        setBetaFeatures(extractBetaFeatureSettings(data?.testSettings || {}))
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

  const betaNavItems = useMemo(() => {
    if (user?.studentRole !== 'ambassador') return []
    return betaFeatureDefinitions.filter(
      (item) => item.key !== 'studentFeedback' && betaFeatures[item.key] !== 'public'
    )
  }, [betaFeatures, user?.studentRole])
  const showFeatureShowcaseInMainNav =
    isPrivilegedUser ||
    canAccessBetaFeature(betaFeatures.homepageFeatureShowcase, user?.studentRole)
  const showBetaLinks = betaNavItems.length > 0
  const useFrostedNavbar = isScrolled || isMenuOpen
  const profileHref = user?.role === 'student' ? '/dashboard/settings' : '/admin/users'

  return (
    <>
      <CommunityAnnouncementBanner />
      <nav
        className={`sticky top-0 left-0 right-0 z-[1000] h-[72px] flex items-center transition-all duration-300 ease-in-out ${
        useFrostedNavbar
          ? 'navbar-frosted border-b border-black/10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
          : 'bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-none'
      }`}
    >
      <div className="max-w-[96rem] mx-auto w-full px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-heading font-bold text-2xl text-primary-green tracking-tight hover:opacity-90 transition-opacity shrink-0">
          <Image
            src="/favicon.svg"
            alt="Preptio logo"
            width={34}
            height={34}
            className="w-[34px] h-[34px] object-contain drop-shadow-xs"
            priority
          />
          <span>Preptio</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium">
          {showDashboardNav ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[55vw] rounded-full bg-slate-50 border border-slate-200 px-2 py-1">
              {dashboardSectionLinks.slice(0, 1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
              <div className="relative group">
                <Link
                  href="/dashboard#practice-modes"
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white flex items-center gap-1"
                >
                  Practice Modes
                </Link>
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
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
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white flex items-center gap-1"
                >
                  Study Tools
                </Link>
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
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
                  className="text-slate-700 hover:text-primary-green transition-colors whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3.5 lg:gap-5">
              <Link href="/" className="text-slate-600 hover:text-primary-green transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-slate-600 hover:text-primary-green transition-colors">
                About
              </Link>
              <Link href="/subjects" className="text-slate-600 hover:text-primary-green transition-colors">
                Subjects
              </Link>
              {showFeatureShowcaseInMainNav ? (
                <Link
                  href="/#platform-features-showcase"
                  className="text-slate-600 hover:text-primary-green transition-colors"
                >
                  Features
                </Link>
              ) : null}
              <Link href="/community" className="text-slate-600 hover:text-primary-green transition-colors" aria-current={pathname === "/community" ? "page" : undefined}>
                Community
              </Link>
              <Link href="/contact" className="text-slate-600 hover:text-primary-green transition-colors">
                Contact
              </Link>
            </div>
          )}
        </div>

        {/* Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5 lg:gap-3">
              <PremiumBadge />
              <Link
                href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="text-slate-700 hover:text-primary-green font-medium text-xs lg:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
              </Link>
              {user.org && (user.org.role === 'admin' || user.org.role === 'owner') && (
                <Link
                  href="/org"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shrink-0"
                >
                  <span className="text-xs">🏛️</span>
                  <span>{user.org.name}</span>
                </Link>
              )}
              <div className="relative">
                <button
                  onClick={handleOpenNotifications}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 hover:border-primary-green hover:bg-slate-50 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={15} className="text-slate-700" />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
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
              <Link
                href={profileHref}
                className="flex items-center gap-1.5 text-slate-800 font-medium text-xs lg:text-sm hover:text-primary-green px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none"
              >
                {user.avatar ? (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#86efac]">
                    <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-bold text-xs">
                    {(user.name || 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <span className="max-w-[80px] lg:max-w-[110px] truncate">{user.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="flex items-center gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 h-8 text-xs font-medium"
              >
                <LogOut size={14} />
                <span>Logout</span>
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
              <Link href={loginHref}>
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href={signupHref}>
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
            {/* Mobile Premium Button */}
            <PremiumMobileButton />
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
                {showBetaLinks ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold mb-1">Beta</p>
                    {betaNavItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="text-text-dark hover:text-primary-green transition-colors py-1 block"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
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
                {showFeatureShowcaseInMainNav ? (
                  <Link
                    href="/#platform-features-showcase"
                    className="text-text-dark hover:text-primary-green transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Features
                  </Link>
                ) : null}
                <Link href="/community" className="block py-2 text-text-dark hover:text-primary-green" onClick={() => setIsMenuOpen(false)}>Community</Link>
                <Link href="/contact" className="text-text-dark hover:text-primary-green transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </Link>
                {showBetaLinks ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold mb-1">Beta</p>
                    {betaNavItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="text-text-dark hover:text-primary-green transition-colors py-1 block"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
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
                  <Link
                    href={profileHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-3 text-text-dark font-medium mb-1 hover:text-primary-green transition-colors w-full text-left"
                  >
                    {user.avatar ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#dcfce7]">
                        <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <UserIcon size={20} className="text-primary-green" />
                    )}
                    <span>{user.name}</span>
                  </Link>
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
                  <Link href={loginHref} className="w-full" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href={signupHref} className="w-full" onClick={() => setIsMenuOpen(false)}>
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
      <style jsx>{`
        .navbar-frosted {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        @supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
          .navbar-frosted {
            background: rgba(255, 255, 255, 0.95);
          }
        }
      `}</style>
    </nav>
    </>
  )
}
