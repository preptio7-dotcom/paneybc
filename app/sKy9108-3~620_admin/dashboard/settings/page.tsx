'use client'

import React, { useEffect, useState } from 'react'
import { Save, Info, Link as LinkIcon, Smartphone, Mail, MapPin, Globe, Loader2, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

type AdConfig = {
    headline: string
    body: string
    cta: string
    href: string
}

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false)

    // Footer State
    const [footerData, setFooterData] = useState({
        email: 'support@icap-prep.com',
        phone: '+1 (555) 000-0000',
        address: '123 CA Plaza, Finance District',
        facebook: 'https://facebook.com/icap',
        twitter: 'https://twitter.com/icap',
        linkedin: 'https://linkedin.com/company/icap',
    })

    // Service toggles
    const [services, setServices] = useState({
        starshare: true,
        trex: true,
        apollo: false,
        analytics: true,
        registration: true,
    })

    const [isSavingAds, setIsSavingAds] = useState(false)
    const [adsEnabled, setAdsEnabled] = useState(true)
    const [welcomeMessageTemplate, setWelcomeMessageTemplate] = useState('Welcome back, {{name}}!')
    const [dashboardAd, setDashboardAd] = useState<AdConfig>({
        headline: 'Level up your CA prep with expert-led notes',
        body: 'Get concise, exam-focused summaries and practice packs tailored for CA students.',
        cta: 'Explore resources',
        href: '#',
    })
    const [resultsAd, setResultsAd] = useState<AdConfig>({
        headline: 'Boost your score with targeted mock reviews',
        body: 'Short, focused revision plans built for CA students?improve accuracy before your next exam.',
        cta: 'See plans',
        href: '#',
    })

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await fetch('/api/admin/system/settings')
                if (!response.ok) return
                const data = await response.json()
                setAdsEnabled(data.adsEnabled !== false)
                if (data.welcomeMessageTemplate) {
                    setWelcomeMessageTemplate(data.welcomeMessageTemplate)
                }
                if (data.adContent?.dashboard) {
                    setDashboardAd(data.adContent.dashboard)
                }
                if (data.adContent?.results) {
                    setResultsAd(data.adContent.results)
                }
            } catch (error) {
                toast.error('Failed to load ad settings')
            }
        }

        loadSettings()
    }, [])

    const handleSaveFooter = async () => {
        setIsSaving(true)
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false)
            toast.success('Footer settings saved successfully')
        }, 1000)
    }


    const handleSaveAds = async () => {
        try {
            setIsSavingAds(true)
            const response = await fetch('/api/admin/system/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adsEnabled,
                    welcomeMessageTemplate,
                    adContent: {
                        dashboard: dashboardAd,
                        results: resultsAd,
                    },
                }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save ad settings')
            }

            toast.success('Ad & welcome settings saved')
        } catch (error: any) {
            toast.error(error.message || 'Failed to save ad settings')
        } finally {
            setIsSavingAds(false)
        }
    }

    const toggleService = (service: keyof typeof services) => {
        setServices(prev => {
            const newState = { ...prev, [service]: !prev[service] }
            toast.info(`${service.charAt(0).toUpperCase() + service.slice(1)} service ${newState[service] ? 'enabled' : 'disabled'}`)
            return newState
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-white">Site Settings</h1>
                <p className="text-gray-400 mt-2">Manage global configurations and toggle platform services.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Footer Manager */}
                <Card className="xl:col-span-2 bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Footer & Contact Information</CardTitle>
                        <CardDescription className="text-gray-500">Update the contact details and social links displayed in the site footer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-gray-400">Support Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-gray-600" size={18} />
                                    <Input
                                        value={footerData.email}
                                        onChange={(e) => setFooterData({ ...footerData, email: e.target.value })}
                                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-400">Phone Number</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-2.5 text-gray-600" size={18} />
                                    <Input
                                        value={footerData.phone}
                                        onChange={(e) => setFooterData({ ...footerData, phone: e.target.value })}
                                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-gray-400">Physical Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-gray-600" size={18} />
                                    <Input
                                        value={footerData.address}
                                        onChange={(e) => setFooterData({ ...footerData, address: e.target.value })}
                                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-800">
                            <h3 className="text-sm font-semibold text-white mb-4">Social Media Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-400">Facebook</Label>
                                    <Input
                                        value={footerData.facebook}
                                        onChange={(e) => setFooterData({ ...footerData, facebook: e.target.value })}
                                        className="bg-gray-800 border-gray-700 text-white text-xs"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-400">Twitter (X)</Label>
                                    <Input
                                        value={footerData.twitter}
                                        onChange={(e) => setFooterData({ ...footerData, twitter: e.target.value })}
                                        className="bg-gray-800 border-gray-700 text-white text-xs"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-400">LinkedIn</Label>
                                    <Input
                                        value={footerData.linkedin}
                                        onChange={(e) => setFooterData({ ...footerData, linkedin: e.target.value })}
                                        className="bg-gray-800 border-gray-700 text-white text-xs"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveFooter}
                            disabled={isSaving}
                            className="bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold gap-2"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                {/* Service Toggles */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Service Management</CardTitle>
                        <CardDescription className="text-gray-500">Toggle individual platform services and modules.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">Starshare Service</span>
                                <span className="text-xs text-gray-500">Manage IPTV connections</span>
                            </div>
                            <Switch checked={services.starshare} onCheckedChange={() => toggleService('starshare')} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">Trex Managed</span>
                                <span className="text-xs text-gray-500">Bulk server operations</span>
                            </div>
                            <Switch checked={services.trex} onCheckedChange={() => toggleService('trex')} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl opacity-50">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">Apollo (Legacy)</span>
                                <span className="text-xs text-gray-500">V1 data endpoint</span>
                            </div>
                            <Switch checked={services.apollo} onCheckedChange={() => toggleService('apollo')} />
                        </div>

                        <div className="pt-4 border-t border-gray-800">
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">Traffic Analytics</span>
                                    <span className="text-xs text-gray-500">Log visitor data</span>
                                </div>
                                <Switch checked={services.analytics} onCheckedChange={() => toggleService('analytics')} />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl mt-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">User Registration</span>
                                    <span className="text-xs text-gray-500">Allow new signups</span>
                                </div>
                                <Switch checked={services.registration} onCheckedChange={() => toggleService('registration')} />
                            </div>
                        </div>

                        <div className="p-4 bg-primary-green/10 rounded-2xl border border-primary-green/20 flex gap-3">
                            <Info className="text-primary-green shrink-0" size={18} />
                            <p className="text-[10px] text-gray-400">
                                Disabling critical services like 'User Registration' will prevent any new students from creating accounts.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Megaphone size={18} /> Ads & Welcome Message
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Control ad visibility and customize the dashboard welcome text.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-400">
                            Use variables in the welcome message: <span className="text-gray-200">{'{{name}}'}</span> or{' '}
                            <span className="text-gray-200">{'{{firstName}}'}</span>.
                        </p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold gap-2">
                                <Megaphone size={16} />
                                Edit Ads & Welcome
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[720px] bg-gray-950 border-gray-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Ads & Welcome Settings</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Control ad visibility and customize the welcome message shown on the dashboard.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-sm font-semibold">Enable Ads</p>
                                        <p className="text-xs text-gray-500">Turn all ads on or off site-wide.</p>
                                    </div>
                                    <Switch checked={adsEnabled} onCheckedChange={setAdsEnabled} />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-400">Welcome Message Template</Label>
                                    <Input
                                        value={welcomeMessageTemplate}
                                        onChange={(e) => setWelcomeMessageTemplate(e.target.value)}
                                        className="bg-gray-900 border-gray-800 text-white"
                                        placeholder="Welcome back, {{name}}!"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Example: <span className="text-gray-200">{'Welcome back, {{firstName}}! Ready to study?'}</span>
                                    </p>
                                </div>

                                <div className="border-t border-gray-800 pt-4">
                                    <h4 className="text-sm font-semibold mb-3">Dashboard Banner Ad</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400">Headline</Label>
                                            <Input
                                                value={dashboardAd.headline}
                                                onChange={(e) => setDashboardAd({ ...dashboardAd, headline: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400">CTA Text</Label>
                                            <Input
                                                value={dashboardAd.cta}
                                                onChange={(e) => setDashboardAd({ ...dashboardAd, cta: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-gray-400">Body</Label>
                                            <Input
                                                value={dashboardAd.body}
                                                onChange={(e) => setDashboardAd({ ...dashboardAd, body: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-gray-400">Link (URL)</Label>
                                            <Input
                                                value={dashboardAd.href}
                                                onChange={(e) => setDashboardAd({ ...dashboardAd, href: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-800 pt-4">
                                    <h4 className="text-sm font-semibold mb-3">Results Page Ad</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400">Headline</Label>
                                            <Input
                                                value={resultsAd.headline}
                                                onChange={(e) => setResultsAd({ ...resultsAd, headline: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400">CTA Text</Label>
                                            <Input
                                                value={resultsAd.cta}
                                                onChange={(e) => setResultsAd({ ...resultsAd, cta: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-gray-400">Body</Label>
                                            <Input
                                                value={resultsAd.body}
                                                onChange={(e) => setResultsAd({ ...resultsAd, body: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-gray-400">Link (URL)</Label>
                                            <Input
                                                value={resultsAd.href}
                                                onChange={(e) => setResultsAd({ ...resultsAd, href: e.target.value })}
                                                className="bg-gray-900 border-gray-800 text-white"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="sm:justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleSaveAds}
                                    disabled={isSavingAds}
                                    className="border-gray-700 text-gray-200"
                                >
                                    {isSavingAds ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    )
}
