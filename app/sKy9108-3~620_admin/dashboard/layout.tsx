'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    BarChart3,
    Settings,
    LogOut,
    ShieldCheck,
    MessageSquare,
    Menu,
    X,
    User,
    Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
    { name: 'Overview', href: '/sKy9108-3~620_admin/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/sKy9108-3~620_admin/dashboard/analytics', icon: BarChart3 },
    { name: 'Messages', href: '/sKy9108-3~620_admin/dashboard/messages', icon: MessageSquare },
    { name: 'Users', href: '/sKy9108-3~620_admin/dashboard/users', icon: User },
    { name: 'Create Admin', href: '/sKy9108-3~620_admin/dashboard/admins', icon: ShieldCheck },
    { name: 'Settings', href: '/sKy9108-3~620_admin/dashboard/settings', icon: Settings },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                const response = await fetch('/api/admin/super-stats')
                if (!response.ok) {
                    setIsAuthorized(false)
                    router.replace('/sKy9108-3~620_admin/login')
                    return
                }
                setIsAuthorized(true)
            } catch (error) {
                setIsAuthorized(false)
                router.replace('/sKy9108-3~620_admin/login')
            } finally {
                setIsCheckingAuth(false)
            }
        }

        verifyAccess()
    }, [router])

    const handleLogout = async () => {
        try {
            localStorage.clear()
            sessionStorage.clear()
        } catch (error) {
            // ignore storage errors
        }

        try {
            if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((key) => caches.delete(key)))
            }
        } catch (error) {
            // ignore cache errors
        }

        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map((reg) => reg.unregister()))
            }
        } catch (error) {
            // ignore service worker errors
        }

        window.location.assign('/sKy9108-3~620_admin/logout')
    }

    if (isCheckingAuth || !isAuthorized) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary-green" size={40} />
                    <p className="text-gray-400 font-medium">Verifying super admin access...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-950 text-gray-200 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-green rounded-xl flex items-center justify-center">
                            <ShieldCheck className="text-gray-950" size={24} />
                        </div>
                        <span className="font-bold text-white text-xl">SuperAdmin</span>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary-green text-gray-950 font-bold'
                                    : 'hover:bg-gray-900 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col h-full overflow-hidden">
                {/* Mobile Header with Menu Button */}
                <div className="md:hidden p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-green rounded-lg flex items-center justify-center">
                            <ShieldCheck className="text-gray-950" size={18} />
                        </div>
                        <span className="font-bold text-white">SuperAdmin</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-200 hover:text-white"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                <div className="flex-grow overflow-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto pb-safe">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
