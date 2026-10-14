'use client'

import { useState, useEffect } from 'react'

export type SystemSettings = {
  adsEnabled: boolean
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
