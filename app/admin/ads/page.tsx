'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

type AdContent = {
  headline: string
  body: string
  cta: string
  href: string
}

export default function AdminAdsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [dashboardAd, setDashboardAd] = useState<AdContent>({
    headline: '',
    body: '',
    cta: '',
    href: '',
  })
  const [resultsAd, setResultsAd] = useState<AdContent>({
    headline: '',
    body: '',
    cta: '',
    href: '',
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/system/settings')
        if (!response.ok) {
          throw new Error('Failed to load settings')
        }
        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        setDashboardAd({
          headline: data.adContent?.dashboard?.headline || '',
          body: data.adContent?.dashboard?.body || '',
          cta: data.adContent?.dashboard?.cta || '',
          href: data.adContent?.dashboard?.href || '',
        })
        setResultsAd({
          headline: data.adContent?.results?.headline || '',
          body: data.adContent?.results?.body || '',
          cta: data.adContent?.results?.cta || '',
          href: data.adContent?.results?.href || '',
        })
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load ad settings.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsEnabled,
          adContent: {
            dashboard: dashboardAd,
            results: resultsAd,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }
      toast({
        title: 'Saved',
        description: 'Sponsored section settings updated.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (value: boolean) => {
    const previous = adsEnabled
    setAdsEnabled(value)
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsEnabled: value,
          adContent: {
            dashboard: dashboardAd,
            results: resultsAd,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }
      toast({
        title: value ? 'Sponsored enabled' : 'Sponsored disabled',
        description: 'Your change has been saved.',
      })
    } catch (error: any) {
      setAdsEnabled(previous)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[80px] pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Sponsored Section</h1>
            <p className="text-text-light">Control the Sponsored block shown to users on Home, Dashboard, and Results.</p>
          </div>

          <Card className="border-border">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-dark">Show Sponsored Section</h2>
                <p className="text-text-light text-sm">Toggle to hide or show sponsored content across the site.</p>
              </div>
              <Switch checked={adsEnabled} onCheckedChange={handleToggle} disabled={isLoading || isSaving} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Home + Dashboard Content</CardTitle>
              <CardDescription>Used on the Home page and User Dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  value={dashboardAd.headline}
                  onChange={(e) => setDashboardAd((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Headline"
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={dashboardAd.body}
                  onChange={(e) => setDashboardAd((prev) => ({ ...prev, body: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Text</Label>
                  <Input
                    value={dashboardAd.cta}
                    onChange={(e) => setDashboardAd((prev) => ({ ...prev, cta: e.target.value }))}
                    placeholder="Button text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Redirect URL</Label>
                  <Input
                    value={dashboardAd.href}
                    onChange={(e) => setDashboardAd((prev) => ({ ...prev, href: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Results Page Content</CardTitle>
              <CardDescription>Used on the Results view.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  value={resultsAd.headline}
                  onChange={(e) => setResultsAd((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Headline"
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={resultsAd.body}
                  onChange={(e) => setResultsAd((prev) => ({ ...prev, body: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Text</Label>
                  <Input
                    value={resultsAd.cta}
                    onChange={(e) => setResultsAd((prev) => ({ ...prev, cta: e.target.value }))}
                    placeholder="Button text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Redirect URL</Label>
                  <Input
                    value={resultsAd.href}
                    onChange={(e) => setResultsAd((prev) => ({ ...prev, href: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Sponsored Settings'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
