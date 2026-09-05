'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __preptioClarityInitialized?: boolean
  }
}

export function ClarityInit() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim()
    if (!projectId) return
    if (window.__preptioClarityInitialized) return

    let active = true

    const init = async () => {
      const { default: Clarity } = await import('@microsoft/clarity')
      if (!active) return
      Clarity.init(projectId)
      window.__preptioClarityInitialized = true
    }

    void init()

    return () => {
      active = false
    }
  }, [])

  return null
}
