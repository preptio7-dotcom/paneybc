'use client'

import { useEffect } from 'react'

export default function SuperAdminLogoutPage() {
  useEffect(() => {
    const run = async () => {
      try {
        await fetch('/api/auth/super-admin/logout', { method: 'POST', credentials: 'include' })
      } catch (error) {
        // ignore errors and still redirect
      } finally {
        window.location.assign('/')
      }
    }

    run()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center">
      <div className="text-sm text-gray-400">Signing out...</div>
    </div>
  )
}
