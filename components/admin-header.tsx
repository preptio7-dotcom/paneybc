'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  HelpCircle,
  History,
  Layers,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Palette,
  PenSquare,
  Settings,
  Share2,
  Shield,
  Upload,
  UserRoundCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'

type AdminBadgeState = {
  activeThreatIpCount: number
  pendingFeedbackCount: number
  newUsersTodayCount: number
  pendingAmbassadorCount: number
  notificationCount: number
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badgeKey?: keyof AdminBadgeState
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Content Management',
    items: [
      { label: 'Blog', href: '/admin/blog', icon: PenSquare },
      { label: 'Blog Analytics', href: '/admin/blog/analytics', icon: BarChart2 },
      { label: 'Questions', href: '/admin/questions', icon: BookOpen },
      { label: 'Subjects', href: '/admin/subjects', icon: Layers },
      { label: 'Upload', href: '/admin/upload', icon: Upload },
      { label: 'Financial Statements', href: '/admin/financial-statements', icon: FileText },
      { label: 'FAQ', href: '/admin/faq', icon: HelpCircle },
    ],
  },
  {
    label: 'Users & Feedback',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, badgeKey: 'newUsersTodayCount' },
      { label: 'Student Profiles', href: '/admin/analytics/students', icon: UserIcon },
      { label: 'Ambassador Apps', href: '/admin/join-us', icon: UserRoundCheck, badgeKey: 'pendingAmbassadorCount' },
      { label: 'Referrals', href: '/admin/referrals', icon: Share2 },
      { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare, badgeKey: 'pendingFeedbackCount' },
      { label: 'Reports', href: '/admin/reports', icon: BarChart2 },
      { label: 'Analytics & Reports', href: '/admin/analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Payment Methods', href: '/admin/payment-methods', icon: CreditCard },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Demo Settings', href: '/admin/demo-settings', icon: Settings },
      { label: 'Institutes', href: '/admin/institutes', icon: Building2 },
      { label: 'Beta', href: '/admin/beta-features', icon: FlaskConical },
    ],
  },
  {
    label: 'Customization',
    items: [{ label: 'Avatar Packs', href: '/admin/avatar-packs', icon: Palette }],
  },
  {
    label: 'Security',
    items: [
      { label: 'Security', href: '/admin/security', icon: Shield },
      { label: 'IP Security', href: '/admin/ip-security', icon: Lock, badgeKey: 'activeThreatIpCount' },
      { label: 'Audit', href: '/admin/audit-logs', icon: ClipboardList },
      { label: 'Streak Audit', href: '/admin/streak-audit', icon: History },
    ],
  },
]

const ADMIN_TITLE_OVERRIDES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/admin$/, title: 'Admin Dashboard' },
  { match: /^\/admin\/blog\/new$/, title: 'Create Blog Post' },
  { match: /^\/admin\/blog\/edit\/.+/, title: 'Edit Blog Post' },
  { match: /^\/admin\/blog$/, title: 'Blog Posts' },
  { match: /^\/admin\/blog\/analytics$/, title: 'Blog Analytics' },
  { match: /^\/admin\/questions$/, title: 'Question Management' },
  { match: /^\/admin\/analytics$/, title: 'Analytics & Reports' },
  { match: /^\/admin\/users$/, title: 'User Management' },
  { match: /^\/admin\/referrals$/, title: 'Ambassador Referrals' },
  { match: /^\/admin\/subscriptions$/, title: 'Subscription Requests' },
  { match: /^\/admin\/payment-methods$/, title: 'Payment Methods' },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getBadgeColor(item: NavItem) {
  if (item.badgeKey === 'activeThreatIpCount') return 'bg-red-600 text-white'
  if (item.badgeKey === 'pendingFeedbackCount') return 'bg-amber-500 text-white'
  if (item.badgeKey === 'newUsersTodayCount') return 'bg-blue-500 text-white'
  if (item.badgeKey === 'pendingAmbassadorCount') return 'bg-emerald-500 text-white'
  return 'bg-slate-600 text-white'
}

function toTitleFromPath(pathname: string) {
  const matched = ADMIN_TITLE_OVERRIDES.find((entry) => entry.match.test(pathname))
  if (matched) return matched.title

  const raw = pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .filter((segment) => !segment.startsWith('['))
    .pop()

  if (!raw) return 'Admin'
  return raw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function NavItemLink({
  item,
  pathname,
  badgeValue,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  badgeValue: number
  onNavigate?: () => void
}) {
  const isActive = isActiveRoute(pathname, item.href)
  const baseClass = isActive ? 'bg-primary-green text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${baseClass}`}
      title={item.label}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">
        <item.icon size={18} />
      </span>
      <span className="truncate">{item.label}</span>
      {badgeValue > 0 ? (
        <span
          className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${getBadgeColor(
            item
          )}`}
        >
          {badgeValue > 99 ? '99+' : badgeValue}
        </span>
      ) : null}
    </Link>
  )
}

export function AdminHeader() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [badges, setBadges] = useState<AdminBadgeState>({
    activeThreatIpCount: 0,
    pendingFeedbackCount: 0,
    newUsersTodayCount: 0,
    pendingAmbassadorCount: 0,
    notificationCount: 0,
  })

  const pageTitle = useMemo(() => toTitleFromPath(pathname), [pathname])

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    let isMounted = true

    const loadBadges = async () => {
      try {
        const response = await fetch('/api/admin/nav-badges', {
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        if (!isMounted) return
        setBadges({
          activeThreatIpCount: Number(data?.activeThreatIpCount || 0),
          pendingFeedbackCount: Number(data?.pendingFeedbackCount || 0),
          newUsersTodayCount: Number(data?.newUsersTodayCount || 0),
          pendingAmbassadorCount: Number(data?.pendingAmbassadorCount || 0),
          notificationCount: Number(data?.notificationCount || 0),
        })
      } catch {
        if (!isMounted) return
      }
    }

    void loadBadges()
    const interval = window.setInterval(() => {
      void loadBadges()
    }, 60_000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 border-r border-slate-800 bg-[#0f172a] text-slate-100 lg:flex">
        <div className="flex h-full w-full flex-col">
          <Link href="/admin" className="flex h-[72px] items-center gap-3 border-b border-slate-800 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-green text-sm font-bold text-white">
              P
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Preptio</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </Link>

          <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    badgeValue={item.badgeKey ? badges[item.badgeKey] : 0}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-2">
            <Link
              href="/admin/users"
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-200 transition-colors hover:bg-slate-800"
              title={user?.name || 'Admin User'}
            >
              {user?.avatar ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#dcfce7]">
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-green/20 text-primary-green">
                  <UserIcon size={16} />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-400">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</p>
              </div>
            </Link>

            <Button
              variant="ghost"
              onClick={() => logout()}
              className="mt-1 flex min-h-[44px] w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              title="Logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 h-14 border-b border-slate-200 bg-white lg:left-60 lg:h-[60px]">
        <div className="relative flex h-full items-center gap-2 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu size={20} />
            <span className="sr-only">Open navigation menu</span>
          </Button>

          <h1 className="pointer-events-none absolute left-1/2 max-w-[58vw] -translate-x-1/2 truncate text-center text-[15px] font-semibold text-slate-900 lg:hidden">
            {pageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="relative hidden h-9 w-9 lg:inline-flex">
              <Bell size={18} />
              {badges.notificationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                  {badges.notificationCount > 99 ? '99+' : badges.notificationCount}
                </span>
              ) : null}
              <span className="sr-only">Notifications</span>
            </Button>

            <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-600 lg:hidden" onClick={() => logout()}>
              <LogOut size={18} />
              <span className="sr-only">Logout</span>
            </Button>

            <Link href="/admin/users" className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-100 lg:px-2">
              {user?.avatar ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#dcfce7]">
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-green/10 text-primary-green">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium text-slate-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-500">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 lg:hidden ${isMobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close navigation menu"
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#0f172a] text-slate-100 shadow-xl transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-[280px]'
            }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
            <div>
              <p className="text-sm font-semibold text-white">Preptio</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <X size={18} />
              <span className="sr-only">Close navigation menu</span>
            </Button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4 pb-24">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    badgeValue={item.badgeKey ? badges[item.badgeKey] : 0}
                    onNavigate={() => setIsMobileSidebarOpen(false)}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800/70 px-3 py-2">
              {user?.avatar ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#dcfce7]">
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-green/20 text-primary-green">
                  <UserIcon size={16} />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-400">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => logout()}
              className="min-h-[44px] w-full justify-start gap-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </aside>
      </div>
    </>
  )
}
