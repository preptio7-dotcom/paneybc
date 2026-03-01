'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Bell,
  BookOpen,
  ClipboardList,
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
  Settings,
  Shield,
  Upload,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import { ProfileModal } from './profile-modal'

type AdminBadgeState = {
  activeThreatIpCount: number
  pendingFeedbackCount: number
  newUsersTodayCount: number
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
      { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare, badgeKey: 'pendingFeedbackCount' },
      { label: 'Reports', href: '/admin/reports', icon: BarChart2 },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Demo Settings', href: '/admin/demo-settings', icon: Settings },
      { label: 'Beta', href: '/admin/beta-features', icon: FlaskConical },
    ],
  },
  {
    label: 'Customization',
    items: [
      { label: 'Avatar Packs', href: '/admin/avatar-packs', icon: Palette },
    ],
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

function isActiveRoute(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getBadgeColor(item: NavItem) {
  if (item.badgeKey === 'activeThreatIpCount') return 'bg-red-600 text-white'
  if (item.badgeKey === 'pendingFeedbackCount') return 'bg-amber-500 text-white'
  if (item.badgeKey === 'newUsersTodayCount') return 'bg-blue-500 text-white'
  return 'bg-slate-600 text-white'
}

function NavItemLink({
  item,
  pathname,
  badgeValue,
  onNavigate,
  mobile,
}: {
  item: NavItem
  pathname: string
  badgeValue: number
  onNavigate?: () => void
  mobile?: boolean
}) {
  const isActive = isActiveRoute(pathname, item.href)
  const baseClass = isActive
    ? 'bg-primary-green text-white'
    : 'text-slate-300 hover:bg-slate-800 hover:text-white'

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${baseClass} md:justify-center xl:justify-start`}
      title={item.label}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <item.icon size={18} />
        {!mobile && badgeValue > 0 ? (
          <span className="absolute -right-2 -top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 md:block xl:hidden" />
        ) : null}
      </span>

      <span className={`${mobile ? 'inline' : 'hidden xl:inline'}`}>{item.label}</span>

      {badgeValue > 0 ? (
        <span
          className={`ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${getBadgeColor(
            item
          )} ${mobile ? '' : 'hidden xl:inline-flex'}`}
        >
          {badgeValue > 99 ? '99+' : badgeValue}
        </span>
      ) : null}

      {!mobile ? (
        <span className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow md:group-hover:block xl:hidden">
          {item.label}
        </span>
      ) : null}
    </Link>
  )
}

export function AdminHeader() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [badges, setBadges] = useState<AdminBadgeState>({
    activeThreatIpCount: 0,
    pendingFeedbackCount: 0,
    newUsersTodayCount: 0,
    notificationCount: 0,
  })

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

  const flattenedItems = useMemo(() => NAV_GROUPS.flatMap((group) => group.items), [])

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden border-r border-slate-800 bg-[#0f172a] text-slate-100 transition-all duration-300 md:flex md:w-16 xl:w-60">
        <div className="flex h-full w-full flex-col">
          <Link
            href="/admin"
            className="flex h-[72px] items-center gap-3 border-b border-slate-800 px-3 md:justify-center xl:justify-start xl:px-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-green text-sm font-bold text-white">
              P
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold text-white">Preptio</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </Link>

          <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 xl:block">
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
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-200 transition-colors hover:bg-slate-800 md:justify-center xl:justify-start"
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
              <div className="hidden xl:block">
                <p className="text-sm font-medium text-white">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-400">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
                </p>
              </div>
              <span className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow md:group-hover:block xl:hidden">
                {user?.name || 'Admin User'}
              </span>
            </button>

            <Button
              variant="ghost"
              onClick={() => logout()}
              className="group relative mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-300 hover:bg-red-500/10 hover:text-red-200 md:justify-center xl:justify-start"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden xl:inline">Logout</span>
              <span className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow md:group-hover:block xl:hidden">
                Logout
              </span>
            </Button>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 h-[60px] border-b border-slate-200 bg-white md:left-16 xl:left-60">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={20} />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              {badges.notificationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                  {badges.notificationCount > 99 ? '99+' : badges.notificationCount}
                </span>
              ) : null}
              <span className="sr-only">Notifications</span>
            </Button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100"
            >
              {user?.avatar ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#dcfce7]">
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-green/10 text-primary-green">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-500">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 transition-opacity duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-[#0f172a] text-slate-100 shadow-xl transition-transform duration-300">
            <div className="flex h-[60px] items-center justify-between border-b border-slate-800 px-4">
              <div>
                <p className="text-sm font-semibold text-white">Preptio</p>
                <p className="text-xs text-slate-400">Admin Panel</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X size={18} />
                <span className="sr-only">Close navigation menu</span>
              </Button>
            </div>

            <nav className="space-y-5 overflow-y-auto px-2 py-4">
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
                      mobile
                    />
                  ))}
                </div>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-3">
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
                  <p className="text-xs text-slate-400">
                    {user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => logout()}
                className="w-full justify-start gap-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}
