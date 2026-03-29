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
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

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
  const [isForbidden, setIsForbidden] = useState(false)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [adSenseConfig, setAdSenseConfig] = useState<any>({
    globalEnabled: true,
    allowedPaths: ['/', '/blog', '/blog/*'],
    blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/buy-subscription', '/register'],
    showAdsToUnpaid: true,
    showAdsToPaid: false,
    showAdsToAmbassador: false,
  })
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
        if (response.status === 403) {
          setIsForbidden(true)
          return
        }
        if (!response.ok) {
          throw new Error('Failed to load settings')
        }
        const data = await response.json()
        setAdsEnabled(Boolean(data.adsEnabled))
        if (data.adSenseConfig) {
          setAdSenseConfig(data.adSenseConfig)
        }
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
          adSenseConfig,
          adContent: {
            dashboard: dashboardAd,
            results: resultsAd,
          },
        }),
      })

      if (response.status === 403) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to manage ads. Please contact the Super Admin.',
          variant: 'destructive',
        })
        return
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }
      toast({
        title: 'Saved',
        description: 'Ad settings updated.',
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

  if (isForbidden) {
    return (
      <main className="min-h-screen bg-background-light">
        <AdminHeader />
        <div className="pt-32 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-dark mb-2">Access Denied</h1>
          <p className="text-text-light max-w-md">
            Your admin account does not have permission to manage the AdSense system. Please request access from a Super Admin.
          </p>
          <Link href="/admin">
            <Button variant="outline" className="mt-6 font-semibold">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  const handleToggleGlobal = async (value: boolean) => {
    setAdsEnabled(value)
    setAdSenseConfig((prev: any) => ({ ...prev, globalEnabled: value }))
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-5xl mx-auto px-4 md:px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">Ad Management</h1>
            <p className="text-text-light">Control Google AdSense and internal Sponsored sections.</p>
          </div>

          <Card className="border-border">
            <CardHeader>
                <CardTitle>Google AdSense Configuration</CardTitle>
                <CardDescription>Grandular control over where and to whom Google Ads are shown.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-base font-bold">Global AdSense Toggle</Label>
                        <p className="text-sm text-text-light">Master switch to enable or disable AdSense sitewide.</p>
                    </div>
                    <Switch 
                        checked={adSenseConfig.globalEnabled} 
                        onCheckedChange={(val) => handleToggleGlobal(val)} 
                    />
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-bold">Visibility by User Role</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch 
                                checked={adSenseConfig.showAdsToUnpaid} 
                                onCheckedChange={(val) => setAdSenseConfig((prev: any) => ({ ...prev, showAdsToUnpaid: val }))} 
                            />
                            <Label>Unpaid Students</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                checked={adSenseConfig.showAdsToPaid} 
                                onCheckedChange={(val) => setAdSenseConfig((prev: any) => ({ ...prev, showAdsToPaid: val }))} 
                            />
                            <Label>Paid Students</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                checked={adSenseConfig.showAdsToAmbassador} 
                                onCheckedChange={(val) => setAdSenseConfig((prev: any) => ({ ...prev, showAdsToAmbassador: val }))} 
                            />
                            <Label>Ambassadors</Label>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                        <Label className="text-base font-bold">Allowed Paths</Label>
                        <p className="text-xs text-text-light">Comma-separated list of paths where ads CAN show (Wildcards supported, e.g. /blog/*).</p>
                        <Input 
                            value={adSenseConfig.allowedPaths.join(', ')} 
                            onChange={(e) => setAdSenseConfig((prev: any) => ({ 
                                ...prev, 
                                allowedPaths: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                            }))} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-base font-bold">Blocked Paths (Restriction Override)</Label>
                        <p className="text-xs text-text-light">Comma-separated list of paths where ads MUST NEVER show.</p>
                        <Input 
                            value={adSenseConfig.blockedPaths.join(', ')} 
                            onChange={(e) => setAdSenseConfig((prev: any) => ({ 
                                ...prev, 
                                blockedPaths: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                            }))} 
                        />
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Internal Sponsored Section</CardTitle>
              <CardDescription>Used on the Home page and User Dashboard as a house ad.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <Label className="font-bold">Show Sponsored Section</Label>
                  <p className="text-sm text-text-light">Toggle house ads (notes, plans etc).</p>
                </div>
                <Switch checked={adsEnabled} onCheckedChange={setAdsEnabled} disabled={isLoading || isSaving} />
              </div>

              <div className="space-y-2 pt-2">
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

          <div className="flex justify-end">
            <Button size="lg" onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save All Ad Settings'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

