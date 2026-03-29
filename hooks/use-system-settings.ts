'use client'

import { useState, useEffect } from 'react'

export type AdSenseConfig = {
  globalEnabled: boolean
  allowedPaths: string[]
  blockedPaths: string[]
  showAdsToUnpaid: boolean
  showAdsToPaid: boolean
  showAdsToAmbassador: boolean
}

export type SystemSettings = {
  adsEnabled: boolean
  adSenseConfig: AdSenseConfig
}

let cachedSettings: SystemSettings | null = null

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(cachedSettings)
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) return

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (response.ok) {
          const data = await response.json()
          const fetchedSettings = {
            adsEnabled: data.adsEnabled,
            adSenseConfig: data.adSenseConfig
          }
          cachedSettings = fetchedSettings
          setSettings(fetchedSettings)
        }
      } catch (error) {
        console.error('Failed to fetch system settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, loading }
}
