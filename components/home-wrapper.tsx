'use client'

import { ReactNode } from 'react'

/**
 * Wrapper component to prevent hydration mismatches
 * Forces client-side rendering of the entire homepage
 */
export function HomeWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}
