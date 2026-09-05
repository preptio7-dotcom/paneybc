'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { betaFeatureDefinitions } from '@/data/beta-features'
import {
  DEFAULT_BETA_FEATURE_SETTINGS,
  extractBetaFeatureSettings,
  type BetaFeatureSettings,
} from '@/lib/beta-features'

export default function AdminBetaFeaturesPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [betaFeatures, setBetaFeatures] = useState<BetaFeatureSettings>(DEFAULT_BETA_FEATURE_SETTINGS)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/system/settings')
        if (!response.ok) {
          throw new Error('Failed to load beta settings')
        }
        const data = await response.json()
        setBetaFeatures(extractBetaFeatureSettings(data?.testSettings || {}))
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Unable to load beta settings.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleToggle = (featureKey: keyof BetaFeatureSettings, checked: boolean) => {
    setBetaFeatures((prev) => ({
      ...prev,
      [featureKey]: checked ? 'public' : 'beta_ambassador',
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSettings: {
            betaFeatures,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save beta settings')
      }
      toast({
        title: 'Saved',
        description: 'Beta feature visibility updated.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save beta settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-5xl mx-auto px-4 md:px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Beta Features</h1>
            <p className="text-text-light">
              Manage which features are public and which stay ambassador-only beta.
            </p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Feature Visibility</CardTitle>
              <CardDescription>
                Public ON = visible to everyone. Public OFF = shown only to ambassadors under Beta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {betaFeatureDefinitions.map((feature) => {
                const isPublic = betaFeatures[feature.key] === 'public'
                return (
                  <div key={feature.key} className="rounded-lg border border-border bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-dark">{feature.label}</p>
                      <p className="text-sm text-text-light">{feature.description}</p>
                      <p className="text-xs text-slate-500 mt-1">Route: {feature.href}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-light">{isPublic ? 'Public' : 'Beta'}</span>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                        disabled={isLoading || isSaving}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? 'Saving...' : 'Save Beta Settings'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}


