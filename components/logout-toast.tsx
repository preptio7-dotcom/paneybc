'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export function LogoutToast() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const loggedOut = searchParams.get('loggedOut')
    if (!loggedOut) return

    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    })

    router.replace('/')
  }, [router, searchParams, toast])

  return null
}
