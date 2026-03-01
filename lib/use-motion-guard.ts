'use client'

import { useEffect, useState } from 'react'

type NavigatorWithHints = Navigator & {
  deviceMemory?: number
  connection?: {
    effectiveType?: string
    saveData?: boolean
  }
}

function detectLowEndDevice() {
  if (typeof window === 'undefined') return false
  const navigatorHints = window.navigator as NavigatorWithHints

  const lowMemory = typeof navigatorHints.deviceMemory === 'number' && navigatorHints.deviceMemory <= 2
  const lowCpu =
    typeof navigatorHints.hardwareConcurrency === 'number' &&
    navigatorHints.hardwareConcurrency > 0 &&
    navigatorHints.hardwareConcurrency <= 4
  const saveData = Boolean(navigatorHints.connection?.saveData)
  const lowBandwidth = /(^|-)2g$/i.test(String(navigatorHints.connection?.effectiveType || ''))

  return lowMemory || lowCpu || saveData || lowBandwidth
}

export function useMotionGuard() {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => {
      setShouldReduceMotion(mediaQuery.matches || detectLowEndDevice())
    }

    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return shouldReduceMotion
}

