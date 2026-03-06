'use client'

import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutDashboard, FileText, Settings, Users, Database, Plus, Flag, PlayCircle, Shield, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
    DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS,
    DEFAULT_HOMEPAGE_THEME_SETTINGS,
    type HomepageHeroMotionSettings,
    type HomepageSectionThemeSettings,
    type HomepageThemeVariant,
} from '@/lib/homepage-theme'
import { type StreakResetTimezone } from '@/lib/streak-settings'

type AmbassadorSubmissionPreview = {
    id: string
    name: string
    email: string
    institute: string | null
    createdAt: string
    status: 'new' | 'reviewed' | 'replied'
}

export default function AdminDashboardPage() {
    const { toast } = useToast()
    const [stats, setStats] = useState([
        { title: 'Total Questions', value: '...', icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Total Subjects', value: '...', icon: LayoutDashboard, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Test Results', value: '...', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Active Users', value: '...', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
    ])
    const [isLoading, setIsLoading] = useState(true)
    const [testSettings, setTestSettings] = useState({
        fullBookTimeMinutes: 120,
        chapterTestDefaultMinutes: 30,
        chapterTestDefaultQuestions: 25,
        registrationDegrees: ['CA'],
        registrationLevels: ['PRC', 'CAF'],
        streakResetTimezone: 'UTC' as StreakResetTimezone,
        homepageThemes: DEFAULT_HOMEPAGE_THEME_SETTINGS as HomepageSectionThemeSettings,
        homepageHeroMotion: DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS as HomepageHeroMotionSettings,
    })
    const [newDegree, setNewDegree] = useState('')
    const [newLevel, setNewLevel] = useState('')
    const [isSavingTestSettings, setIsSavingTestSettings] = useState(false)
    const [recentAmbassadorApplications, setRecentAmbassadorApplications] = useState<AmbassadorSubmissionPreview[]>([])
    const [pendingAmbassadorCount, setPendingAmbassadorCount] = useState(0)
    const [isLoadingAmbassadorApplications, setIsLoadingAmbassadorApplications] = useState(true)

    useEffect(() => {
        fetchStats()
        fetchRecentAmbassadorApplications()
    }, [])

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await fetch('/api/admin/system/settings')
                if (!response.ok) return
                const data = await response.json()
                if (data.testSettings) {
                    setTestSettings({
                        fullBookTimeMinutes: Number(data.testSettings.fullBookTimeMinutes) || 120,
                        chapterTestDefaultMinutes: Number(data.testSettings.chapterTestDefaultMinutes) || 30,
                        chapterTestDefaultQuestions: Number(data.testSettings.chapterTestDefaultQuestions) || 25,
                        registrationDegrees: Array.isArray(data.testSettings.registrationDegrees) && data.testSettings.registrationDegrees.length
                            ? data.testSettings.registrationDegrees
                            : ['CA'],
                        registrationLevels: Array.isArray(data.testSettings.registrationLevels) && data.testSettings.registrationLevels.length
                            ? data.testSettings.registrationLevels
                            : ['PRC', 'CAF'],
                        streakResetTimezone: data.testSettings.streakResetTimezone === 'PKT' ? 'PKT' : 'UTC',
                        homepageThemes: {
                            hero: data.testSettings.homepageThemes?.hero || DEFAULT_HOMEPAGE_THEME_SETTINGS.hero,
                            whyChoose: data.testSettings.homepageThemes?.whyChoose || DEFAULT_HOMEPAGE_THEME_SETTINGS.whyChoose,
                            howItWorks: data.testSettings.homepageThemes?.howItWorks || DEFAULT_HOMEPAGE_THEME_SETTINGS.howItWorks,
                            stats: data.testSettings.homepageThemes?.stats || DEFAULT_HOMEPAGE_THEME_SETTINGS.stats,
                            cta: data.testSettings.homepageThemes?.cta || DEFAULT_HOMEPAGE_THEME_SETTINGS.cta,
                            feedback: data.testSettings.homepageThemes?.feedback || DEFAULT_HOMEPAGE_THEME_SETTINGS.feedback,
                            faq: data.testSettings.homepageThemes?.faq || DEFAULT_HOMEPAGE_THEME_SETTINGS.faq,
                        },
                        homepageHeroMotion: {
                            floatDurationSeconds: Number(data.testSettings.homepageHeroMotion?.floatDurationSeconds) || DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDurationSeconds,
                            floatDistanceDesktopPx: Number(data.testSettings.homepageHeroMotion?.floatDistanceDesktopPx) || DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDistanceDesktopPx,
                            floatDistanceMobilePx: Number(data.testSettings.homepageHeroMotion?.floatDistanceMobilePx) || DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.floatDistanceMobilePx,
                            badgeFloatDurationSeconds: Number(data.testSettings.homepageHeroMotion?.badgeFloatDurationSeconds) || DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.badgeFloatDurationSeconds,
                            badgeFloatDistancePx: Number(data.testSettings.homepageHeroMotion?.badgeFloatDistancePx) || DEFAULT_HOMEPAGE_HERO_MOTION_SETTINGS.badgeFloatDistancePx,
                        },
                    })
                }
            } catch (error) {
                // ignore
            }
        }

        loadSettings()
    }, [])

    const fetchStats = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/stats')
            if (response.ok) {
                const data = await response.json()
                setStats([
                    { title: 'Total Questions', value: data.stats.totalQuestions.toLocaleString(), icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { title: 'Total Subjects', value: data.stats.totalSubjects.toLocaleString(), icon: LayoutDashboard, color: 'text-green-600', bg: 'bg-green-100' },
                    { title: 'Test Results', value: data.stats.totalResults.toLocaleString(), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
                    { title: 'Active Users', value: data.stats.totalUsers.toLocaleString(), icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
                ])
            }
        } catch (error) {
            console.error('Failed to fetch admin stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchRecentAmbassadorApplications = async () => {
        try {
            setIsLoadingAmbassadorApplications(true)
            const response = await fetch('/api/admin/join-us?type=ambassador&limit=5', { cache: 'no-store' })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load ambassador applications')
            }
            setRecentAmbassadorApplications(Array.isArray(data.submissions) ? data.submissions : [])
            setPendingAmbassadorCount(Number(data.newAmbassadorCount || 0))
        } catch (error) {
            console.error('Failed to load ambassador applications:', error)
        } finally {
            setIsLoadingAmbassadorApplications(false)
        }
    }

    const actions = [
        {
            title: 'Manage Questions',
            description: 'View, edit, and bulk delete MCQs from the database.',
            href: '/admin/questions',
            icon: Database,
        },
        {
            title: 'Question Reports',
            description: 'Review and resolve user-reported questions.',
            href: '/admin/reports',
            icon: Flag,
        },
        {
            title: 'Demo Test Settings',
            description: 'Configure demo access, time, and allowed subjects.',
            href: '/admin/demo-settings',
            icon: PlayCircle,
        },
        {
            title: 'Sponsored Settings',
            description: 'Show or hide sponsored content and edit its message.',
            href: '/admin/ads',
            icon: FileText,
        },
        {
            title: 'Bulk Upload',
            description: 'Upload new learning materials via TXT or Direct Input.',
            href: '/admin/upload',
            icon: Plus,
        },
        {
            title: 'Subject Management',
            description: 'Create, update, or remove subjects from the platform.',
            href: '/admin/subjects',
            icon: Settings,
        },
        {
            title: 'Join Us Submissions',
            description: 'Review and reply to Join Us requests.',
            href: '/admin/join-us',
            icon: Users,
        },
        {
            title: 'Mock Notify Requests',
            description: 'See users waiting for mock-test availability notifications.',
            href: '/admin/mock-test-notify-requests',
            icon: Users,
        },
        {
            title: 'FAQ Settings',
            description: 'Manage FAQ questions and answers.',
            href: '/admin/faq',
            icon: Settings,
        },
        {
            title: 'Student Feedback',
            description: 'Moderate homepage feedback (approve/reject/delete).',
            href: '/admin/feedback',
            icon: FileText,
        },
        {
            title: 'Beta Features',
            description: 'Control which features are public or ambassador-only.',
            href: '/admin/beta-features',
            icon: Flag,
        },
        {
            title: 'Security Overview',
            description: 'Check threat status and access platform security tools.',
            href: '/admin/security',
            icon: Shield,
        },
        {
            title: 'IP Security',
            description: 'Review suspicious traffic, block IPs, and manage whitelist.',
            href: '/admin/ip-security',
            icon: Settings,
        },
        {
            title: 'Audit Logs',
            description: 'Track who changed admin settings and user controls.',
            href: '/admin/audit-logs',
            icon: FileText,
        },
        {
            title: 'Streak Audit',
            description: 'Inspect streak increment/reset history for support reviews.',
            href: '/admin/streak-audit',
            icon: Shield,
        },
        {
            title: 'User Management',
            description: 'View, ban, or delete registered users.',
            href: '/admin/users',
            icon: Users,
        },
    ]

    const handleSaveTestSettings = async () => {
        try {
            setIsSavingTestSettings(true)
            const response = await fetch('/api/admin/system/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testSettings: {
                        fullBookTimeMinutes: testSettings.fullBookTimeMinutes,
                        chapterTestDefaultMinutes: testSettings.chapterTestDefaultMinutes,
                        chapterTestDefaultQuestions: testSettings.chapterTestDefaultQuestions,
                        registrationDegrees: testSettings.registrationDegrees,
                        registrationLevels: testSettings.registrationLevels,
                        streakResetTimezone: testSettings.streakResetTimezone,
                        homepageThemes: testSettings.homepageThemes,
                        homepageHeroMotion: testSettings.homepageHeroMotion,
                    },
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save settings')
            }
            toast({
                title: 'Saved',
                description: 'Test settings updated successfully.',
            })
            if (typeof window !== 'undefined') {
                try {
                    const channel = new BroadcastChannel('preptio-system-settings')
                    channel.postMessage({ type: 'homepage-themes-updated', at: Date.now() })
                    channel.close()
                } catch {
                    // ignore
                }
                window.dispatchEvent(new Event('preptio-homepage-themes-updated'))
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save test settings.',
                variant: 'destructive',
            })
        } finally {
            setIsSavingTestSettings(false)
        }
    }

    const updateHomepageTheme = (section: keyof HomepageSectionThemeSettings, variant: HomepageThemeVariant) => {
        setTestSettings((prev) => ({
            ...prev,
            homepageThemes: {
                ...prev.homepageThemes,
                [section]: variant,
            },
        }))
    }

    const updateHomepageHeroMotion = (key: keyof HomepageHeroMotionSettings, value: number) => {
        setTestSettings((prev) => ({
            ...prev,
            homepageHeroMotion: {
                ...prev.homepageHeroMotion,
                [key]: Number.isFinite(value) ? value : prev.homepageHeroMotion[key],
            },
        }))
    }

    const addOption = (type: 'degree' | 'level') => {
        const value = (type === 'degree' ? newDegree : newLevel).trim()
        if (!value) return
        if (type === 'degree') {
            setTestSettings((prev) => ({
                ...prev,
                registrationDegrees: Array.from(new Set([...prev.registrationDegrees, value])),
            }))
            setNewDegree('')
            return
        }
        setTestSettings((prev) => ({
            ...prev,
            registrationLevels: Array.from(new Set([...prev.registrationLevels, value])),
        }))
        setNewLevel('')
    }

    const removeOption = (type: 'degree' | 'level', value: string) => {
        if (type === 'degree') {
            setTestSettings((prev) => ({
                ...prev,
                registrationDegrees: prev.registrationDegrees.filter((item) => item !== value),
            }))
            return
        }
        setTestSettings((prev) => ({
            ...prev,
            registrationLevels: prev.registrationLevels.filter((item) => item !== value),
        }))
    }

    return (
        <main className="min-h-screen bg-background-light">
            <AdminHeader />

            <div className="pt-[72px] lg:pt-[80px] pb-12">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="mb-8">
                        <h1 className="font-heading text-3xl font-bold text-text-dark">Admin Dashboard</h1>
                        <p className="text-text-light">Overview of platform content and activity</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-12">
                        {stats.map((stat, index) => (
                            <Card key={index} className="border-border">
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`rounded-xl p-2.5 md:p-3 ${stat.bg}`}>
                                            <stat.icon size={24} className={stat.color} />
                                        </div>
                                        <div>
                                            <p className="admin-kpi-label text-xs font-medium text-text-light md:text-sm">{stat.title}</p>
                                            <p className="admin-kpi-value text-xl font-bold text-text-dark md:text-2xl">{stat.value}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Test Settings */}
                    <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">Test Settings</h2>
                    <Card className="border-border mb-12">
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Book Time (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="30"
                                        max="300"
                                        value={testSettings.fullBookTimeMinutes}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, fullBookTimeMinutes: Number(e.target.value) || 120 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chapter Test Time (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="5"
                                        max="240"
                                        value={testSettings.chapterTestDefaultMinutes}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, chapterTestDefaultMinutes: Number(e.target.value) || 30 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chapter Test Questions</Label>
                                    <Input
                                        type="number"
                                        min="5"
                                        max="200"
                                        value={testSettings.chapterTestDefaultQuestions}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, chapterTestDefaultQuestions: Number(e.target.value) || 25 }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                                <div className="space-y-3">
                                    <Label>Registration Degrees</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {testSettings.registrationDegrees.map((degree) => (
                                            <span key={degree} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {degree}
                                                <button type="button" onClick={() => removeOption('degree', degree)}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input value={newDegree} placeholder="Add degree" onChange={(e) => setNewDegree(e.target.value)} />
                                        <Button type="button" variant="outline" onClick={() => addOption('degree')} className="w-full sm:w-auto">Add</Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>Registration Levels</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {testSettings.registrationLevels.map((level) => (
                                            <span key={level} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {level}
                                                <button type="button" onClick={() => removeOption('level', level)}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input value={newLevel} placeholder="Add level (e.g. CAF)" onChange={(e) => setNewLevel(e.target.value)} />
                                        <Button type="button" variant="outline" onClick={() => addOption('level')} className="w-full sm:w-auto">Add</Button>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-border pt-4 space-y-2">
                                <Label>Streak Reset Timezone</Label>
                                <Select
                                    value={testSettings.streakResetTimezone}
                                    onValueChange={(value) =>
                                        setTestSettings((prev) => ({
                                            ...prev,
                                            streakResetTimezone: value === 'PKT' ? 'PKT' : 'UTC',
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full md:max-w-sm">
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UTC">UTC (default)</SelectItem>
                                        <SelectItem value="PKT">Pakistan Standard Time (UTC+5)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-light">
                                    This controls streak day boundaries and daily reconciliation logic.
                                </p>
                            </div>
                            <div className="border-t border-border pt-4 space-y-4">
                                <div>
                                    <Label className="text-base font-semibold">Homepage Section Themes</Label>
                                    <p className="text-xs text-text-light mt-1">
                                        Control section background variants: light, gray, or dark.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { key: 'hero', label: 'Hero Section' },
                                        { key: 'whyChoose', label: 'Why Choose' },
                                        { key: 'howItWorks', label: 'How It Works' },
                                        { key: 'stats', label: 'Stats Section' },
                                        { key: 'cta', label: 'CTA Section' },
                                        { key: 'feedback', label: 'Student Feedback' },
                                        { key: 'faq', label: 'FAQ Section' },
                                    ].map((item) => (
                                        <div key={item.key} className="space-y-2">
                                            <Label>{item.label}</Label>
                                            <Select
                                                value={testSettings.homepageThemes[item.key as keyof HomepageSectionThemeSettings]}
                                                onValueChange={(value) =>
                                                    updateHomepageTheme(
                                                        item.key as keyof HomepageSectionThemeSettings,
                                                        value as HomepageThemeVariant
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select theme" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="light">Light</SelectItem>
                                                    <SelectItem value="gray">Grey</SelectItem>
                                                    <SelectItem value="dark">Dark</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 border-t border-border pt-4">
                                    <Label className="text-base font-semibold">Hero Floating Motion</Label>
                                    <p className="text-xs text-text-light mt-1">
                                        Control speed and floating distance of the hero card and badges.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                        <div className="space-y-2">
                                            <Label>Card Float Duration (sec)</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="10"
                                                step="0.1"
                                                value={testSettings.homepageHeroMotion.floatDurationSeconds}
                                                onChange={(e) => updateHomepageHeroMotion('floatDurationSeconds', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Card Float Distance Desktop (px)</Label>
                                            <Input
                                                type="number"
                                                min="4"
                                                max="30"
                                                step="1"
                                                value={testSettings.homepageHeroMotion.floatDistanceDesktopPx}
                                                onChange={(e) => updateHomepageHeroMotion('floatDistanceDesktopPx', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Card Float Distance Mobile (px)</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="20"
                                                step="1"
                                                value={testSettings.homepageHeroMotion.floatDistanceMobilePx}
                                                onChange={(e) => updateHomepageHeroMotion('floatDistanceMobilePx', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Badge Float Duration (sec)</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="8"
                                                step="0.1"
                                                value={testSettings.homepageHeroMotion.badgeFloatDurationSeconds}
                                                onChange={(e) => updateHomepageHeroMotion('badgeFloatDurationSeconds', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Badge Float Distance (px)</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="20"
                                                step="1"
                                                value={testSettings.homepageHeroMotion.badgeFloatDistancePx}
                                                onChange={(e) => updateHomepageHeroMotion('badgeFloatDistancePx', Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleSaveTestSettings} disabled={isSavingTestSettings} className="w-full md:w-auto">
                                {isSavingTestSettings ? 'Saving...' : 'Save Test Settings'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {actions.map((action, index) => (
                            <Link href={action.href} key={index}>
                                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-xl bg-primary-green/10 flex items-center justify-center mb-4 text-primary-green">
                                            <action.icon size={24} />
                                        </div>
                                        <CardTitle className="text-xl">{action.title}</CardTitle>
                                        <CardDescription>{action.description}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <Card className="border-border mt-12">
                        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                            <div>
                                <CardTitle className="text-xl">Recent Ambassador Applications</CardTitle>
                                <CardDescription>
                                    New pending: <span className="font-semibold text-emerald-600">{pendingAmbassadorCount}</span>
                                </CardDescription>
                            </div>
                            <Link href="/admin/join-us">
                                <Button variant="outline">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {isLoadingAmbassadorApplications ? (
                                <p className="text-sm text-text-light">Loading applications...</p>
                            ) : recentAmbassadorApplications.length === 0 ? (
                                <p className="text-sm text-text-light">No ambassador applications yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentAmbassadorApplications.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-border p-3">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-text-dark">{item.name}</p>
                                                    <p className="text-sm text-text-light">{item.email}</p>
                                                    <p className="text-xs text-text-light mt-1">
                                                        {item.institute || 'Institute not provided'} · {new Date(item.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        item.status === 'new'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : item.status === 'reviewed'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-blue-100 text-blue-700'
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

        </main>
    )
}

