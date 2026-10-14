'use client'

import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import './admin-mobile.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const hasAdminAccess = user?.role === 'admin' || user?.role === 'super_admin'
    const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/forgot-password'

    useEffect(() => {
        if (isAuthRoute) return
        if (!loading && !hasAdminAccess) {
            if (user) {
                router.push('/dashboard?error=403')
            } else {
                router.push('/admin/login')
            }
        }
    }, [hasAdminAccess, isAuthRoute, loading, pathname, router, user])

    useEffect(() => {
        if (typeof document === 'undefined') return
        if (isAuthRoute) {
            document.body.classList.remove('admin-route')
            return
        }
        document.body.classList.add('admin-route')
        return () => {
            document.body.classList.remove('admin-route')
        }
    }, [isAuthRoute])

    if (isAuthRoute) {
        return <>{children}</>
    }

    if (loading || !hasAdminAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary-green" size={48} />
                    <p className="text-text-light font-medium">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    return <div className="admin-shell lg:pl-60">{children}</div>
}
